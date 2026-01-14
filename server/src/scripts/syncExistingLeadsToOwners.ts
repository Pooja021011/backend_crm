import { prisma } from '../config/db.js';

/**
 * Migration script to sync existing seller/buyer/vendor contact info to lead owners
 * Run this once to populate lead owners for existing leads
 */
async function syncExistingLeadsToOwners() {
  console.log('🔄 Starting sync of existing leads to owners...');
  
  try {
    // Get all leads that don't have owners yet
    const leadsWithoutOwners = await prisma.lead.findMany({
      where: {
        owners: {
          none: {}
        }
      },
      include: {
        seller: true,
        buyer: true,
        vendor: true,
        owners: true
      }
    });

    console.log(`📊 Found ${leadsWithoutOwners.length} leads without owners`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const lead of leadsWithoutOwners) {
      try {
        let contactData: { firstName: string; lastName: string; phone: string; email: string } | null = null;

        // Get contact data based on lead type
        if (lead.leadType === 'SELLER' && lead.seller) {
          contactData = {
            firstName: lead.seller.firstName,
            lastName: lead.seller.lastName,
            phone: lead.seller.phone,
            email: lead.seller.email
          };
        } else if (lead.leadType === 'BUYER' && lead.buyer) {
          contactData = {
            firstName: lead.buyer.firstName,
            lastName: lead.buyer.lastName,
            phone: lead.buyer.phone,
            email: lead.buyer.email
          };
        } else if (lead.leadType === 'VENDOR' && lead.vendor) {
          contactData = {
            firstName: lead.vendor.firstName,
            lastName: lead.vendor.lastName,
            phone: lead.vendor.phone,
            email: lead.vendor.email
          };
        }

        if (contactData) {
          // Create primary owner from contact data
          await prisma.leadOwner.create({
            data: {
              leadId: lead.id,
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              phone: contactData.phone,
              email: contactData.email,
              isPrimary: true,
              order: 0
            }
          });
          created++;
          console.log(`✅ Created owner for lead ${lead.id} (${contactData.firstName} ${contactData.lastName})`);
        } else {
          skipped++;
          console.log(`⚠️  Skipped lead ${lead.id} - no contact data found`);
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Error creating owner for lead ${lead.id}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${leadsWithoutOwners.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
syncExistingLeadsToOwners()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

