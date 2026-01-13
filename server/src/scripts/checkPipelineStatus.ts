import { prisma } from '../config/db.js';

async function checkPipelineStatus() {
  try {
    console.log('🔍 Checking for Pipeline LeadStatus...\n');
    
    const pipelineStatus = await prisma.leadStatus.findFirst({
      where: {
        name: {
          equals: 'Pipeline',
          mode: 'insensitive'
        }
      }
    });

    if (pipelineStatus) {
      console.log('✅ Pipeline LeadStatus found:');
      console.log(`   ID: ${pipelineStatus.id}`);
      console.log(`   Name: ${pipelineStatus.name}`);
      console.log(`   Is Default: ${pipelineStatus.isDefault}`);
      console.log(`   Color: ${pipelineStatus.color}`);
      console.log(`   Order Index: ${pipelineStatus.orderIndex}`);
    } else {
      console.log('❌ Pipeline LeadStatus NOT found!');
      console.log('\nCreating Pipeline LeadStatus...');
      
      const created = await prisma.leadStatus.create({
        data: {
          name: 'Pipeline',
          isDefault: true,
          color: '#3b82f6',
          orderIndex: 0
        }
      });
      
      console.log('✅ Pipeline LeadStatus created:');
      console.log(`   ID: ${created.id}`);
      console.log(`   Name: ${created.name}`);
    }

    // Show all lead statuses
    console.log('\n📋 All Lead Statuses:');
    const allStatuses = await prisma.leadStatus.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    
    allStatuses.forEach(status => {
      console.log(`   ${status.isDefault ? '⭐' : '  '} ${status.name} (${status.color})`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkPipelineStatus()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

