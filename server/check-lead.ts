import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLead() {
  const leadId = 'b696dbbf-b5db-4b42-a712-ff00055a754e';
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      createdAt: true,
      communications: {
        where: {
          direction: 'OUTBOUND',
          type: { in: ['CALL', 'SMS', 'EMAIL'] }
        },
        orderBy: { occurredAt: 'desc' },
        select: {
          type: true,
          direction: true,
          occurredAt: true,
          createdAt: true,
          subject: true,
          body: true
        }
      }
    }
  });

  console.log('\n🔍 Lead Details:');
  console.log('Lead ID:', lead?.id);
  console.log('Created At (UTC):', lead?.createdAt?.toISOString());
  console.log('Created At (ET):', lead?.createdAt ? new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'long'
  }).format(lead.createdAt) : 'N/A');
  
  console.log('\n📞 OUTBOUND Communications (ordered by occurredAt desc):');
  lead?.communications.forEach((comm, idx) => {
    console.log(`\n  ${idx + 1}. ${comm.type} - ${comm.direction}`);
    console.log('     occurredAt (UTC):', comm.occurredAt?.toISOString());
    console.log('     occurredAt (ET):', comm.occurredAt ? new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'long'
    }).format(comm.occurredAt) : 'N/A');
    console.log('     createdAt (UTC):', comm.createdAt?.toISOString());
    console.log('     Subject:', comm.subject);
  });

  // Calculate hours from creation to first outbound
  if (lead && lead.communications.length > 0) {
    const firstOutbound = lead.communications[lead.communications.length - 1]; // Last in desc order = first chronologically
    const leadCreatedAt = new Date(lead.createdAt);
    const firstOutboundAt = new Date(firstOutbound.occurredAt!);
    const hoursToReachOut = (firstOutboundAt.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60);
    
    console.log('\n⏱️  Calculation:');
    console.log('  Hours from creation to FIRST outbound:', hoursToReachOut.toFixed(2));
    
    // Get threshold
    const hourEt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(leadCreatedAt).find((p) => p.type === 'hour')?.value || '0';
    const hourEtNum = parseInt(hourEt, 10);
    const threshold = hourEtNum >= 8 && hourEtNum <= 17 ? 2 : 16;
    console.log('  Threshold:', threshold, 'hours');
    console.log('  Is Breach?', hoursToReachOut > threshold);
    console.log('  Breached by:', (hoursToReachOut - threshold).toFixed(2), 'hours');
  }

  await prisma.$disconnect();
}

checkLead().catch(console.error);

