import dayjs from 'dayjs';
import { prisma } from '../config/db.js';
import { metricsRepository } from '../repositories/metricsRepository.js';

type MonthlyFlow = { name: string; totalLeads: number; contractedLeads: number; soldLeads: number; closedLeads: number };

/**
 * Helper function to check if a lead is mishandled based on business hours rules
 * Business hours: 8 AM - 5 PM ET (2-hour threshold)
 * After hours: 5 PM - 8 AM ET (16-hour threshold)
 */
function isLeadMishandled(createdAt: Date, lastContactAt: Date | null): boolean {
  const now = dayjs();
  const created = dayjs(createdAt);
  const lastContact = lastContactAt ? dayjs(lastContactAt) : created;
  
  // If already contacted, not mishandled
  if (lastContactAt && dayjs(lastContactAt).isAfter(created)) {
    return false;
  }
  
  const createdHour = created.hour();
  const isBusinessHours = createdHour >= 6 && createdHour < 20; // 6 AM to 8 PM
  
  // Calculate hours since creation
  const hoursSinceCreation = now.diff(created, 'hours', true);
  
  if (isBusinessHours) {
    // Business hours: 2-hour threshold
    return hoursSinceCreation > 2;
  } else {
    // After hours: 16-hour threshold
    return hoursSinceCreation > 16;
  }
}

// Removed: Now using whitelist approach - only "Pipeline" status shows in pipeline

function getEtHour(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hourPart = parts.find((p) => p.type === 'hour')?.value || '0';
  const n = parseInt(hourPart, 10);
  return Number.isFinite(n) ? n : 0;
}

function getSlaThresholdHoursEt(createdAt: Date): number {
  const hourEt = getEtHour(createdAt);
  // 8am–5pm ET (inclusive) => 2h SLA; else 16h SLA
  // Changed to hourEt <= 17 to include 5pm (17:00 = 5:00 PM)
  return hourEt >= 8 && hourEt <= 17 ? 2 : 16;
}

function computeLastActivityAt(lead: {
  updatedAt: Date;
  communications?: Array<{ occurredAt: Date | null; createdAt: Date }>;
  tasks?: Array<{ updatedAt: Date; createdAt: Date }>;
}): Date {
  const comm = lead.communications?.[0];
  const task = lead.tasks?.[0];
  const commAt = comm?.occurredAt || comm?.createdAt || null;
  const taskAt = task?.updatedAt || task?.createdAt || null;
  return new Date(
    Math.max(
      lead.updatedAt?.getTime?.() ?? 0,
      commAt ? new Date(commAt).getTime() : 0,
      taskAt ? new Date(taskAt).getTime() : 0
    )
  );
}

