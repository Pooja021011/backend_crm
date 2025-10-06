import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migrate existing leads' string status to LeadStatus relation
 * This script will:
 * 1. Find all unique status values in Lead.status field
 * 2. Match them with existing LeadStatus records
 * 3. Update leads with leadStatusId
 */
async function migrateLegacyStatuses() {
  console.log("🔄 Starting Lead Status Migration...\n");

  try {
    // 1. Get all leads with string status
    const leadsWithStatus = await prisma.lead.findMany({
      where: {
        status: { not: null },
        leadStatusId: null // Only migrate leads that haven't been migrated yet
      },
      select: {
        id: true,
        status: true,
        leadType: true
      }
    });

    console.log(`📊 Found ${leadsWithStatus.length} leads with legacy status\n`);

    if (leadsWithStatus.length === 0) {
      console.log("✅ No leads to migrate!");
      return;
    }

    // 2. Get all unique status values
    const uniqueStatuses = [...new Set(leadsWithStatus.map(l => l.status).filter(Boolean))];
    console.log(`📝 Unique status values found: ${uniqueStatuses.join(', ')}\n`);

    // 3. Get all LeadStatus records
    const allLeadStatuses = await prisma.leadStatus.findMany();
    console.log(`📋 Available LeadStatus records: ${allLeadStatuses.length}\n`);

    // 4. Create mapping
    const statusMapping = new Map();
    
    for (const statusStr of uniqueStatuses) {
      // Try to find exact match (case-insensitive)
      let matchedStatus = allLeadStatuses.find(
        ls => ls.name.toLowerCase() === statusStr.toLowerCase()
      );

      // If no exact match, try partial match
      if (!matchedStatus) {
        matchedStatus = allLeadStatuses.find(
          ls => ls.name.toLowerCase().includes(statusStr.toLowerCase()) ||
                statusStr.toLowerCase().includes(ls.name.toLowerCase())
        );
      }

      // If still no match, use "New Lead" as default
      if (!matchedStatus) {
        matchedStatus = allLeadStatuses.find(ls => ls.name === "New Lead");
      }

      if (matchedStatus) {
        statusMapping.set(statusStr, matchedStatus);
        console.log(`   "${statusStr}" → "${matchedStatus.name}"`);
      }
    }

    console.log("\n🔧 Starting migration...\n");

    // 5. Update leads
    let migrated = 0;
    let skipped = 0;

    for (const lead of leadsWithStatus) {
      if (!lead.status) {
        skipped++;
        continue;
      }

      const targetStatus = statusMapping.get(lead.status);
      
      if (targetStatus) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { leadStatusId: targetStatus.id }
        });
        migrated++;

        if (migrated % 10 === 0) {
          console.log(`   Migrated ${migrated}/${leadsWithStatus.length} leads...`);
        }
      } else {
        console.log(`   ⚠️  Couldn't find mapping for status: "${lead.status}"`);
        skipped++;
      }
    }

    console.log(`\n✨ Migration completed!`);
    console.log(`   ✅ Migrated: ${migrated} leads`);
    console.log(`   ⏭️  Skipped: ${skipped} leads\n`);

    // 6. Show summary
    console.log("📊 Status Distribution After Migration:\n");
    
    const statusCounts = await prisma.leadStatus.findMany({
      include: {
        _count: {
          select: { leads: true }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    statusCounts.forEach(status => {
      const bar = '█'.repeat(Math.min(status._count.leads, 50));
      console.log(`   ${status.name.padEnd(20)} ${bar} ${status._count.leads}`);
    });

  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  }
}

// Run the migration
migrateLegacyStatuses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
