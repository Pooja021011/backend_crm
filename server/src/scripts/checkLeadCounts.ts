import { prisma } from '../config/db.js';

async function checkLeadCounts() {
  console.log('🔍 Checking lead counts in database...\n');
  
  try {
    // Count all leads by type
    const sellerCount = await prisma.lead.count({
      where: { leadType: 'SELLER' }
    });
    
    const buyerCount = await prisma.lead.count({
      where: { leadType: 'BUYER' }
    });
    
    const vendorCount = await prisma.lead.count({
      where: { leadType: 'VENDOR' }
    });
    
    const totalCount = await prisma.lead.count();
    
    console.log('📊 Lead Counts:');
    console.log('─────────────────────────────────');
    console.log(`   SELLER Leads: ${sellerCount}`);
    console.log(`   BUYER Leads:  ${buyerCount}`);
    console.log(`   VENDOR Leads: ${vendorCount}`);
    console.log('─────────────────────────────────');
    console.log(`   TOTAL Leads:  ${totalCount}`);
    console.log('');
    
    // Get sample of seller leads
    console.log('📋 Sample Seller Leads (first 10):');
    console.log('─────────────────────────────────');
    const sampleSellers = await prisma.lead.findMany({
      where: { leadType: 'SELLER' },
      take: 10,
      include: {
        address: true,
        seller: true,
        owners: {
          where: { isPrimary: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    sampleSellers.forEach((lead, index) => {
      const ownerName = lead.owners[0] 
        ? `${lead.owners[0].firstName} ${lead.owners[0].lastName}`
        : lead.seller 
          ? `${lead.seller.firstName} ${lead.seller.lastName}`
          : 'No name';
      const address = lead.address 
        ? `${lead.address.address1}, ${lead.address.city}`
        : 'No address';
      console.log(`   ${index + 1}. ${ownerName} - ${address}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking lead counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeadCounts()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

