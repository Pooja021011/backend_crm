import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

// Helper functions (copy from metricsService.ts)
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

function getEtDayOfWeek(d: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
  const dayName = formatter.format(d);
  const dayMap: Record<string, number> = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };
  return dayMap[dayName] ?? 0;
}

function getSlaThresholdHoursEt(createdAt: Date): number {
  const hourEt = getEtHour(createdAt);
  const dayOfWeek = getEtDayOfWeek(createdAt);
  
  if (dayOfWeek === 5 && hourEt >= 17) return 48;
  if (dayOfWeek === 6) return 48;
  if (dayOfWeek === 0 && hourEt < 18) return 48;
  
  return hourEt >= 8 && hourEt <= 17 ? 2 : 16;
}

async function testMishandledLeads(assignedUserId?: string) {
  try {
    const userLabel = assignedUserId ? `ACQ Agent: ${assignedUserId}` : 'Manager (All ACQ Agents)';
    console.log(`\n🔍 Testing Mishandled Leads for ${userLabel}\n`);
    console.log('='.repeat(80));

    const now = dayjs();
    const start = now.startOf('month').toDate();
    const end = now.endOf('month').toDate();
    const nowDt = new Date();

    // 1. Get leads received this month
    const leadsReceived = await prisma.lead.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        leadType: 'SELLER',
        ...(assignedUserId 
          ? { assignedUserId }
          : {
              // Manager: Filter by ACQ role
              assignedUser: {
                roles: {
                  some: {
                    role: { name: 'ACQ' }
                  }
                }
              }
            }),
      },
      select: { id: true, createdAt: true, updatedAt: true }
    });
    console.log(`\n📊 Leads Received This Month: ${leadsReceived.length}`);
    console.log(`   Lead IDs: ${leadsReceived.map(l => l.id).join(', ') || 'None'}`);

    // 2. Get active leads with pipeline stage
    const activeLeads = await prisma.lead.findMany({
      where: {
        pipelineStage: { pipeline: { key: 'ACQUISITIONS' } },
        leadType: 'SELLER',
        ...(assignedUserId 
          ? { assignedUserId }
          : {
              // Manager: Filter by ACQ role
              assignedUser: {
                roles: {
                  some: {
                    role: { name: 'ACQ' }
                  }
                }
              }
            }),
        leadStatus: { name: { equals: 'Pipeline', mode: 'insensitive' } },
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        lastContactAt: true,
        pipelineStage: {
          select: {
            id: true,
            name: true,
            orderIndex: true,
          }
        },
        // Include OUTBOUND communications for SLA breach check (matching Major KPI logic)
        communications: {
          where: {
            direction: 'OUTBOUND',
            type: { in: ['CALL', 'SMS', 'EMAIL'] }
          },
          orderBy: { occurredAt: 'asc' }, // Order by asc to get all, filter first/last in code
          select: {
            occurredAt: true,
            createdAt: true,
          }
        }
      },
    });

    // 3. Get pipeline stages for stale48h filtering
    const pipelineStages = await prisma.pipelineStage.findMany({
      where: { pipeline: { key: 'ACQUISITIONS' } },
      select: { id: true, name: true, orderIndex: true },
      orderBy: { orderIndex: 'asc' }
    });

    const noContactMadeStage = pipelineStages.find(s => 
      s.name.toLowerCase().includes('no contact made') || s.name.toLowerCase() === 'no contact'
    );
    const contractSentStage = pipelineStages.find(s => 
      s.name.toLowerCase().includes('contract sent')
    );

    const validStageIdsForStale48h = new Set<string>();
    if (noContactMadeStage && contractSentStage) {
      pipelineStages.forEach(stage => {
        if (stage.orderIndex >= noContactMadeStage.orderIndex && 
            stage.orderIndex <= contractSentStage.orderIndex) {
          validStageIdsForStale48h.add(stage.id);
        }
      });
    }

    console.log(`\n📋 Valid Stages for Stale48h: ${Array.from(validStageIdsForStale48h).join(', ') || 'None'}`);

    // 4. SLA Breaches - Only OUTBOUND communications count as "reach out" (matching Major KPI logic)
    const createdThisMonthIds = new Set(leadsReceived.map((l) => l.id));
    const slaBreachLeads = activeLeads.filter((l) => {
      if (!createdThisMonthIds.has(l.id)) return false;
      
      // Get the FIRST OUTBOUND communication (CALL/SMS/EMAIL only) for SLA breach check
      // Communications are ordered by occurredAt asc, so [0] is the first/earliest
      const allOutboundComms = (l as any).communications || [];
      const firstOutboundComm = allOutboundComms[0]; // First in asc order = earliest
      const firstOutboundAt = firstOutboundComm?.occurredAt ? new Date(firstOutboundComm.occurredAt) : null;
      
      const thresholdHours = getSlaThresholdHoursEt(l.createdAt);
      
      if (!firstOutboundAt) {
        // If never reached out (no OUTBOUND communication), check if threshold exceeded
        const hoursSinceCreation = (nowDt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreation > thresholdHours;
      }
      
      // If reached out (OUTBOUND), check if FIRST reach out happened within threshold
      // Calculate time from lead creation to FIRST outbound contact
      const leadCreatedAt = new Date(l.createdAt);
      const hoursToReachOut = (firstOutboundAt.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60);
      
      // Only count as breach if the FIRST contact happened AFTER the threshold
      return hoursToReachOut > thresholdHours;
    });

    console.log(`\n🚨 SLA BREACHES (${slaBreachLeads.length}) - OUTBOUND only:`);
    slaBreachLeads.forEach(lead => {
      const allOutboundComms = (lead as any).communications || [];
      const firstOutboundComm = allOutboundComms[0];
      const firstOutboundAt = firstOutboundComm?.occurredAt ? new Date(firstOutboundComm.occurredAt) : null;
      const threshold = getSlaThresholdHoursEt(lead.createdAt);
      const leadCreatedAt = new Date(lead.createdAt);
      const hoursToReachOut = firstOutboundAt
        ? (firstOutboundAt.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60)
        : (nowDt.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60);
      console.log(`   - Lead ID: ${lead.id}`);
      console.log(`     Created: ${lead.createdAt.toISOString()}`);
      console.log(`     FIRST OUTBOUND: ${firstOutboundAt ? firstOutboundAt.toISOString() : 'Never'}`);
      console.log(`     Last Contact (all): ${lead.lastContactAt ? lead.lastContactAt.toISOString() : 'Never'}`);
      console.log(`     Threshold: ${threshold}h, Hours to Reach Out: ${hoursToReachOut.toFixed(2)}h`);
    });

    // 5. Stale 48h - Only OUTBOUND communications count as "reach out" (matching Major KPI logic)
    const stale48hLeads = activeLeads.filter((l) => {
      if (!l.pipelineStage) return false;
      if (!validStageIdsForStale48h.has(l.pipelineStage.id)) return false;
      
      // Get the MOST RECENT OUTBOUND communication (CALL/SMS/EMAIL only) for stale48h check
      // Communications are ordered by occurredAt asc, so last item is the most recent
      const allOutboundComms = (l as any).communications || [];
      const lastOutboundComm = allOutboundComms[allOutboundComms.length - 1];
      const lastOutboundAt = lastOutboundComm?.occurredAt ? new Date(lastOutboundComm.occurredAt) : null;
      
      if (!lastOutboundAt) {
        // If never reached out (no OUTBOUND communication), check if 48h passed since creation
        const hoursSinceCreation = (nowDt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreation >= 48;
      }
      // If reached out (OUTBOUND), check if 48h passed since last OUTBOUND reach out
      const hoursSince = (nowDt.getTime() - new Date(lastOutboundAt).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 48;
    });

    console.log(`\n⏰ STALE 48H (${stale48hLeads.length}) - OUTBOUND only:`);
    stale48hLeads.forEach(lead => {
      const outboundComm = (lead as any).communications?.[0];
      const lastOutboundAt = outboundComm?.occurredAt || outboundComm?.createdAt || null;
      const hoursSince = lastOutboundAt
        ? (nowDt.getTime() - new Date(lastOutboundAt).getTime()) / (1000 * 60 * 60)
        : (nowDt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60);
      console.log(`   - Lead ID: ${lead.id}`);
      console.log(`     Stage: ${lead.pipelineStage?.name || 'Unknown'}`);
      console.log(`     Last OUTBOUND: ${lastOutboundAt ? new Date(lastOutboundAt).toISOString() : 'Never'}`);
      console.log(`     Last Contact (all): ${lead.lastContactAt ? lead.lastContactAt.toISOString() : 'Never'}`);
      console.log(`     Hours Since: ${hoursSince.toFixed(2)}h`);
    });

    // 6. Tasks Past Due 6h+
    const tasksCutoffDate = new Date('2026-01-20T00:00:00Z');
    const leadsWithPastDueTasks = await prisma.lead.findMany({
      where: {
        leadType: 'SELLER',
        pipelineStage: { pipeline: { key: 'ACQUISITIONS' } },
        leadStatus: { name: { equals: 'Pipeline', mode: 'insensitive' } },
        ...(assignedUserId 
          ? { assignedUserId }
          : {
              // Manager: Filter by ACQ role
              assignedUser: {
                roles: {
                  some: {
                    role: { name: 'ACQ' }
                  }
                }
              }
            }),
        tasks: {
          some: {
            status: 'OPEN',
            dueAt: {
              lte: new Date(nowDt.getTime() - 6 * 60 * 60 * 1000),
              gte: tasksCutoffDate,
            },
            NOT: {
              OR: [
                { title: { startsWith: 'Review note on ' } },
                { title: { startsWith: 'Underwrite ' } },
                { title: { startsWith: 'Make Offer on ' } },
                { title: { startsWith: 'Follow Up With ' } },
                { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
                { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
                { title: { startsWith: 'Check Voided Contract With ' } },
              ]
            }
          }
        }
      },
      select: {
        id: true,
        tasks: {
          where: {
            status: 'OPEN',
            dueAt: {
              lte: new Date(nowDt.getTime() - 6 * 60 * 60 * 1000),
              gte: tasksCutoffDate,
            }
          },
          select: {
            id: true,
            title: true,
            dueAt: true,
          }
        }
      },
      distinct: ['id'],
    });

    console.log(`\n📝 TASKS PAST DUE 6H+ (${leadsWithPastDueTasks.length}):`);
    leadsWithPastDueTasks.forEach(lead => {
      console.log(`   - Lead ID: ${lead.id}`);
      lead.tasks.forEach(task => {
        const hoursPastDue = (nowDt.getTime() - new Date(task.dueAt).getTime()) / (1000 * 60 * 60);
        console.log(`     Task: "${task.title}"`);
        console.log(`     Due At: ${task.dueAt.toISOString()}`);
        console.log(`     Hours Past Due: ${hoursPastDue.toFixed(2)}h`);
      });
    });

    // 7. Summary
    const totalMishandled = slaBreachLeads.length + stale48hLeads.length + leadsWithPastDueTasks.length;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n📊 SUMMARY:`);
    console.log(`   SLA Breaches: ${slaBreachLeads.length} (Lead IDs: ${slaBreachLeads.map(l => l.id).join(', ') || 'None'})`);
    console.log(`   Stale 48h: ${stale48hLeads.length} (Lead IDs: ${stale48hLeads.map(l => l.id).join(', ') || 'None'})`);
    console.log(`   Tasks Past Due 6h+: ${leadsWithPastDueTasks.length} (Lead IDs: ${leadsWithPastDueTasks.map(l => l.id).join(', ') || 'None'})`);
    console.log(`   TOTAL MISHANDLED: ${totalMishandled}`);
    console.log(`\n${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get user ID from command line argument or find by email/name
async function main() {
  let userId = process.argv[2];
  const isManager = process.argv[2] === 'manager' || process.argv[2] === 'MANAGER';

  if (isManager) {
    console.log('Running for Manager (All ACQ Agents)...\n');
    await testMishandledLeads(undefined);
    return;
  }

  if (!userId) {
    // Try to find Hardeep Singh or first ACQ user
    console.log('No user ID provided. Searching for ACQ users...\n');
    console.log('Usage:');
    console.log('  npx tsx server/test-mishandled-leads.ts manager  (for Manager view)');
    console.log('  npx tsx server/test-mishandled-leads.ts <userId>  (for specific ACQ agent)\n');
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'hardeep', mode: 'insensitive' } },
          { firstName: { contains: 'hardeep', mode: 'insensitive' } },
        ],
        roles: {
          some: {
            role: {
              name: 'ACQ'
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      }
    });

    if (user) {
      userId = user.id;
      console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`Using ID: ${userId}\n`);
    } else {
      // Get first ACQ user
      const firstAcqUser = await prisma.user.findFirst({
        where: {
          roles: {
            some: {
              role: {
                name: 'ACQ'
              }
            }
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      });

      if (firstAcqUser) {
        userId = firstAcqUser.id;
        console.log(`Using first ACQ user: ${firstAcqUser.firstName} ${firstAcqUser.lastName} (${firstAcqUser.email})`);
        console.log(`ID: ${userId}\n`);
      } else {
        console.error('No ACQ users found. Please provide user ID or "manager":');
        console.error('  npx tsx server/test-mishandled-leads.ts manager');
        console.error('  npx tsx server/test-mishandled-leads.ts <userId>');
        await prisma.$disconnect();
        process.exit(1);
      }
    }
  }

  await testMishandledLeads(userId);
}

main();