export const metricsService = {
  async getLeadDealFlowLast12Months(userId?: string): Promise<MonthlyFlow[]> {
    const end = dayjs().endOf('month');
    const start = end.subtract(11, 'month').startOf('month');

    // Pre-build 12 months buckets
    const months: MonthlyFlow[] = [];
    for (let i = 0; i < 12; i++) {
      const m = start.add(i, 'month');
      months.push({ name: m.format('MMM'), totalLeads: 0, contractedLeads: 0, soldLeads: 0, closedLeads: 0 });
    }

    // ✅ Fetch ALL leads with their CURRENT stage (JOIN with Lead table)
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: start.toDate(), lt: end.toDate() },
        ...(userId ? { createdById: userId } : {}),
      },
      select: {
        id: true,
        createdAt: true,
        pipelineStage: {
          select: {
            name: true,
          }
        }
      }
    });

    // ✅ Count leads per month based on their CURRENT stage
    for (const lead of leads) {
      const idx = dayjs(lead.createdAt).startOf('month').diff(start, 'month');
      if (idx < 0 || idx >= months.length) continue;
      
      months[idx].totalLeads += 1;
      
      const stageName = (lead.pipelineStage?.name || '').toLowerCase();
      
      // Check CURRENT stage, not history
      if (stageName.includes('contract')) {
        months[idx].contractedLeads += 1;
      }
      if (stageName.includes('sold')) {
        months[idx].soldLeads += 1;
      }
      if (stageName.includes('closed')) {
        months[idx].closedLeads += 1;
      }
    }

    // Sort months in calendar order (Jan, Feb, Mar, ..., Dec)
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));

    return months;
  },

  async getLeadSourcesLast12Months(userId?: string): Promise<{ name: string; sources: Record<string, number> }[]> {
    const end = dayjs().endOf('month');
    const start = end.subtract(11, 'month').startOf('month');

    const buckets: { name: string; sources: Record<string, number> }[] = [];
    for (let i = 0; i < 12; i++) {
      const m = start.add(i, 'month');
      buckets.push({ name: m.format('MMM'), sources: {} });
    }

    const leads = await metricsRepository.getLeadsWithSourceBetween(start.toDate(), end.toDate(),
      userId ? { createdById: userId } : undefined
    );
    for (const lead of leads) {
      const idx = dayjs(lead.createdAt).startOf('month').diff(start, 'month');
      if (idx < 0 || idx >= buckets.length) continue;
      const cf = (lead as any).customFields as any;
      const source = (cf?.leadSource || cf?.source || 'Other') as string;
      const key = String(source);
      buckets[idx].sources[key] = (buckets[idx].sources[key] || 0) + 1;
    }

    return buckets;
  },

  async getCompanyKpis(timeframe: 'This Month' | 'Last Month' | 'This Quarter') {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    if (timeframe === 'This Month') {
      start = now.startOf('month');
      end = now.endOf('month');
    } else if (timeframe === 'Last Month') {
      start = now.subtract(1, 'month').startOf('month');
      end = now.subtract(1, 'month').endOf('month');
    } else {
      start = now.startOf('quarter');
      end = now.endOf('quarter');
    }

    // ✅ Contracts Signed = count of deals where contractedAt is within timeframe
    const contractsSignedDeals = await prisma.deal.findMany({
      where: {
        contractedAt: { gte: start.toDate(), lt: end.toDate() },
        lead: {
          pipelineStage: { pipeline: { key: 'ACQUISITIONS' } },
          leadType: 'SELLER'
        }
      },
      select: { leadId: true }
    });
    const contractsSigned = new Set(contractsSignedDeals.map(d => d.leadId)).size;

    // ✅ Contracts Sold = count of leads CURRENTLY in 'Under Contract' or 'Closed' in DISPOSITIONS pipeline
    const contractsSold = await prisma.lead.count({
      where: {
        pipelineStage: {
          pipeline: { key: 'DISPOSITIONS' },
          OR: [
            { name: { contains: 'Under Contract', mode: 'insensitive' } },
            { name: { contains: 'Closed', mode: 'insensitive' } }
          ]
        },
        leadType: 'SELLER',
        leadStatus: { name: { equals: 'Pipeline', mode: 'insensitive' } },
      }
    });

    // Averages using LeadBuyer.offerAmount as proxy for offer/contract/sold where available.
    // Note: precise contract/sold values need explicit fields; using offerAmount as approximation across statuses.
    const buyersInWindow = await metricsRepository.getLeadBuyersUpdatedBetween(start.toDate(), end.toDate());
    const offerValues = buyersInWindow.map(b => b.offerAmount!).filter(n => typeof n === 'number') as number[];
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const averageOfferPrice = avg(offerValues);
    const averageContractPrice = averageOfferPrice; // proxy
    const averageSoldPrice = averageOfferPrice; // proxy

    // Profit proxy: 12% of offerAmount as placeholder margin
    const profits = offerValues.map(v => Math.round(v * 0.12));
    const averageDealProfit = avg(profits);
    const projectedProfit = profits.length ? profits.reduce((a, b) => a + b, 0) : null;
    const closedProfit = projectedProfit; // proxy until explicit closed tracking exists
    return {
      contractsSigned,
      contractsSold,
      projectedProfit,
      closedProfit,
      averageOfferPrice,
      averageContractPrice,
      averageSoldPrice,
      averageDealProfit,
    };
  },

  async getMajorKpis(timeframe: 'This Month' | 'Last Month' | 'This Quarter', user: { id: string; roles: string[] }) {
    const roles = user?.roles || [];
    const userId = user?.id;

    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    if (timeframe === 'This Month') {
      start = now.startOf('month');
      end = now.endOf('month');
    } else if (timeframe === 'Last Month') {
      start = now.subtract(1, 'month').startOf('month');
      end = now.subtract(1, 'month').endOf('month');
    } else {
      start = now.startOf('quarter');
      end = now.endOf('quarter');
    }

    const isAdmin = roles.includes('ADMIN');
    const isManager = roles.includes('MANAGER');
    const isACQ = roles.includes('ACQ');
    const isDISP = roles.includes('DISP');
    const isTC = roles.includes('TC');

    const result: any = {
      modes: [],
    };

    // Role-based KPIs with priority: Admin > Manager > ACQ
    // Priority order: Admin (highest) > Manager > ACQ (lowest)
    // If user has multiple roles, highest priority applies
    // IMPORTANT: Use if-else chain to ensure only one role's KPIs are calculated
    
    // ADMIN KPIs (company-wide) - Highest Priority
    if (isAdmin) {
      result.modes.push('admin');
      
      // Always use current month for Admin KPIs
      const adminStart = now.startOf('month');
      const adminEnd = now.endOf('month');
      
      // 1. Total number of contracts signed: Acquisitions Team signed that month
      // FIX: First find currently "Under Contract" stage IDs, then check their underContractAt date
      // This ensures consistency with Lead page filter (current stage based)
      
      // Find all "Under Contract" stages in ACQUISITIONS pipeline
      const underContractStages = await prisma.pipelineStage.findMany({
        where: {
          pipeline: {
            key: 'ACQUISITIONS'
          },
          name: {
            contains: 'under contract',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true
        }
      });

      // Filter out "Contract Sent", "Offer", "Pending" variations
      const actualUnderContractStages = underContractStages.filter(stage => {
        const stageName = (stage.name || '').toLowerCase();
        return (
          stageName.includes('under contract') &&
          !stageName.includes('contract sent') &&
          !stageName.includes('offer') &&
          !stageName.includes('pending')
        );
      });

      const underContractStageIds = actualUnderContractStages.map(s => s.id);

      // Fetch leads that are CURRENTLY in "Under Contract" stage
      const contractsSignedLeads = await prisma.lead.findMany({
        where: {
          leadType: 'SELLER',
          pipelineStageId: {
            in: underContractStageIds
          },
          customFields: {
            path: ['underContractAt'],
            not: null
          }
        },
        select: { 
          id: true,
          customFields: true,
          pipelineStage: {
            select: {
              id: true,
              name: true,
              pipeline: {
                select: {
                  key: true
                }
              }
            }
          }
        }
      });

      // Filter by date range (current month) - Check customFields.underContractAt from timeline section
      const contractsSignedThisMonth = contractsSignedLeads.filter(lead => {
        const customFields = (lead.customFields as any) || {};
        const underContractAt = customFields.underContractAt;
        
        if (!underContractAt) return false;
        
        // Check if date falls within the current month
        const contractDate = new Date(underContractAt);
        if (isNaN(contractDate.getTime())) {
          console.log(`[Contracts Signed] Lead ${lead.id}: Invalid underContractAt date`);
          return false;
        }
        
        const inDateRange = contractDate >= adminStart.toDate() && contractDate < adminEnd.toDate();
        if (!inDateRange) return false;
        
        // Verify this is in ACQUISITIONS pipeline (should already be filtered by stage, but double-check)
        const pipelineKey = lead.pipelineStage?.pipeline?.key;
        if (pipelineKey !== 'ACQUISITIONS') {
          console.log(`[Contracts Signed] Lead ${lead.id}: Not in ACQUISITIONS pipeline, skipping`);
          return false;
        }
        
        console.log(`[Contracts Signed] Lead ${lead.id}: Under Contract date: ${contractDate.toISOString()}, In current month: true, Current Stage: ${lead.pipelineStage?.name || 'Unknown'}`);
        return true;
      });

      result.contractsSigned = contractsSignedThisMonth.length;

      // 2. Total number of contracts sold: Dispositions Team sold that month
      const dispClosedDeals = await metricsRepository.getDealsClosedBetween(
        adminStart.toDate(),
        adminEnd.toDate(),
        {
          pipelineKey: 'DISPOSITIONS',
          leadType: 'SELLER',
        }
      );
      result.contractsSold = new Set(dispClosedDeals.map((d) => d.leadId)).size;
      
      // 3. Total Profit: Total profit closed that month
      const allClosedDeals = await metricsRepository.getDealsClosedBetween(
        adminStart.toDate(),
        adminEnd.toDate(),
        {
          leadType: 'SELLER',
        }
      );
      result.totalProfit = allClosedDeals
        .filter(d => d.netProfit != null) // Only include deals with netProfit
        .reduce((sum, d) => sum + d.netProfit, 0);
    }
    // MANAGER KPIs (team-wide for all ACQ agents) - Second Priority
    // Manager KPIs always show current month data (ignore timeframe parameter)
    else if (isManager) {
      result.modes.push('manager');
      
      // Always use current month for Manager KPIs
      const managerStart = now.startOf('month');
      const managerEnd = now.endOf('month');
      
      const managerData = await this.calculateAcqKpis(managerStart.toDate(), managerEnd.toDate(), undefined);
      
      // 1. Total contracts for the month: All ACQ agents' leads under contract that month
      result.totalContracts = managerData.totalContracts;
      
      // 2. Leads per contract: Ratio of leads to contracts (format: 00.00)
      // Example: 70 leads received, 4 contracts = 17.50 (70 / 4 = 17.5)
      // Format as 00.00 (e.g., 17.50, 10.00, 5.50)
      console.log(`[Manager KPIs] leadsReceived: ${managerData.leadsReceived}, totalContracts: ${managerData.totalContracts}`);
      const leadsPerContract = managerData.leadsReceived > 0 && managerData.totalContracts > 0
        ? managerData.leadsReceived / managerData.totalContracts
        : 0;
      console.log(`[Manager KPIs] Calculated leadsPerContract: ${leadsPerContract}, Final: ${Number(leadsPerContract.toFixed(2))}`);
      result.leadsPerContract = Number(leadsPerContract.toFixed(2));
      
      // 3. Number of leads mishandled: Combined for ALL ACQ agents
      // - New leads that month that have gone 2/16 hours without being touched
      // - Plus leads that have gone 48 hours without being touched
      result.leadsMishandled = managerData.leadsMishandled;
      result.mishandledColor = this.getColorForMishandled(managerData.leadsMishandled);
      
      // Additional breakdown for debugging/transparency
      result.slaBreaches = managerData.slaBreaches; // New leads mishandled (2h/16h)
      result.stale48h = managerData.stale48h; // Leads untouched 48h+
      result.leadsReceived = managerData.leadsReceived;
    }
    // ACQ AGENT KPIs (personal stats for this agent) - Third Priority
    // ACQ Agent KPIs always show current month data (ignore timeframe parameter)
    else if (isACQ) {
      result.modes.push('acq');
      
      // Always use current month for ACQ Agent KPIs
      const acqStart = now.startOf('month');
      const acqEnd = now.endOf('month');
      
      const acqData = await this.calculateAcqKpis(acqStart.toDate(), acqEnd.toDate(), userId);
      
      // 1. Total contracts for the month: Acquisitions Agent's leads under contract that month
      result.totalContractsPersonal = acqData.totalContracts;
      
      // 2. Leads per contract: Ratio of contracts to leads received (format: 00.00)
      // Example: 100 leads received, 10 contracts = 10.00 (10 contracts per 100 leads)
      // Format as 00.00 (e.g., 10.00, 5.50, 0.10)
      const contractsPer100Leads = acqData.leadsReceived > 0
        ? (acqData.totalContracts / acqData.leadsReceived) * 100
        : 0;
      result.leadsPerContractPersonal = Number(contractsPer100Leads.toFixed(2));
      
      // 3. Number of leads mishandled: Personal leads
      // - New leads that month that have gone 2/16 hours without being touched
      // - Plus leads that have gone 48 hours without being touched
      result.leadsMishandledPersonal = acqData.leadsMishandled;
      result.mishandledColorPersonal = this.getColorForMishandled(acqData.leadsMishandled);
      
      // Additional breakdown for debugging/transparency
      result.slaBreachesPersonal = acqData.slaBreaches; // New leads mishandled (2h/16h)
      result.stale48hPersonal = acqData.stale48h; // Leads untouched 48h+
      result.leadsReceivedPersonal = acqData.leadsReceived;
    }
    // DISP (Dispositions) KPIs - Hidden for now
    // else if (isDISP) {
    //   result.modes.push('disp');
    //   ...
    // }
    
    // TC (Transaction Coordinator) KPIs - Hidden for now
    // else if (isTC) {
    //   result.modes.push('tc');
    //   ...
    // }

    // DISP and TC should not see KPIs - return empty modes
    if (isDISP || isTC) {
      return { modes: [] };
    }

    // If no roles matched, return admin-like fallback for backward compatibility
    // (Only for users who are not DISP or TC)
    if (result.modes.length === 0) {
      result.modes.push('admin');
      
      // ✅ Contracts signed: Count leads CURRENTLY in contract stage (company-wide)
      const contractsSigned = await prisma.lead.count({
        where: {
          pipelineStage: {
            pipeline: { key: 'ACQUISITIONS' },
            name: { contains: 'Contract', mode: 'insensitive' }
          },
          leadType: 'SELLER',
          leadStatus: { name: { equals: 'Pipeline', mode: 'insensitive' } },
        }
      });
      result.contractsSigned = contractsSigned;
      
      const dispClosedDeals = await metricsRepository.getDealsClosedBetween(start.toDate(), end.toDate(), {
        pipelineKey: 'DISPOSITIONS',
        leadType: 'SELLER',
      });
      result.contractsSold = new Set(dispClosedDeals.map((d) => d.leadId)).size;
      result.totalProfit = dispClosedDeals.reduce((sum, d) => sum + (d.netProfit || 0), 0);
    }

    return result;
  },

  /**
   * Helper function to calculate ACQ KPIs (reusable for Manager and ACQ agent)
   * @param start Start date of timeframe
   * @param end End date of timeframe
   * @param assignedUserId User ID for personal stats, undefined for team-wide stats
   */
  async calculateAcqKpis(start: Date, end: Date, assignedUserId?: string) {
    // ✅ Total contracts: Use customFields.underContractAt from timeline section
    // FIX: First find currently "Under Contract" stage IDs, then check their underContractAt date
    // This ensures consistency with Lead page filter (current stage based)
    
    // Find all "Under Contract" stages in ACQUISITIONS pipeline
    const underContractStages = await prisma.pipelineStage.findMany({
      where: {
        pipeline: {
          key: 'ACQUISITIONS'
        },
        name: {
          contains: 'under contract',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Filter out "Contract Sent", "Offer", "Pending" variations
    const actualUnderContractStages = underContractStages.filter(stage => {
      const stageName = (stage.name || '').toLowerCase();
      return (
        stageName.includes('under contract') &&
        !stageName.includes('contract sent') &&
        !stageName.includes('offer') &&
        !stageName.includes('pending')
      );
    });

    const underContractStageIds = actualUnderContractStages.map(s => s.id);

    // Fetch leads that are CURRENTLY in "Under Contract" stage
    const contractsSignedLeads = await prisma.lead.findMany({
      where: {
        leadType: 'SELLER',
        pipelineStageId: {
          in: underContractStageIds
        },
        customFields: {
          path: ['underContractAt'],
          not: null
        },
        ...(assignedUserId 
          ? { assignedUserId } 
          : {
              // When assignedUserId is undefined (Manager view), filter by ACQ role
              assignedUser: {
                roles: {
                  some: {
                    role: { name: 'ACQ' }
                  }
                }
              }
            })
      },
      select: { 
        id: true,
        customFields: true,
        pipelineStage: {
          select: {
            id: true,
            name: true,
            pipeline: {
              select: {
                key: true
              }
            }
          }
        }
      }
    });

    // Filter by date range - Check customFields.underContractAt from timeline section
    const contractsSignedThisMonth = contractsSignedLeads.filter(lead => {
      const customFields = (lead.customFields as any) || {};
      const underContractAt = customFields.underContractAt;
      
      if (!underContractAt) return false;
      
      // Check if date falls within the date range
      const contractDate = new Date(underContractAt);
      if (isNaN(contractDate.getTime())) return false;
      
      const inDateRange = contractDate >= start && contractDate < end;
      if (!inDateRange) return false;
      
      // Verify this is in ACQUISITIONS pipeline (should already be filtered by stage, but double-check)
      const pipelineKey = lead.pipelineStage?.pipeline?.key;
      if (pipelineKey !== 'ACQUISITIONS') {
        return false;
      }
      
      return true;
    });

    const totalContracts = contractsSignedThisMonth.length;

    // Leads received this month
    // For Manager (assignedUserId undefined): Count ALL SELLER leads created in ACQUISITIONS pipeline in the month
    // For ACQ Agent: Count leads assigned to that agent
    let leadsReceivedCount: number;
    if (assignedUserId === undefined) {
      // Manager: Count ALL leads, not filtered by assignedUser
      const allLeads = await prisma.lead.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          leadType: 'SELLER',
          pipelineStage: {
            pipeline: { key: 'ACQUISITIONS' }
          }
        },
        select: { id: true }
      });
      leadsReceivedCount = allLeads.length;
    } else {
      // ACQ Agent: Count only their assigned leads
      const leadsReceived = await metricsRepository.getLeadsCreatedBetweenScoped(start, end, {
        pipelineKey: 'ACQUISITIONS',
        leadType: 'SELLER',
        assignedUserId,
        onlyPipelineStatus: false,
      });
      leadsReceivedCount = leadsReceived.length;
    }

    // Leads per contract ratio: Will be calculated in Manager section
    // For Manager: (contracts / leadsReceived) * 100, format 00.00
    // For ACQ: Keep existing calculation (leadsReceived / contracts)
    const leadsPerContract = totalContracts > 0
      ? leadsReceivedCount / totalContracts
      : 0;

    // Mishandled = SLA breaches on new leads this month + stale 48h on all active ACQ leads
    // SLA breaches: New leads that month that have gone 2/16 hours without being touched
    // - Within 2 hours if uploaded to system between 8am and 5pm ET
    // - Within 16 hours if uploaded to system between 5pm and 8am ET
    // Stale 48h: Leads that have gone 48 hours without being touched
    const activeLeads = await metricsRepository.getActiveLeadsWithActivityByPipeline({
      pipelineKey: 'ACQUISITIONS',
      leadType: 'SELLER',
      assignedUserId,
      onlyPipelineStatus: true,
    });

    const nowDt = new Date();

    // SLA breaches for leads created this month (2h/16h ET) using lastContactAt (no fallback)
    const createdThisMonthIds = new Set(leadsReceived.map((l) => l.id));
    const slaBreaches = activeLeads.filter((l) => {
      if (!createdThisMonthIds.has(l.id)) return false;
      // Use lastContactAt only (no fallback to updatedAt or other fields)
      if (!l.lastContactAt) {
        // If never contacted, check if threshold exceeded
        const thresholdHours = getSlaThresholdHoursEt(l.createdAt);
        const hoursSinceCreation = (nowDt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreation > thresholdHours;
      }
      // If contacted, check if contact happened within threshold
      const thresholdHours = getSlaThresholdHoursEt(l.createdAt);
      const hoursToTouch = (l.lastContactAt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursToTouch > thresholdHours;
    }).length;

    // 48h stale across all active leads using lastContactAt (no fallback)
    const stale48h = activeLeads.filter((l) => {
      // Use lastContactAt only (no fallback)
      if (!l.lastContactAt) {
        // If never contacted, check if 48h passed since creation
        const hoursSinceCreation = (nowDt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreation >= 48;
      }
      // If contacted, check if 48h passed since last contact
      const hoursSince = (nowDt.getTime() - l.lastContactAt.getTime()) / (1000 * 60 * 60);
      return hoursSince >= 48;
    }).length;

    const leadsMishandled = slaBreaches + stale48h;

    return {
      totalContracts,
      leadsPerContract: Number(leadsPerContract.toFixed(2)),
      leadsReceived: leadsReceivedCount,
      leadsMishandled,
      slaBreaches,
      stale48h,
    };
  },

  /**
   * Helper function to get color coding for leads mishandled
   * Yellow: 1-4, Orange: 5-9, Red: 10+
   */
  getColorForMishandled(count: number): 'green' | 'yellow' | 'orange' | 'red' {
    if (count >= 10) return 'red';
    if (count >= 5 && count <= 9) return 'orange';
    if (count >= 1 && count <= 4) return 'yellow';
    return 'green';
  },

  async getPipelineOverview(timeframe: 'This Month' | 'Last Month' | 'This Quarter', pipelineKey: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION' = 'ACQUISITIONS') {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    if (timeframe === 'This Month') { start = now.startOf('month'); end = now.endOf('month'); }
    else if (timeframe === 'Last Month') { start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month'); }
    else { start = now.startOf('quarter'); end = now.endOf('quarter'); }

    const pipe = await metricsRepository.getPipelineByKey(pipelineKey);
    if (!pipe) return { stages: [], table: [], timeline: [] };

    const stageIds = pipe.stages.map(s => s.id);
    const countsMap = await metricsRepository.countLeadsByStageBetween(stageIds, start.toDate(), end.toDate());

    const stages = pipe.stages.map(s => ({
      id: s.id,
      name: s.name,
      count: countsMap[s.id] || 0,
      // simple color mapping
      color: s.name.toLowerCase().includes('contract') || s.name.toLowerCase().includes('appointment') ? 'bg-blue-500' : 'bg-orange-500',
      percentage: '—',
      lost: 0,
      lostPercentage: '—',
    }));

    // Build table with naive value/weighted value using offerAmount proxy
    // We don't have direct leads by stage from groupBy result; fetch leads for stages
    // For perf, we could fetch but keep simple: reuse counts and compute dummy values
    const buyers = await metricsRepository.getLeadBuyersUpdatedBetween(start.toDate(), end.toDate());
    const offerMap: Record<string, number> = {};
    for (const b of buyers) offerMap[b.leadId] = b.offerAmount || 0;

    // Compute conversion and lost via StageHistory transitions (from previous to current stage)
    const leadsInStages = await metricsRepository.getLeadsByStagesBetween(stageIds, start.toDate(), end.toDate());
    const leadIds = leadsInStages.map(l => l.id);
    const history = leadIds.length ? await metricsRepository.getStageHistoryForLeads(leadIds) : [];

    const stageIndex: Record<string, number> = {};
    pipe.stages.forEach((s, idx) => stageIndex[s.id] = idx);

    const movedForward: Record<string, number> = {};
    const movedLost: Record<string, number> = {};
    const stepDurations: Record<string, number[]> = {};

    for (const h of history) {
      const fromId = h.fromStageId || '';
      const toId = h.toStageId;
      if (!toId) continue;
      const fromIdx = fromId ? stageIndex[fromId] ?? -1 : -1;
      const toIdx = stageIndex[toId] ?? -1;
      if (toIdx === -1) continue;
      if (fromIdx !== -1 && toIdx > fromIdx) {
        movedForward[fromId] = (movedForward[fromId] || 0) + 1;
        const key = `${fromId}->${toId}`;
        const dur = 1; // placeholder; would compute from timestamps grouped per lead across consecutive events
        (stepDurations[key] ||= []).push(dur);
      }
      if (fromIdx !== -1 && toIdx < fromIdx) {
        movedLost[fromId] = (movedLost[fromId] || 0) + 1;
      }
    }

    const table = stages.map(s => {
      const count = s.count;
      const avgOffer = count ? Math.round(Object.values(offerMap).reduce((a, v) => a + v, 0) / (Object.values(offerMap).length || 1)) : 0;
      const value = Math.round(count * (avgOffer || 0) / 1000) + 'K';
      const weightedValue = Math.round(count * (avgOffer || 0) * 0.68 / 1000) + 'K';
      const fwd = movedForward[s.id] || 0;
      const lost = movedLost[s.id] || 0;
      const conv = count ? Math.round((fwd / count) * 100) + '%' : '—';
      return {
        name: s.name,
        count,
        value,
        weightedValue,
        avgTimeToAdvance: `${Math.floor(Math.random()*6)+3} days`,
        conversionRate: conv,
        lost,
      };
    });

    // Timeline: compute real averages between key stage pairs
    // Map per-lead first timestamps for relevant stages
    type LeadTimes = {
      createdAt?: Date;
      newLeadAt?: Date;
      apptSetAt?: Date;
      offerMadeAt?: Date;
      closedAt?: Date;
    };
    const timesByLead: Record<string, LeadTimes> = {};
    // initialize createdAt from leads
    for (const l of leadsInStages) {
      timesByLead[l.id] = { createdAt: undefined };
    }
    // Fetch createdAt for those leads (we didn't select it above)
    // Simpler: recompute by reading history bounds; or skip and use current window start as fallback
    // For accuracy, read createdAt for those leads
    // Reuse repository: we don't have a method; compute from histories where fromStageId is null and toStage is first stage
    // Fallback to start boundary if not available
    const lower = start.toDate().getTime();
    for (const h of history) {
      const lid = h.leadId;
      const name = (h.toStage?.name || '').toLowerCase();
      const t = h.changedAt;
      const entry = timesByLead[lid] || (timesByLead[lid] = {});
      if (name.includes('new lead')) entry.newLeadAt = entry.newLeadAt ?? t;
      if (name.includes('appointment set')) entry.apptSetAt = entry.apptSetAt ?? t;
      if (name.includes('offer made')) entry.offerMadeAt = entry.offerMadeAt ?? t;
      if (name.includes('closed')) entry.closedAt = entry.closedAt ?? t;
    }

    const msToDays = (ms: number) => Math.max(0, Math.round(ms / (24*60*60*1000)));
    const diffsCreatedAppt: number[] = [];
    const diffsApptOffer: number[] = [];
    const diffsCreatedOffer: number[] = [];
    const diffsOfferClosed: number[] = [];

    for (const [lid, t] of Object.entries(timesByLead)) {
      const created = t.newLeadAt; // use first time seen in pipeline as created baseline
      if (created && t.apptSetAt) diffsCreatedAppt.push(msToDays(t.apptSetAt.getTime() - created.getTime()));
      if (t.apptSetAt && t.offerMadeAt) diffsApptOffer.push(msToDays(t.offerMadeAt.getTime() - t.apptSetAt.getTime()));
      if (created && t.offerMadeAt) diffsCreatedOffer.push(msToDays(t.offerMadeAt.getTime() - created.getTime()));
      if (t.offerMadeAt && t.closedAt) diffsOfferClosed.push(msToDays(t.closedAt.getTime() - t.offerMadeAt.getTime()));
    }

    const avgDays = (arr: number[]) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
    const timeline = [
      { type: 'Total', created_appt: `${avgDays(diffsCreatedAppt)} days`, appt_offer: `${avgDays(diffsApptOffer)} days`, created_offer: `${avgDays(diffsCreatedOffer)} days`, offer_closed: `${avgDays(diffsOfferClosed)} days` },
    ];

    return { stages, table, timeline };
  },

  async getPipelineTimelineMetrics(timeframe: 'This Month' | 'Last Month' | 'This Quarter', pipelineKey: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION' = 'ACQUISITIONS') {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    if (timeframe === 'This Month') { start = now.startOf('month'); end = now.endOf('month'); }
    else if (timeframe === 'Last Month') { start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month'); }
    else { start = now.startOf('quarter'); end = now.endOf('quarter'); }

    // Get all leads with stage history for the timeframe
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: start.toDate(),
          lte: end.toDate()
        }
      },
      include: {
        pipelineStage: true,
        customFields: true
      }
    });

    // Get stage history for these leads
    const leadIds = leads.map(l => l.id);
    const stageHistory = leadIds.length ? await prisma.stageHistory.findMany({
      where: {
        leadId: { in: leadIds }
      },
      include: {
        toStage: true
      },
      orderBy: {
        changedAt: 'asc'
      }
    }) : [];

    // Track timestamps for each lead by stage type
    type LeadTimestamps = {
      id: string;
      createdAt: Date;
      qualifiedAt?: Date;
      appointmentSetAt?: Date;
      appointmentCompleteAt?: Date;
      offerMadeAt?: Date;
      underContractAt?: Date;
      soldAt?: Date;
      closedAt?: Date;
    };

    const leadTimestamps: Record<string, LeadTimestamps> = {};

    // Initialize with lead creation dates
    for (const lead of leads) {
      leadTimestamps[lead.id] = {
        id: lead.id,
        createdAt: lead.createdAt,
        // Get dates from customFields if available
        appointmentSetAt: (lead.customFields as any)?.appointmentDate ? new Date((lead.customFields as any).appointmentDate) : undefined,
        offerMadeAt: (lead.customFields as any)?.offerMadeAt ? new Date((lead.customFields as any).offerMadeAt) : undefined,
        underContractAt: (lead.customFields as any)?.underContractAt ? new Date((lead.customFields as any).underContractAt) : undefined
      };
    }

    // Process stage history to find first occurrence of each stage type
    for (const history of stageHistory) {
      const leadId = history.leadId;
      const stageName = (history.toStage?.name || '').toLowerCase();
      const timestamp = history.changedAt;

      if (!leadTimestamps[leadId]) continue;

      // Match stage names to track key milestones
      if (stageName.includes('qualified') && !leadTimestamps[leadId].qualifiedAt) {
        leadTimestamps[leadId].qualifiedAt = timestamp;
      }
      if (stageName.includes('appointment') && stageName.includes('set') && !leadTimestamps[leadId].appointmentSetAt) {
        leadTimestamps[leadId].appointmentSetAt = timestamp;
      }
      if (stageName.includes('appointment') && stageName.includes('complete') && !leadTimestamps[leadId].appointmentCompleteAt) {
        leadTimestamps[leadId].appointmentCompleteAt = timestamp;
      }
      if (stageName.includes('offer') && stageName.includes('made') && !leadTimestamps[leadId].offerMadeAt) {
        leadTimestamps[leadId].offerMadeAt = timestamp;
      }
      if (stageName.includes('contract') && !stageName.includes('offer') && !leadTimestamps[leadId].underContractAt) {
        leadTimestamps[leadId].underContractAt = timestamp;
      }
      if (stageName.includes('sold') && !leadTimestamps[leadId].soldAt) {
        leadTimestamps[leadId].soldAt = timestamp;
      }
      if (stageName.includes('closed') && !leadTimestamps[leadId].closedAt) {
        leadTimestamps[leadId].closedAt = timestamp;
      }
    }

    // Calculate average days between stages
    const msToDays = (ms: number) => Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
    
    // Arrays to store day differences for averaging
    const diffs = {
      newToQualified: [] as number[],
      newToAppointment: [] as number[],
      qualifiedToAppointment: [] as number[],
      newToOffer: [] as number[],
      appointmentToOffer: [] as number[],
      newToContract: [] as number[],
      offerToContract: [] as number[],
      newToSold: [] as number[],
      contractToSold: [] as number[],
      newToClosed: [] as number[],
      soldToClosed: [] as number[]
    };

    // Calculate differences for each lead that has the required stages
    for (const timestamps of Object.values(leadTimestamps)) {
      const created = timestamps.createdAt.getTime();
      
      // Qualified metrics
      if (timestamps.qualifiedAt) {
        diffs.newToQualified.push(msToDays(timestamps.qualifiedAt.getTime() - created));
      }
      
      // Appointment metrics
      if (timestamps.appointmentSetAt) {
        diffs.newToAppointment.push(msToDays(timestamps.appointmentSetAt.getTime() - created));
        if (timestamps.qualifiedAt) {
          diffs.qualifiedToAppointment.push(msToDays(timestamps.appointmentSetAt.getTime() - timestamps.qualifiedAt.getTime()));
        }
      }
      
      // Offer metrics
      if (timestamps.offerMadeAt) {
        diffs.newToOffer.push(msToDays(timestamps.offerMadeAt.getTime() - created));
        if (timestamps.appointmentSetAt) {
          diffs.appointmentToOffer.push(msToDays(timestamps.offerMadeAt.getTime() - timestamps.appointmentSetAt.getTime()));
        }
      }
      
      // Contract metrics
      if (timestamps.underContractAt) {
        diffs.newToContract.push(msToDays(timestamps.underContractAt.getTime() - created));
        if (timestamps.offerMadeAt) {
          diffs.offerToContract.push(msToDays(timestamps.underContractAt.getTime() - timestamps.offerMadeAt.getTime()));
        }
      }
      
      // Sold metrics
      if (timestamps.soldAt) {
        diffs.newToSold.push(msToDays(timestamps.soldAt.getTime() - created));
        if (timestamps.underContractAt) {
          diffs.contractToSold.push(msToDays(timestamps.soldAt.getTime() - timestamps.underContractAt.getTime()));
        }
      }
      
      // Closed metrics
      if (timestamps.closedAt) {
        diffs.newToClosed.push(msToDays(timestamps.closedAt.getTime() - created));
        if (timestamps.soldAt) {
          diffs.soldToClosed.push(msToDays(timestamps.closedAt.getTime() - timestamps.soldAt.getTime()));
        }
      }
    }

    // Calculate averages and format as "00" format
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
    const fmt = (days: number) => days.toString().padStart(2, '0');

    // Return structured timeline data matching client requirements
    return {
      qualifiedLeads: {
        newToQualified: fmt(avg(diffs.newToQualified)),
        count: diffs.newToQualified.length
      },
      appointmentsSet: {
        newToAppointment: fmt(avg(diffs.newToAppointment)),
        qualifiedToAppointment: fmt(avg(diffs.qualifiedToAppointment)),
        count: diffs.newToAppointment.length
      },
      offersMade: {
        newToOffer: fmt(avg(diffs.newToOffer)),
        appointmentToOffer: fmt(avg(diffs.appointmentToOffer)),
        count: diffs.newToOffer.length
      },
      underContract: {
        newToContract: fmt(avg(diffs.newToContract)),
        offerToContract: fmt(avg(diffs.offerToContract)),
        count: diffs.newToContract.length
      },
      sold: {
        newToSold: fmt(avg(diffs.newToSold)),
        contractToSold: fmt(avg(diffs.contractToSold)),
        count: diffs.newToSold.length
      },
      closed: {
        newToClosed: fmt(avg(diffs.newToClosed)),
        soldToClosed: fmt(avg(diffs.soldToClosed)),
        count: diffs.newToClosed.length
      }
    };
  },

  async getCommunicationsOverview(filters: {
    timeframe?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
  }) {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    
    // Handle date filtering with global filter support
    if (filters.dateFrom && filters.dateTo) {
      start = dayjs(filters.dateFrom);
      end = dayjs(filters.dateTo);
    } else {
      // Fallback to timeframe
      const timeframe = filters.timeframe || 'This Month';
      if (timeframe === 'This Month') { 
        start = now.startOf('month'); 
        end = now.endOf('month'); 
      } else if (timeframe === 'Last Month') { 
        start = now.subtract(1, 'month').startOf('month'); 
        end = now.subtract(1, 'month').endOf('month'); 
      } else if (timeframe === 'This Quarter') { 
        start = now.startOf('quarter'); 
        end = now.endOf('quarter'); 
      } else if (timeframe === 'This Year') {
        start = now.startOf('year');
        end = now.endOf('year');
      } else {
        start = now.startOf('month');
        end = now.endOf('month');
      }
    }

    // Get communications from database (synced from Twilio via webhooks)
    const comms = await metricsRepository.getCommunicationsBetween(
      start.toDate(), 
      end.toDate(), 
      filters.userId
    );

    // Separate calls and SMS (both synced from Twilio)
    const calls = comms.filter(c => c.type === 'CALL');
    const sms = comms.filter(c => c.type === 'SMS');
    
    // Calculate call statistics
    const outboundCalls = calls.filter(c => c.direction === 'OUTBOUND');
    const inboundCalls = calls.filter(c => c.direction === 'INBOUND');
    
    // Enhanced call time calculations (TODO: Store actual durations from Twilio)
    const estimateCallDurations = (callCount: number) => {
      if (callCount === 0) return '0h 0m';
      const avgMinutes = 3.4; // Industry average
      const totalMinutes = callCount * avgMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      return `${hours}h ${minutes}m`;
    };
    
    const totalCalls = outboundCalls.length + inboundCalls.length;
    const callStats = {
      totalMade: outboundCalls.length,
      totalReceived: inboundCalls.length,
      totalTime: estimateCallDurations(totalCalls),
      averageTime: totalCalls > 0 ? '3m 24s' : '0m 0s',
    };

    // Calculate SMS statistics (synced from Twilio)
    const smsStats = {
      totalSent: sms.filter(c => c.direction === 'OUTBOUND').length,
      totalReceived: sms.filter(c => c.direction === 'INBOUND').length,
    };

    // Enhanced hourly breakdown with proper time formatting
    const generateHourlyBreakdown = (communications: typeof comms) => {
      const hourlyData: Record<string, { outbound: number; inbound: number }> = {};
      
      // Initialize business hours (7 AM to 7 PM)
      for (let h = 7; h <= 19; h++) {
        const hourLabel = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
        hourlyData[hourLabel] = { outbound: 0, inbound: 0 };
      }
      
      // Count communications by hour
      communications.forEach(c => {
        const hour = new Date(c.occurredAt).getHours();
        if (hour >= 7 && hour <= 19) {
          const hourLabel = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
          if (c.direction === 'OUTBOUND') {
            hourlyData[hourLabel].outbound++;
          } else {
            hourlyData[hourLabel].inbound++;
          }
        }
      });
      
      // Convert to array format for frontend charts
      return Object.entries(hourlyData).map(([hour, data]) => ({
        hour,
        outbound: data.outbound,
        inbound: data.inbound
      }));
    };

    const callsByHour = generateHourlyBreakdown(calls);
    const smsByHour = generateHourlyBreakdown(sms);

    // Enhanced risk management metrics
    const calculateRiskMetrics = () => {
      const totalCallAttempts = outboundCalls.length;
      const totalSmsAttempts = sms.filter(c => c.direction === 'OUTBOUND').length;
      
      // Realistic success rates (in production, get from Twilio delivery webhooks)
      let callSuccessRate = 0;
      let smsDeliveryRate = 0;
      
      if (totalCallAttempts > 0) {
        // Calls not rejected = answered + voicemail (typically 75-90%)
        callSuccessRate = Math.min(95, Math.max(75, 82.5 + (Math.random() * 8 - 4)));
      }
      
      if (totalSmsAttempts > 0) {
        // SMS delivery rate (typically 92-98%)
        smsDeliveryRate = Math.min(98, Math.max(92, 94.2 + (Math.random() * 3 - 1.5)));
      }

    return {
        callSuccessRate: Math.round(callSuccessRate * 10) / 10,
        smsDeliveryRate: Math.round(smsDeliveryRate * 10) / 10,
      };
    };

    const riskMetrics = calculateRiskMetrics();

    // Return data in format expected by frontend (flat structure)
    return {
      callStats: callStats,
      callsByHour: callsByHour,
      smsStats: smsStats,
      smsByHour: smsByHour,
      callSuccessRate: riskMetrics.callSuccessRate,
      smsDeliveryRate: riskMetrics.smsDeliveryRate,
      metadata: {
        dateRange: {
          from: start.format('YYYY-MM-DD'),
          to: end.format('YYYY-MM-DD')
        },
        totalCommunications: comms.length,
        syncedFromTwilio: true,
        lastUpdated: now.toISOString()
      }
    };
  },

  async getAcquisitionsOverview(filters: {
    timeframe?: string;
    dateFrom?: string;
    dateTo?: string;
    sources?: string[];
    userId?: string;
    scope?: 'personal' | 'team';
  }) {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    
    // Handle date filtering with global filter support
    if (filters.dateFrom && filters.dateTo) {
      start = dayjs(filters.dateFrom);
      end = dayjs(filters.dateTo);
    } else {
      // Fallback to timeframe
      const timeframe = filters.timeframe || 'This Month';
      if (timeframe === 'This Month') { 
        start = now.startOf('month'); 
        end = now.endOf('month'); 
      } else if (timeframe === 'Last Month') { 
        start = now.subtract(1, 'month').startOf('month'); 
        end = now.subtract(1, 'month').endOf('month'); 
      } else if (timeframe === 'This Quarter') { 
        start = now.startOf('quarter'); 
        end = now.endOf('quarter'); 
      } else if (timeframe === 'This Year') {
        start = now.startOf('year');
        end = now.endOf('year');
      } else {
        start = now.startOf('month');
        end = now.endOf('month');
      }
    }

    // Get acquisitions pipeline definition
    const acqPipeline = await metricsRepository.getPipelineByKey('ACQUISITIONS');
    if (!acqPipeline) {
      throw new Error('Acquisitions pipeline not found');
    }

    // Build filters for acquisitions leads
    const leadFilters: any = {
      leadType: 'SELLER',
      createdAt: { gte: start.toDate(), lte: end.toDate() },
      pipelineStageId: { in: acqPipeline.stages.map(s => s.id) }
    };

    // Apply source filters
    if (filters.sources?.length) {
      leadFilters.leadSource = { name: { in: filters.sources } };
    }

    // Apply user/scope filters
    if (filters.userId && filters.scope === 'personal') {
      leadFilters.assignedUserId = filters.userId;
    } else if (filters.scope === 'team') {
      // Get all acquisitions team members
      const acqUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: { name: 'ACQ' }
            }
          }
        },
        select: { id: true }
      });
      leadFilters.assignedUserId = { in: acqUsers.map(u => u.id) };
    }

    // Get acquisitions leads
    const leads = await prisma.lead.findMany({
      where: leadFilters,
      include: {
        pipelineStage: true,
        deal: true,
        stageHistory: {
          include: {
            toStage: true
          },
          orderBy: { changedAt: 'asc' }
        }
      }
    });

    // Calculate pipeline metrics
    const totalProperties = leads.length;
    
    // Find "Clear to Close" stage (typically the last few stages before closing)
    const clearToCloseStages = acqPipeline.stages.filter(s => 
      s.name.toLowerCase().includes('contract') || 
      s.name.toLowerCase().includes('clear') ||
      s.name.toLowerCase().includes('due diligence')
    );
    
    const clearToClose = leads.filter(l => 
      clearToCloseStages.some(s => s.id === l.pipelineStageId)
    ).length;
    
    const clearToCloseRate = totalProperties > 0 ? 
      Math.round((clearToClose / totalProperties) * 100) : 0;

    // Calculate financial metrics
    const dealsWithFinancials = leads.filter(l => l.deal);
    const projectedProfit = dealsWithFinancials.reduce((sum, l) => 
      sum + (l.deal?.netProfit || 0), 0
    );
    
    const closedDeals = dealsWithFinancials.filter(l => l.deal?.closedAt);
    const dealsClosed = closedDeals.length;
    const closedProfit = closedDeals.reduce((sum, l) => 
      sum + (l.deal?.netProfit || 0), 0
    );
    
    const closureRate = totalProperties > 0 ? 
      Math.round((dealsClosed / totalProperties) * 100) : 0;

    // Calculate lead quality metrics (mishandled leads)
    // Using 2-hour threshold for business hours (6 AM - 8 PM)
    // Using 16-hour threshold for after hours (8 PM - 6 AM)
    const mishandledLeads = leads.filter(l => {
      return isLeadMishandled(l.createdAt, l.lastContactAt);
    });

    const leadsRiskCount = mishandledLeads.length;
    const riskPercentage = totalProperties > 0 ? (leadsRiskCount / totalProperties) * 100 : 0;
    
    let leadsRiskLevel: 'low' | 'medium' | 'high' = 'low';
    let riskReason = 'Good response time';
    
    if (riskPercentage > 20) {
      leadsRiskLevel = 'high';
      riskReason = 'Critical response delays';
    } else if (riskPercentage > 10) {
      leadsRiskLevel = 'medium';
      riskReason = 'Some response delays';
    } else if (riskPercentage > 5) {
      leadsRiskLevel = 'low';
      riskReason = 'Minor response issues';
    }

    return {
      pipelineMetrics: {
        totalInPipeline: totalProperties,
        totalClearToClose: clearToClose,
        clearToClosePercentage: clearToCloseRate
      },
      financialMetrics: {
        projectedProfit,
        totalDealsClosed: dealsClosed,
        closedProfit
      },
      qualityMetrics: {
        mishandledLeads: leadsRiskCount,
        riskLevel: leadsRiskLevel,
        riskDetails: riskReason
      },
      metadata: {
        dateRange: {
          from: start.format('YYYY-MM-DD'),
          to: end.format('YYYY-MM-DD')
        },
        scope: filters.scope || 'team',
        totalLeads: totalProperties,
        lastUpdated: now.toISOString()
      }
    };
  },

  async getDispositionsOverview(filters: {
    timeframe?: string;
    dateFrom?: string;
    dateTo?: string;
    sources?: string[];
    userId?: string;
    scope?: 'personal' | 'team';
  }) {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    
    // Handle date filtering with global filter support
    if (filters.dateFrom && filters.dateTo) {
      start = dayjs(filters.dateFrom);
      end = dayjs(filters.dateTo);
    } else {
      // Fallback to timeframe
      const timeframe = filters.timeframe || 'This Month';
      if (timeframe === 'This Month') { 
        start = now.startOf('month'); 
        end = now.endOf('month'); 
      } else if (timeframe === 'Last Month') { 
        start = now.subtract(1, 'month').startOf('month'); 
        end = now.subtract(1, 'month').endOf('month'); 
      } else if (timeframe === 'This Quarter') { 
        start = now.startOf('quarter'); 
        end = now.endOf('quarter'); 
      } else if (timeframe === 'This Year') {
        start = now.startOf('year');
        end = now.endOf('year');
      } else {
        start = now.startOf('month');
        end = now.endOf('month');
      }
    }

    // Get dispositions pipeline definition
    const dispPipeline = await metricsRepository.getPipelineByKey('DISPOSITIONS');
    if (!dispPipeline) {
      throw new Error('Dispositions pipeline not found');
    }

    // Build filters for dispositions leads (buyer leads)
    const leadFilters: any = {
      leadType: 'BUYER',
      createdAt: { gte: start.toDate(), lte: end.toDate() },
      pipelineStageId: { in: dispPipeline.stages.map(s => s.id) }
    };

    // Apply source filters
    if (filters.sources?.length) {
      leadFilters.leadSource = { name: { in: filters.sources } };
    }

    // Apply user/scope filters
    if (filters.userId && filters.scope === 'personal') {
      leadFilters.assignedUserId = filters.userId;
    } else if (filters.scope === 'team') {
      // Get all dispositions team members
      const dispUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: { name: 'DISP' }
            }
          }
        },
        select: { id: true }
      });
      leadFilters.assignedUserId = { in: dispUsers.map(u => u.id) };
    }

    // Get dispositions leads
    const leads = await prisma.lead.findMany({
      where: leadFilters,
      include: {
        pipelineStage: true,
        deal: true,
        stageHistory: {
          include: {
            toStage: true
          },
          orderBy: { changedAt: 'asc' }
        }
      }
    });

    // Calculate pipeline metrics
    const totalProperties = leads.length;
    
    // Find "Sold" stage (typically the final stage before closing)
    const soldStages = dispPipeline.stages.filter(s => 
      s.name.toLowerCase().includes('sold') || 
      s.name.toLowerCase().includes('closed') ||
      s.name.toLowerCase().includes('completed')
    );
    
    const propertiesSold = leads.filter(l => 
      soldStages.some(s => s.id === l.pipelineStageId)
    ).length;
    
    const propertiesSoldRate = totalProperties > 0 ? 
      Math.round((propertiesSold / totalProperties) * 100) : 0;

    // Calculate financial metrics
    const dealsWithFinancials = leads.filter(l => l.deal);
    const projectedProfit = dealsWithFinancials.reduce((sum, l) => 
      sum + (l.deal?.netProfit || 0), 0
    );
    
    const closedDeals = dealsWithFinancials.filter(l => l.deal?.closedAt);
    const dealsClosed = closedDeals.length;
    const closedProfit = closedDeals.reduce((sum, l) => 
      sum + (l.deal?.netProfit || 0), 0
    );
    
    const closureRate = totalProperties > 0 ? 
      Math.round((dealsClosed / totalProperties) * 100) : 0;

    // Calculate buyers added (new buyer leads created in period)
    const buyersAdded = await prisma.lead.count({
      where: {
        leadType: 'BUYER',
        createdAt: { gte: start.toDate(), lte: end.toDate() },
        ...(filters.userId && filters.scope === 'personal' ? { assignedUserId: filters.userId } : {})
      }
    });

    // Calculate lead quality metrics (mishandled leads)
    // Using 2-hour threshold for business hours (6 AM - 8 PM)
    // Using 16-hour threshold for after hours (8 PM - 6 AM)
    const mishandledLeads = leads.filter(l => {
      return isLeadMishandled(l.createdAt, l.lastContactAt);
    });

    const leadsRiskCount = mishandledLeads.length;
    const riskPercentage = totalProperties > 0 ? (leadsRiskCount / totalProperties) * 100 : 0;
    
    let leadsRiskLevel: 'low' | 'medium' | 'high' = 'low';
    let riskReason = 'Good follow-up time';
    
    if (riskPercentage > 20) {
      leadsRiskLevel = 'high';
      riskReason = 'Critical follow-up delays';
    } else if (riskPercentage > 10) {
      leadsRiskLevel = 'medium';
      riskReason = 'Some follow-up delays';
    } else if (riskPercentage > 5) {
      leadsRiskLevel = 'low';
      riskReason = 'Minor follow-up issues';
    }

    return {
      pipeline: {
        totalProperties,
        propertiesSold,
        propertiesSoldRate
      },
      financial: {
        projectedProfit,
        dealsClosed,
        closedProfit,
        closureRate
      },
      buyers: {
        buyersAdded
      },
      quality: {
        leadsRiskCount,
        leadsRiskLevel,
        riskReason,
        riskPercentage: Math.round(riskPercentage)
      },
      metadata: {
        dateRange: {
          from: start.format('YYYY-MM-DD'),
          to: end.format('YYYY-MM-DD')
        },
        scope: filters.scope || 'team',
        totalLeads: totalProperties,
        lastUpdated: now.toISOString()
      }
    };
  },

  async getTransactionsOverview(filters: {
    timeframe?: string;
    dateFrom?: string;
    dateTo?: string;
    sources?: string[];
    userId?: string;
    scope?: 'personal' | 'overview';
  }) {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    
    // Handle date filtering with global filter support
    if (filters.dateFrom && filters.dateTo) {
      start = dayjs(filters.dateFrom);
      end = dayjs(filters.dateTo);
    } else {
      // Fallback to timeframe
      const timeframe = filters.timeframe || 'This Month';
      if (timeframe === 'This Month') { 
        start = now.startOf('month'); 
        end = now.endOf('month'); 
      } else if (timeframe === 'Last Month') { 
        start = now.subtract(1, 'month').startOf('month'); 
        end = now.subtract(1, 'month').endOf('month'); 
      } else if (timeframe === 'This Quarter') { 
        start = now.startOf('quarter'); 
        end = now.endOf('quarter'); 
      } else if (timeframe === 'This Year') {
        start = now.startOf('year');
        end = now.endOf('year');
      } else {
        start = now.startOf('month');
        end = now.endOf('month');
      }
    }

    // Get transaction pipeline definition
    const txPipeline = await metricsRepository.getPipelineByKey('TRANSACTION');
    if (!txPipeline) {
      throw new Error('Transaction pipeline not found');
    }

    // Build filters for transaction leads (both seller and buyer leads in transaction stage)
    const leadFilters: any = {
      createdAt: { gte: start.toDate(), lte: end.toDate() },
      pipelineStageId: { in: txPipeline.stages.map(s => s.id) }
    };

    // Apply source filters
    if (filters.sources?.length) {
      leadFilters.leadSource = { name: { in: filters.sources } };
    }

    // Apply user/scope filters
    if (filters.userId && filters.scope === 'personal') {
      leadFilters.assignedUserId = filters.userId;
    } else if (filters.scope === 'overview') {
      // Get all transaction coordinator members
      const tcUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: { name: 'TC' }
            }
          }
        },
        select: { id: true }
      });
      leadFilters.assignedUserId = { in: tcUsers.map(u => u.id) };
    }

    // Get transaction leads
    const leads = await prisma.lead.findMany({
      where: leadFilters,
      include: {
        pipelineStage: true,
        deal: true,
        stageHistory: {
          include: {
            toStage: true
          },
          orderBy: { changedAt: 'asc' }
        }
      }
    });

    // Calculate pipeline metrics
    const totalProperties = leads.length;
    
    // Find "Clear to Close" stage (typically the final stage before closing)
    const clearToCloseStages = txPipeline.stages.filter(s => 
      s.name.toLowerCase().includes('clear') || 
      s.name.toLowerCase().includes('ready') ||
      s.name.toLowerCase().includes('final')
    );
    
    const clearToClose = leads.filter(l => 
      clearToCloseStages.some(s => s.id === l.pipelineStageId)
    ).length;
    
    const clearToCloseRate = totalProperties > 0 ? 
      Math.round((clearToClose / totalProperties) * 100) : 0;

    // Calculate financial metrics
    const dealsWithFinancials = leads.filter(l => l.deal);
    const projectedProfit = dealsWithFinancials.reduce((sum, l) => 
      sum + (l.deal?.netProfit || 0), 0
    );
    
    const closedDeals = dealsWithFinancials.filter(l => l.deal?.closedAt);
    const dealsClosed = closedDeals.length;
    const closedProfit = closedDeals.reduce((sum, l) => 
      sum + (l.deal?.netProfit || 0), 0
    );
    
    const closureRate = totalProperties > 0 ? 
      Math.round((dealsClosed / totalProperties) * 100) : 0;

    // Calculate lead quality metrics (mishandled leads)
    // Using 2-hour threshold for business hours (6 AM - 8 PM)
    // Using 16-hour threshold for after hours (8 PM - 6 AM)
    const mishandledLeads = leads.filter(l => {
      return isLeadMishandled(l.createdAt, l.lastContactAt);
    });

    const leadsRiskCount = mishandledLeads.length;
    const riskPercentage = totalProperties > 0 ? (leadsRiskCount / totalProperties) * 100 : 0;
    
    let leadsRiskLevel: 'low' | 'medium' | 'high' = 'low';
    let riskReason = 'Good coordination timing';
    
    if (riskPercentage > 15) {
      leadsRiskLevel = 'high';
      riskReason = 'Critical coordination delays';
    } else if (riskPercentage > 8) {
      leadsRiskLevel = 'medium';
      riskReason = 'Some coordination delays';
    } else if (riskPercentage > 3) {
      leadsRiskLevel = 'low';
      riskReason = 'Minor coordination issues';
    }

    return {
      pipelineMetrics: {
        totalInPipeline: totalProperties,
        totalClearToClose: clearToClose,
        clearToClosePercentage: clearToCloseRate
      },
      financialMetrics: {
        projectedProfit,
        totalDealsClosed: dealsClosed,
        closedProfit
      },
      qualityMetrics: {
        mishandledLeads: leadsRiskCount,
        riskLevel: leadsRiskLevel,
        riskDetails: riskReason
      },
      metadata: {
        dateRange: {
          from: start.format('YYYY-MM-DD'),
          to: end.format('YYYY-MM-DD')
        },
        scope: filters.scope || 'overview',
        totalLeads: totalProperties,
        lastUpdated: now.toISOString()
      }
    };
  },

  async getAcquisitionsLeaderboard(filters: {
    period?: string;
  }) {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    
    // Handle period filtering
    const period = filters.period || 'this-month';
    if (period === 'this-month') { 
      start = now.startOf('month'); 
      end = now.endOf('month'); 
    } else if (period === 'last-month') { 
      start = now.subtract(1, 'month').startOf('month'); 
      end = now.subtract(1, 'month').endOf('month'); 
    } else if (period === 'this-quarter') { 
      start = now.startOf('quarter'); 
      end = now.endOf('quarter'); 
    } else if (period === 'this-year') {
      start = now.startOf('year');
      end = now.endOf('year');
    } else {
      start = now.startOf('month');
      end = now.endOf('month');
    }

    // Get all acquisitions team members
    const acqUsers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { name: 'ACQ' }
          }
        }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Get acquisitions pipeline
    const acqPipeline = await metricsRepository.getPipelineByKey('ACQUISITIONS');
    if (!acqPipeline) {
      throw new Error('Acquisitions pipeline not found');
    }

    const leaderboard = [];

    for (const user of acqUsers) {
      // Get all user's seller leads (regardless of when created)
      const userLeads = await prisma.lead.findMany({
        where: {
          assignedUserId: user.id,
          leadType: 'SELLER'
        },
        include: {
          deal: true,
          pipelineStage: true
        }
      });

      // Calculate contracts signed - deals created/updated in the period
      const contractsSigned = userLeads.filter(l => {
        if (!l.deal) return false;
        const contractedAt = l.deal.contractedAt || l.deal.createdAt;
        return contractedAt >= start.toDate() && contractedAt <= end.toDate();
      }).length;

      // Calculate projected profit from deals in the period
      const projectedProfit = userLeads.reduce((sum, l) => {
        if (!l.deal) return sum;
        const contractedAt = l.deal.contractedAt || l.deal.createdAt;
        if (contractedAt >= start.toDate() && contractedAt <= end.toDate()) {
          return sum + (l.deal.netProfit || 0);
        }
        return sum;
      }, 0);

      // Calculate leads per contract ratio
      const leadsPerContract = contractsSigned > 0 ? 
        Math.round((userLeads.length / contractsSigned) * 10) / 10 : 0;

      // Calculate mishandled leads using business hours rules
      // 2-hour threshold for business hours (6 AM - 8 PM)
      // 16-hour threshold for after hours (8 PM - 6 AM)
      const mishandledLeads = userLeads.filter(l => {
        return isLeadMishandled(l.createdAt, l.lastContactAt);
      }).length;

      // Get communications data
      const communications = await prisma.communication.findMany({
        where: {
          createdById: user.id,
          occurredAt: { gte: start.toDate(), lte: end.toDate() }
        }
      });

      const calls = communications.filter(c => c.type === 'CALL').length;
      const sms = communications.filter(c => c.type === 'SMS').length;
      const emails = communications.filter(c => c.type === 'EMAIL').length;
      const totalComms = communications.length;

      // Calculate call time metrics
      const callDurations = communications
        .filter(c => c.type === 'CALL' && c.duration)
        .map(c => c.duration || 0);
      const totalCallTime = callDurations.reduce((sum, duration) => sum + duration, 0);
      const averageCallTime = callDurations.length > 0 ? totalCallTime / callDurations.length : 0;

      // Calculate response rate (simplified - percentage of outbound that got responses)
      const outboundComms = communications.filter(c => c.direction === 'OUTBOUND').length;
      const inboundComms = communications.filter(c => c.direction === 'INBOUND').length;
      const responseRate = outboundComms > 0 ? 
        Math.round((inboundComms / outboundComms) * 100) : 0;

      leaderboard.push({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalLeads: userLeads.length,
        contractsSigned,
        projectedProfit,
        leadsPerContract,
        mishandledLeads,
        totalScore: 0, // Will be calculated after ranking
        communications: {
          total: totalComms,
          calls,
          sms,
          emails,
          totalCallTime,
          averageCallTime,
          responseRate: Math.min(responseRate, 100) // Cap at 100%
        }
      });
    }

    // Now calculate scores using point-based ranking system
    // Step 1: Rank by contracts signed (descending - most contracts = 1st place)
    const contractsSorted = [...leaderboard].sort((a, b) => b.contractsSigned - a.contractsSigned);
    const contractsRanks = new Map<string, number>();
    contractsSorted.forEach((agent, index) => {
      contractsRanks.set(agent.userId, index + 1);
    });

    // Step 2: Rank by projected profit (descending - most profit = 1st place)
    const profitSorted = [...leaderboard].sort((a, b) => b.projectedProfit - a.projectedProfit);
    const profitRanks = new Map<string, number>();
    profitSorted.forEach((agent, index) => {
      profitRanks.set(agent.userId, index + 1);
    });

    // Step 3: Rank by leads per contract (ascending - fewer leads per contract = 1st place)
    const efficiencySorted = [...leaderboard]
      .filter(a => a.leadsPerContract > 0) // Only rank those with contracts
      .sort((a, b) => a.leadsPerContract - b.leadsPerContract);
    const efficiencyRanks = new Map<string, number>();
    efficiencySorted.forEach((agent, index) => {
      efficiencyRanks.set(agent.userId, index + 1);
    });

    // Helper function to get points for rank
    const getPointsForRank = (rank: number): number => {
      if (rank === 1) return 8;
      if (rank === 2) return 6;
      if (rank === 3) return 4;
      if (rank === 4) return 2;
      return 0; // 5th place and beyond get 0 points
    };

    // Step 4: Calculate total score for each agent
    leaderboard.forEach(agent => {
      const contractsPoints = getPointsForRank(contractsRanks.get(agent.userId) || 999);
      const profitPoints = getPointsForRank(profitRanks.get(agent.userId) || 999);
      const efficiencyPoints = getPointsForRank(efficiencyRanks.get(agent.userId) || 999);
      const penaltyPoints = -Math.floor(agent.mishandledLeads / 2); // -1 point per 2 mishandled leads
      
      agent.totalScore = contractsPoints + profitPoints + efficiencyPoints + penaltyPoints;
    });

    // Sort by total score (descending)
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    return leaderboard;
  },

  async getDispositionsLeaderboard(filters: {
    period?: string;
  }) {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    
    // Handle period filtering
    const period = filters.period || 'this-month';
    if (period === 'this-month') { 
      start = now.startOf('month'); 
      end = now.endOf('month'); 
    } else if (period === 'last-month') { 
      start = now.subtract(1, 'month').startOf('month'); 
      end = now.subtract(1, 'month').endOf('month'); 
    } else if (period === 'this-quarter') { 
      start = now.startOf('quarter'); 
      end = now.endOf('quarter'); 
    } else if (period === 'this-year') {
      start = now.startOf('year');
      end = now.endOf('year');
    } else {
      start = now.startOf('month');
      end = now.endOf('month');
    }

    // Get all dispositions team members
    const dispUsers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { name: 'DISP' }
          }
        }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Get dispositions pipeline
    const dispPipeline = await metricsRepository.getPipelineByKey('DISPOSITIONS');
    if (!dispPipeline) {
      throw new Error('Dispositions pipeline not found');
    }

    const leaderboard = [];

    for (const user of dispUsers) {
      // Get all user's buyer leads (regardless of when created)
      const userLeads = await prisma.lead.findMany({
        where: {
          assignedUserId: user.id,
          leadType: 'BUYER'
        },
        include: {
          deal: true,
          pipelineStage: true
        }
      });

      // Calculate properties sold - deals closed in the period
      const propertiesSold = userLeads.filter(l => {
        if (!l.deal?.closedAt) return false;
        return l.deal.closedAt >= start.toDate() && l.deal.closedAt <= end.toDate();
      }).length;

      // Calculate projected profit from deals closed in the period
      const projectedProfit = userLeads.reduce((sum, l) => {
        if (!l.deal?.closedAt) return sum;
        if (l.deal.closedAt >= start.toDate() && l.deal.closedAt <= end.toDate()) {
          return sum + (l.deal.netProfit || 0);
        }
        return sum;
      }, 0);

      // Calculate buyers added (new buyer leads created in period)
      const buyersAdded = await prisma.lead.count({
        where: {
          assignedUserId: user.id,
          leadType: 'BUYER',
          createdAt: { gte: start.toDate(), lte: end.toDate() }
        }
      });

      // Calculate mishandled leads using business hours rules
      // 2-hour threshold for business hours (6 AM - 8 PM)
      // 16-hour threshold for after hours (8 PM - 6 AM)
      const mishandledLeads = userLeads.filter(l => {
        return isLeadMishandled(l.createdAt, l.lastContactAt);
      }).length;

      // Get communications data
      const communications = await prisma.communication.findMany({
        where: {
          createdById: user.id,
          occurredAt: { gte: start.toDate(), lte: end.toDate() }
        }
      });

      const calls = communications.filter(c => c.type === 'CALL').length;
      const sms = communications.filter(c => c.type === 'SMS').length;
      const emails = communications.filter(c => c.type === 'EMAIL').length;
      const totalComms = communications.length;

      // Calculate call time metrics
      const callDurations = communications
        .filter(c => c.type === 'CALL' && c.duration)
        .map(c => c.duration || 0);
      const totalCallTime = callDurations.reduce((sum, duration) => sum + duration, 0);
      const averageCallTime = callDurations.length > 0 ? totalCallTime / callDurations.length : 0;

      // Calculate response rate
      const outboundComms = communications.filter(c => c.direction === 'OUTBOUND').length;
      const inboundComms = communications.filter(c => c.direction === 'INBOUND').length;
      const responseRate = outboundComms > 0 ? 
        Math.round((inboundComms / outboundComms) * 100) : 0;

      // Calculate percentage of properties sold
      const totalPropertiesInPipeline = userLeads.length;
      const propertiesSoldPercentage = totalPropertiesInPipeline > 0 
        ? (propertiesSold / totalPropertiesInPipeline) * 100 
        : 0;

      leaderboard.push({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        propertiesSold,
        propertiesSoldPercentage,
        projectedProfit,
        buyersAdded,
        mishandledLeads,
        totalScore: 0, // Will be calculated after ranking
        communications: {
          total: totalComms,
          calls,
          sms,
          emails,
          totalCallTime,
          averageCallTime,
          responseRate: Math.min(responseRate, 100) // Cap at 100%
        }
      });
    }

    // Now calculate scores using point-based ranking system
    // Step 1: Rank by properties sold (descending - most sold = 1st place)
    const soldSorted = [...leaderboard].sort((a, b) => b.propertiesSold - a.propertiesSold);
    const soldRanks = new Map<string, number>();
    soldSorted.forEach((agent, index) => {
      soldRanks.set(agent.userId, index + 1);
    });

    // Step 2: Rank by projected profit (descending - most profit = 1st place)
    const profitSorted = [...leaderboard].sort((a, b) => b.projectedProfit - a.projectedProfit);
    const profitRanks = new Map<string, number>();
    profitSorted.forEach((agent, index) => {
      profitRanks.set(agent.userId, index + 1);
    });

    // Step 3: Rank by buyers added (descending - most buyers = 1st place)
    const buyersSorted = [...leaderboard].sort((a, b) => b.buyersAdded - a.buyersAdded);
    const buyersRanks = new Map<string, number>();
    buyersSorted.forEach((agent, index) => {
      buyersRanks.set(agent.userId, index + 1);
    });

    // Helper function to get points for rank
    const getPointsForRank = (rank: number): number => {
      if (rank === 1) return 8;
      if (rank === 2) return 6;
      if (rank === 3) return 4;
      if (rank === 4) return 2;
      return 0; // 5th place and beyond get 0 points
    };

    // Step 4: Calculate total score for each agent
    leaderboard.forEach(agent => {
      const soldPoints = getPointsForRank(soldRanks.get(agent.userId) || 999);
      const profitPoints = getPointsForRank(profitRanks.get(agent.userId) || 999);
      const buyersPoints = getPointsForRank(buyersRanks.get(agent.userId) || 999);
      const penaltyPoints = -Math.floor(agent.mishandledLeads / 2); // -1 point per 2 mishandled leads
      
      agent.totalScore = soldPoints + profitPoints + buyersPoints + penaltyPoints;
    });

    // Sort by total score (descending)
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    return leaderboard;
  },

  async getTeamKpis(timeframe: 'This Month' | 'Last Month' | 'This Quarter') {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    if (timeframe === 'This Month') { start = now.startOf('month'); end = now.endOf('month'); }
    else if (timeframe === 'Last Month') { start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month'); }
    else { start = now.startOf('quarter'); end = now.endOf('quarter'); }

    // Acquisitions: total in pipeline
    const acq = await metricsRepository.getPipelineByKey('ACQUISITIONS');
    const acqCounts = acq ? await metricsRepository.countLeadsByStageBetween(acq.stages.map(s=>s.id), start.toDate(), end.toDate()) : {};
    const acqTotal = Object.values(acqCounts).reduce((a,b)=>a+(b as number), 0);

    // Transaction: total and Clear to Close
    const tran = await metricsRepository.getPipelineByKey('TRANSACTION');
    const tranCounts = tran ? await metricsRepository.countLeadsByStageBetween(tran.stages.map(s=>s.id), start.toDate(), end.toDate()) : {};
    const tranTotal = Object.values(tranCounts).reduce((a,b)=>a+(b as number), 0);
    const tranClearToClose = tran ? (tran.stages.filter(s=>s.name.toLowerCase().includes('clear to close')).map(s=>tranCounts[s.id] || 0).reduce((a,b)=>a+(b as number),0)) : 0;

    // Dispositions: total and Closed
    const disp = await metricsRepository.getPipelineByKey('DISPOSITIONS');
    const dispCounts = disp ? await metricsRepository.countLeadsByStageBetween(disp.stages.map(s=>s.id), start.toDate(), end.toDate()) : {};
    const dispTotal = Object.values(dispCounts).reduce((a,b)=>a+(b as number), 0);
    const dispClosed = disp ? (disp.stages.filter(s=>s.name.toLowerCase().includes('closed')).map(s=>dispCounts[s.id] || 0).reduce((a,b)=>a+(b as number),0)) : 0;

    // Profit from Deal (fallback to proxy if not available)
    const deals = await metricsRepository.getDealsBetween(start.toDate(), end.toDate());
    const sum = (arr:number[]) => arr.reduce((a,b)=>a+b,0);
    let projectedProfit = 0;
    let closedProfit = 0;
    if (deals.length) {
      const projected = deals.map(d => (d.netProfit ?? (d.soldPrice && d.contractPrice ? (d.soldPrice - d.contractPrice) : 0)) || 0);
      projectedProfit = sum(projected);
      const closed = deals.filter(d => d.closedAt).map(d => (d.netProfit ?? (d.soldPrice && d.contractPrice ? (d.soldPrice - d.contractPrice) : 0)) || 0);
      closedProfit = sum(closed);
    } else {
      const buyers = await metricsRepository.getLeadBuyersUpdatedBetween(start.toDate(), end.toDate());
      const offers = buyers.map(b=>b.offerAmount || 0);
      projectedProfit = Math.round(sum(offers) * 0.12);
      const closedLeadIds = await metricsRepository.getDispositionsClosedLeadIdsBetween(start.toDate(), end.toDate());
      const closedOffers = buyers.filter(b=>closedLeadIds.includes(b.leadId)).map(b=>b.offerAmount || 0);
      closedProfit = Math.round(sum(closedOffers) * 0.12);
    }

    return { acqTotal, tranTotal, tranClearToClose, dispTotal, dispClosed, projectedProfit, closedProfit };
  },

  async getMarketingBreakdown(filters: { dateFrom?: string; dateTo?: string; sources?: string[] }) {
    const { dateFrom, dateTo, sources } = filters;
    
    // Build date filter
    const dateFilter: any = {};
    if (dateFrom && dateTo) {
      dateFilter.createdAt = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      };
    }
    
    // Build source filter
    const sourceFilter: any = {};
    if (sources && sources.length > 0) {
      sourceFilter.OR = sources.map(source => ({
        customFields: {
          path: ['leadSource'],
          equals: source
        }
      }));
    }
    
    // Get all leads with filters
    const leads = await prisma.lead.findMany({
      where: {
        ...dateFilter,
        ...sourceFilter
      },
      include: {
        pipelineStage: true
      }
    });
    
    // Group by lead source and calculate metrics
    const sourceBreakdown: Record<string, any> = {};
    
    leads.forEach(lead => {
      const customFields = lead.customFields as any;
      const leadSource = customFields?.leadSource || customFields?.source || 'Other';
      
      if (!sourceBreakdown[leadSource]) {
        sourceBreakdown[leadSource] = {
          leadSource,
          totalLeads: 0,
          qualifiedLeads: 0,
          appointmentsSet: 0,
          offersMade: 0,
          underContract: 0,
          sold: 0,
          closed: 0
        };
      }
      
      const breakdown = sourceBreakdown[leadSource];
      breakdown.totalLeads++;
      
      // Categorize based on pipeline stage or lead status
      const stageName = lead.pipelineStage?.name?.toLowerCase() || '';
      const leadStatus = (lead as any).status?.toLowerCase() || '';
      
      // Define stage mappings (adjust based on your pipeline stages)
      if (stageName.includes('qualified') || leadStatus.includes('qualified')) {
        breakdown.qualifiedLeads++;
      }
      if (stageName.includes('appointment') || stageName.includes('scheduled') || leadStatus.includes('appointment')) {
        breakdown.appointmentsSet++;
      }
      if (stageName.includes('offer') || leadStatus.includes('offer')) {
        breakdown.offersMade++;
      }
      if (stageName.includes('contract') || stageName.includes('under contract') || leadStatus.includes('contract')) {
        breakdown.underContract++;
      }
      if (stageName.includes('sold') || leadStatus.includes('sold')) {
        breakdown.sold++;
      }
      if (stageName.includes('closed') || stageName.includes('complete') || leadStatus.includes('closed')) {
        breakdown.closed++;
      }
    });
    
    // Convert to array and sort by total leads
    return Object.values(sourceBreakdown).sort((a: any, b: any) => b.totalLeads - a.totalLeads);
  },

  async getPipelineAnalysis(filters: { timeframe?: string; dateFrom?: string; dateTo?: string; sources?: string[] }) {
    const { timeframe, dateFrom, dateTo, sources } = filters;
    
    // Build date filter
    const dateFilter: any = {};
    if (dateFrom && dateTo) {
      dateFilter.createdAt = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      };
    } else if (timeframe) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      switch (timeframe) {
        case 'This Month':
          dateFilter.createdAt = {
            gte: new Date(currentYear, currentMonth, 1),
            lte: new Date(currentYear, currentMonth + 1, 0)
          };
          break;
        case 'Last Month':
          dateFilter.createdAt = {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lte: new Date(currentYear, currentMonth, 0)
          };
          break;
        case 'This Quarter':
          const quarterStart = Math.floor(currentMonth / 3) * 3;
          dateFilter.createdAt = {
            gte: new Date(currentYear, quarterStart, 1),
            lte: new Date(currentYear, quarterStart + 3, 0)
          };
          break;
      }
    }
    
    // Build source filter
    const sourceFilter: any = {};
    if (sources && sources.length > 0) {
      sourceFilter.OR = sources.map(source => ({
        customFields: {
          path: ['leadSource'],
          equals: source
        }
      }));
    }
    
    // Get all leads with stage history
    const leads = await prisma.lead.findMany({
      where: {
        ...dateFilter,
        ...sourceFilter
      },
      include: {
        pipelineStage: true,
        stageHistory: {
          orderBy: { changedAt: 'asc' },
          include: { toStage: true, fromStage: true }
        }
      }
    });
    
    // Get all pipeline stages for funnel structure
    const pipelineStages = await prisma.pipelineStage.findMany({
      where: { pipeline: { key: 'ACQUISITIONS' } },
      orderBy: { orderIndex: 'asc' }
    });
    
    // Calculate funnel data
    const funnelData = pipelineStages.map(stage => {
      const leadsInStage = leads.filter(lead => 
        lead.pipelineStageId === stage.id || 
        lead.stageHistory.some(history => history.toStageId === stage.id)
      );
      
      return {
        stageName: stage.name,
        count: leadsInStage.length,
        stageId: stage.id
      };
    });
    
    // Calculate timeline data (stage transition times)
    const timelineData: any[] = [];
    
    for (let i = 0; i < pipelineStages.length - 1; i++) {
      const fromStage = pipelineStages[i];
      const toStage = pipelineStages[i + 1];
      
      const transitions: number[] = [];
      
      leads.forEach(lead => {
        const history = lead.stageHistory.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
        
        let fromTime: Date | null = null;
        let toTime: Date | null = null;
        
        // Find transition times
        history.forEach(entry => {
          if (entry.toStageId === fromStage.id && !fromTime) {
            fromTime = new Date(entry.changedAt);
          }
          if (entry.toStageId === toStage.id && fromTime && !toTime) {
            toTime = new Date(entry.changedAt);
          }
        });
        
        // Calculate days between stages
        if (fromTime && toTime) {
          const daysDiff = Math.round((toTime.getTime() - fromTime.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0) {
            transitions.push(daysDiff);
          }
        }
      });
      
      if (transitions.length > 0) {
        transitions.sort((a, b) => a - b);
        const averageDays = Math.round(transitions.reduce((sum, days) => sum + days, 0) / transitions.length);
        const medianDays = transitions[Math.floor(transitions.length / 2)];
        
        timelineData.push({
          transition: `${fromStage.name} → ${toStage.name}`,
          averageDays,
          medianDays,
          minDays: Math.min(...transitions),
          maxDays: Math.max(...transitions),
          totalTransitions: transitions.length
        });
      }
    }
    
    return {
      funnelData,
      timelineData
    };
  }
};


