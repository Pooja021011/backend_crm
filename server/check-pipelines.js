import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPipelines() {
  try {
    const pipelines = await prisma.pipelineDefinition.findMany({
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    console.log(`✅ Found ${pipelines.length} pipelines:`);
    
    pipelines.forEach(pipeline => {
      console.log(`\n📋 ${pipeline.name} (${pipeline.key}):`);
      pipeline.stages.forEach((stage, index) => {
        console.log(`  ${index + 1}. ${stage.name} (${stage.color})`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPipelines();
