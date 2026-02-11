import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFebruaryUnderContract() {
  try {
    // February 2026 date range
    const febStart = new Date('2026-02-01T00:00:00.000Z');
    const febEnd = new Date('2026-03-01T00:00:00.000Z'); // March 1st (exclusive)

    console.log('Checking leads that entered "Under Contract" in February 2026...\n');
    console.log(`Date Range: ${febStart.toISOString()} to ${febEnd.toISOString()}\n`);

    // Query StageHistory for entries where:
    // 1. toStage.name includes "under contract" (but not "contract sent", "offer", "pending")
    // 2. toStage.pipeline.key = "ACQUISITIONS"
    // 3. changedAt is in February 2026
    const stageHistoryEntries = await prisma.stageHistory.findMany({
      where: {
        changedAt: {
          gte: febStart,
          lt: febEnd,
        },
        toStage: {
          pipeline: {
            key: 'ACQUISITIONS',
          },
          name: {
            contains: 'under contract',
            mode: 'insensitive',
          },
        },
      },
      select: {
        id: true,
        leadId: true,
        changedAt: true,
        toStage: {
          select: {
            name: true,
            pipeline: {
              select: {
                key: true,
              },
            },
          },
        },
        lead: {
          select: {
            id: true,
            leadType: true,
          },
        },
      },
      orderBy: {
        changedAt: 'asc', // Ascending order by date
      },
    });

    // Filter out "Contract Sent", "Offer", "Pending" variations
    const underContractEntries = stageHistoryEntries.filter(entry => {
      const stageName = (entry.toStage?.name || '').toLowerCase();
      return (
        stageName.includes('under contract') &&
        !stageName.includes('contract sent') &&
        !stageName.includes('offer') &&
        !stageName.includes('pending')
      );
    });

    // Remove duplicates - keep only the first entry per lead (oldest date)
    const uniqueLeads = new Map<string, typeof underContractEntries[0]>();
    for (const entry of underContractEntries) {
      if (!uniqueLeads.has(entry.leadId)) {
        uniqueLeads.set(entry.leadId, entry);
      }
    }

    const results = Array.from(uniqueLeads.values());

    console.log(`Total unique leads that entered "Under Contract" in February 2026: ${results.length}\n`);
    console.log('Lead ID | Date (UTC) | Stage Name');
    console.log('----------------------------------------');

    for (const entry of results) {
      const dateStr = entry.changedAt.toISOString();
      const stageName = entry.toStage?.name || 'Unknown';
      console.log(`${entry.leadId} | ${dateStr} | ${stageName}`);
    }

    console.log('\n----------------------------------------');
    console.log(`Total: ${results.length} leads\n`);

    // Also output as JSON for easy copy-paste
    const jsonOutput = results.map(entry => ({
      leadId: entry.leadId,
      date: entry.changedAt.toISOString(),
      stageName: entry.toStage?.name || 'Unknown',
    }));

    console.log('\nJSON Output:');
    console.log(JSON.stringify(jsonOutput, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFebruaryUnderContract();

