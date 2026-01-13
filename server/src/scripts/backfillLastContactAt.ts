import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

/**
 * Backfill lastContactAt for all leads based on their existing communications
 * 
 * This script finds the most recent ACTUAL contact for each lead:
 * - INBOUND: All emails, SMS, calls
 * - OUTBOUND: Answered calls (status='completed'), sent SMS, sent emails
 * - EXCLUDES: Unanswered/missed calls, general updates
 */
async function backfillLastContactAt() {
  try {
    logger.info('Starting lastContactAt backfill...');
    
    // Get all leads
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        communications: {
          orderBy: { occurredAt: 'desc' },
          select: {
            id: true,
            type: true,
            direction: true,
            occurredAt: true,
            metadata: true,
          }
        }
      }
    });

    logger.info(`Found ${leads.length} leads to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;

    for (const lead of leads) {
      // Find the most recent valid contact communication
      let lastContactAt: Date | null = null;

      for (const comm of lead.communications) {
        const isInbound = comm.direction === 'INBOUND';
        const isOutbound = comm.direction === 'OUTBOUND';
        
        if (isInbound) {
          // All inbound communications count as contact
          lastContactAt = comm.occurredAt;
          break;
        } else if (isOutbound) {
          // For outbound, check the type
          if (comm.type === 'CALL') {
            // Only count completed (answered) calls
            const status = (comm.metadata as any)?.status?.toLowerCase();
            if (status === 'completed') {
              lastContactAt = comm.occurredAt;
              break;
            }
            // Skip missed/unanswered calls
          } else if (comm.type === 'SMS' || comm.type === 'EMAIL') {
            // Sent SMS and emails count as contact
            lastContactAt = comm.occurredAt;
            break;
          }
        }
      }

      // Update the lead if we found a valid lastContactAt
      if (lastContactAt) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { lastContactAt }
        });
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          logger.info(`Processed ${updatedCount} leads...`);
        }
      } else {
        skippedCount++;
      }
    }

    logger.info('Backfill complete!', {
      totalLeads: leads.length,
      updated: updatedCount,
      skipped: skippedCount
    });

    console.log('\n✅ Backfill Summary:');
    console.log(`   Total Leads: ${leads.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (no valid contact): ${skippedCount}`);

  } catch (error: any) {
    logger.error('Error during backfill', { error: error.message, stack: error.stack });
    console.error('\n❌ Backfill failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillLastContactAt()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

