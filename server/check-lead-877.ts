import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const leadId = '877b452b-257e-4933-abbe-4af928fe299a';
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      address: true,
      pipelineStage: true,
      communications: {
        orderBy: { createdAt: 'asc' },
        take: 20
      },
      tasks: {
        orderBy: { createdAt: 'desc' }
      },
      assignedUser: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  if (!lead) {
    console.log('Lead not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== LEAD DETAILS ===');
  console.log('ID:', lead.id);
  console.log('Created:', lead.createdAt);
  console.log('Stage:', lead.pipelineStage?.name);
  console.log('Assigned To:', lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : 'Unassigned');
  console.log('Address:', lead.address?.address1 || 'N/A');
  console.log('');

  console.log('=== COMMUNICATIONS ===');
  if (lead.communications.length === 0) {
    console.log('No communications found');
  } else {
    lead.communications.forEach((c, i) => {
      console.log(`${i + 1}. ${c.type} - ${c.direction} - ${c.createdAt}`);
      if (c.notes) console.log('   Notes:', c.notes);
    });
  }
  console.log('');

  const firstOutbound = lead.communications.find(c => c.direction === 'OUTBOUND');
  if (firstOutbound) {
    console.log('First OUTBOUND:', firstOutbound.createdAt);
    const hoursDiff = (new Date(firstOutbound.createdAt).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
    console.log('Hours from creation to first outbound:', hoursDiff.toFixed(2));
  } else {
    console.log('First OUTBOUND: Never');
    const hoursDiff = (new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
    console.log('Hours since creation:', hoursDiff.toFixed(2));
  }
  console.log('');

  console.log('=== TASKS ===');
  if (lead.tasks.length === 0) {
    console.log('No tasks found');
  } else {
    lead.tasks.forEach((t, i) => {
      console.log(`${i + 1}. ${t.title}`);
      console.log('   Status:', t.status);
      console.log('   Created:', t.createdAt);
      console.log('   Due:', t.dueAt);
      if (t.description) console.log('   Description:', t.description);
      console.log('');
    });
  }

  await prisma.$disconnect();
})();

