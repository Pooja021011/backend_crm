import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const stageMapping = {
  'New Lead': 'e2fb08ba-4076-4c44-86d9-ccb43ff2a78a',
  'No Contact Made': '0bd058b3-5836-4b7e-b1c0-9d8fc00a38a7',
  'Contact Made': 'f2443bbb-3a00-49ee-8be4-b4e6e2ea84bf',
  'Appointment Set': '4806cc62-6097-433b-b463-746f8d60f2b2',
  'Appointment Complete': 'b8cd4343-90be-484e-97e2-4a5ccc549a61',
  'Due Diligence Complete': '18826c99-8a41-4eb1-ae77-ef10e53b0964',
  'Offer Made': '9db14762-5eac-4f2b-aac5-37350c5a711c',
  'Contract Sent': 'f65aabfe-b073-4e58-9ae7-8ab87b42a138',
  'Under Contract': '37262a39-4a92-48bf-a7f3-712912945067'
};

async function fixLeads() {
  try {
    console.log('🔍 Finding leads with null pipelineStageId...');
    
    const leadsToFix = await prisma.lead.findMany({
      where: {
        pipelineStageId: null
      },
      select: {
        id: true,
        address: {
          select: {
            street: true,
            city: true,
            state: true
          }
        },
        pipelineStage: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📋 Found ${leadsToFix.length} leads to fix`);

    for (const lead of leadsToFix) {
      // Get the stage name from the lead's current stage or default to 'New Lead'
      let stageName = lead.pipelineStage?.name || 'New Lead';
      
      // Find the corresponding stage ID
      const stageId = stageMapping[stageName];
      
      if (stageId) {
        console.log(`🔧 Fixing lead ${lead.id} - ${lead.address?.street}, ${lead.address?.city} -> ${stageName}`);
        
        await prisma.lead.update({
          where: { id: lead.id },
          data: { pipelineStageId: stageId }
        });
      } else {
        console.log(`❌ Unknown stage name: ${stageName} for lead ${lead.id}`);
      }
    }

    console.log('✅ All leads fixed successfully!');
    
    // Verify the fix
    const remainingNullLeads = await prisma.lead.count({
      where: {
        pipelineStageId: null
      }
    });
    
    console.log(`🎯 Remaining leads with null pipelineStageId: ${remainingNullLeads}`);
    
  } catch (error) {
    console.error('❌ Error fixing leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLeads();
