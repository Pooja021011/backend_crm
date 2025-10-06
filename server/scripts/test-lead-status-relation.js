import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLeadStatusRelation() {
  console.log("🔍 Testing Lead-LeadStatus Relation...\n");

  try {
    // 1. Get a lead status
    const status = await prisma.leadStatus.findFirst({
      where: { name: "New Lead" }
    });

    if (!status) {
      console.log("❌ No lead status found. Run seed-lead-statuses.js first.");
      return;
    }

    console.log("✅ Found Lead Status:", status.name);
    console.log(`   ID: ${status.id}`);
    console.log(`   Color: ${status.color}\n`);

    // 2. Count leads with this status
    const leadsCount = await prisma.lead.count({
      where: { leadStatusId: status.id }
    });

    console.log(`📊 Leads with "${status.name}" status: ${leadsCount}\n`);

    // 3. Get all lead statuses with lead counts
    console.log("📋 All Lead Statuses with Counts:\n");
    const allStatuses = await prisma.leadStatus.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    allStatuses.forEach(s => {
      console.log(`   ${s.name.padEnd(20)} - ${s._count.leads} leads`);
    });

    // 4. Test creating a lead with status
    console.log("\n🔧 Testing Lead Creation with Status...");
    
    const testLead = await prisma.lead.findFirst({
      where: { 
        leadType: 'SELLER'
      }
    });

    if (testLead) {
      // Update first lead with the status
      const updated = await prisma.lead.update({
        where: { id: testLead.id },
        data: { leadStatusId: status.id },
        include: {
          leadStatus: true
        }
      });

      console.log(`✅ Updated Lead: ${updated.id}`);
      console.log(`   Status: ${updated.leadStatus?.name || 'None'}`);
      console.log(`   Color: ${updated.leadStatus?.color || 'N/A'}\n`);
    }

    // 5. Query leads with status included
    console.log("🔍 Querying Leads with Status Relation...");
    const leadsWithStatus = await prisma.lead.findMany({
      take: 5,
      where: {
        leadStatusId: { not: null }
      },
      include: {
        leadStatus: true,
        seller: true,
        buyer: true
      }
    });

    console.log(`\n✅ Found ${leadsWithStatus.length} leads with status:\n`);
    leadsWithStatus.forEach(lead => {
      const name = lead.seller?.firstName || lead.buyer?.firstName || 'Unknown';
      console.log(`   - ${lead.leadType} Lead: ${name}`);
      console.log(`     Status: ${lead.leadStatus?.name} (${lead.leadStatus?.color})`);
    });

    console.log("\n✨ Relation test completed successfully!");

  } catch (error) {
    console.error("❌ Error testing relation:", error);
    throw error;
  }
}

// Run the test
testLeadStatusRelation()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
