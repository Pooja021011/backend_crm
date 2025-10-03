/**
 * Script to automatically set stage permissions based on pipeline
 * 
 * This script assigns role permissions to all existing stages:
 * - ACQUISITIONS pipeline stages → ACQ role
 * - DISPOSITIONS pipeline stages → DISP role
 * - TRANSACTION pipeline stages → TC role
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateAllStagePermissions() {
  try {
    console.log('🔧 Updating stage permissions for all pipelines...\n');

    const pipelineRoleMap = {
      'ACQUISITIONS': 'ACQ',
      'DISPOSITIONS': 'DISP',
      'TRANSACTION': 'TC'
    };

    // Get all pipelines with their stages
    const pipelines = await prisma.pipelineDefinition.findMany({
      where: { active: true },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    for (const pipeline of pipelines) {
      const roleName = pipelineRoleMap[pipeline.key];
      
      if (!roleName) {
        console.log(`⚠️  Skipping ${pipeline.name} - no role mapping`);
        continue;
      }

      console.log(`\n📊 ${pipeline.name} (${pipeline.key}) → ${roleName} role`);
      console.log(`   Found ${pipeline.stages.length} stages\n`);

      for (const stage of pipeline.stages) {
        // Clear existing permissions for this stage
        await prisma.stageRolePermission.deleteMany({
          where: { stageId: stage.id }
        });

        // Create new permission
        await prisma.stageRolePermission.create({
          data: {
            stageId: stage.id,
            roleName: roleName
          }
        });

        console.log(`   ✅ ${stage.name} → visible to ${roleName}`);
      }
    }

    console.log('\n✨ All stage permissions updated successfully!');
    console.log('\nSummary:');
    console.log('  • ACQUISITIONS stages → visible to ACQ agents');
    console.log('  • DISPOSITIONS stages → visible to DISP agents');
    console.log('  • TRANSACTION stages → visible to TC agents');
    console.log('  • ADMIN and MANAGER → can see all stages\n');

  } catch (error) {
    console.error('❌ Error updating stage permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllStagePermissions();

