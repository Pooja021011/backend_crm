import { PrismaClient } from '@prisma/client';

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
  
  // Weekend rule: 5pm Friday to 6pm Sunday ET => 48h SLA
  if (dayOfWeek === 5 && hourEt >= 17) return 48;
  if (dayOfWeek === 6) return 48;
  if (dayOfWeek === 0 && hourEt < 18) return 48;
  
  // Regular business hours: 8am–5pm ET (inclusive) => 2h SLA; else 16h SLA
  return hourEt >= 8 && hourEt <= 17 ? 2 : 16;
}

async function debugLead() {
  const leadId = 'b337e674-a03b-4335-bf8d-1f585fc36ba1';
  
  console.log('\n🔍 Debugging Lead:', leadId);
  console.log('='.repeat(80));
  
  // Get current month range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Fetch lead with all details
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      createdAt: true,
      assignedUserId: true,
      leadType: true,
      leadStatus: {
        select: { name: true }
      },
      pipelineStage: {
        select: {
          id: true,
          name: true,
          pipeline: {
            select: { key: true }
          }
        }
      },
      communications: {
        where: {
          direction: 'OUTBOUND',
          type: { in: ['CALL', 'SMS', 'EMAIL'] }
        },
        orderBy: { occurredAt: 'asc' },
        select: {
          id: true,
          type: true,
          direction: true,
          occurredAt: true,
          createdAt: true
        }
      }
    }
  });
  
  if (!lead) {
    console.log('❌ Lead not found!');
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n📋 Lead Details:');
  console.log('   ID:', lead.id);
  console.log('   Created At (UTC):', lead.createdAt.toISOString());
  console.log('   Created At (Local):', lead.createdAt.toString());
  console.log('   Lead Type:', lead.leadType);
  console.log('   Lead Status:', lead.leadStatus?.name);
  console.log('   Pipeline Stage:', lead.pipelineStage?.name);
  console.log('   Pipeline Key:', lead.pipelineStage?.pipeline?.key);
  console.log('   Assigned User ID:', lead.assignedUserId);
  
  // Check if created this month
  const isCreatedThisMonth = lead.createdAt >= startOfMonth && lead.createdAt < endOfMonth;
  console.log('\n📅 Month Check:');
  console.log('   Start of Month:', startOfMonth.toISOString());
  console.log('   End of Month:', endOfMonth.toISOString());
  console.log('   Created This Month?', isCreatedThisMonth);
  
  // Calculate threshold
  const hourEt = getEtHour(lead.createdAt);
  const dayOfWeek = getEtDayOfWeek(lead.createdAt);
  const threshold = getSlaThresholdHoursEt(lead.createdAt);
  
  console.log('\n⏰ SLA Threshold Calculation:');
  console.log('   Created At (ET Hour):', hourEt);
  console.log('   Created At (ET Day of Week):', dayOfWeek, '(' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek] + ')');
  console.log('   Threshold:', threshold, 'hours');
  
  // Check communications
  console.log('\n📞 Communications:');
  console.log('   Total OUTBOUND Communications:', lead.communications.length);
  
  if (lead.communications.length === 0) {
    console.log('   ⚠️  No OUTBOUND communications found!');
    const nowDt = new Date();
    const hoursSinceCreation = (nowDt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60);
    console.log('   Hours Since Creation:', hoursSinceCreation.toFixed(2));
    console.log('   Is Breach?', hoursSinceCreation > threshold);
  } else {
    lead.communications.forEach((comm, idx) => {
      console.log(`\n   Communication #${idx + 1}:`);
      console.log('      ID:', comm.id);
      console.log('      Type:', comm.type);
      console.log('      Direction:', comm.direction);
      console.log('      Occurred At (UTC):', comm.occurredAt?.toISOString());
      console.log('      Occurred At (Local):', comm.occurredAt?.toString());
      console.log('      Created At (UTC):', comm.createdAt.toISOString());
    });
    
    const firstOutbound = lead.communications[0];
    if (firstOutbound?.occurredAt) {
      const firstOutboundAt = new Date(firstOutbound.occurredAt);
      const leadCreatedAt = new Date(lead.createdAt);
      const hoursToReachOut = (firstOutboundAt.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60);
      
      console.log('\n⏱️  SLA Breach Check:');
      console.log('   First Outbound At:', firstOutboundAt.toISOString());
      console.log('   Hours to Reach Out:', hoursToReachOut.toFixed(2));
      console.log('   Threshold:', threshold);
      console.log('   Is Breach?', hoursToReachOut > threshold);
      console.log('   Breach By:', (hoursToReachOut - threshold).toFixed(2), 'hours');
    }
  }
  
  await prisma.$disconnect();
}

debugLead().catch(console.error);






