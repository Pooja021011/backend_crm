import { prisma } from './src/config/db.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

async function checkLeadCounts() {
  console.log('🔍 Checking Lead Count Discrepancies...\n');
  
  try {
    // 1. Total SELLER leads (what Leads page shows)
    const totalSellerLeads = await prisma.lead.count({
      where: { leadType: 'SELLER' }
    });
    console.log('📊 1. Leads Page (SELLER leads only):');
    console.log(`   Total SELLER Leads: ${totalSellerLeads}`);
    
    // 2. Total ALL leads (what might be showing in company overview)
    const totalAllLeads = await prisma.lead.count();
    console.log('\n📊 2. Company Overview (All Lead Types):');
    console.log(`   Total ALL Leads (SELLER + BUYER + VENDOR): ${totalAllLeads}`);
    
    const buyerLeads = await prisma.lead.count({ where: { leadType: 'BUYER' } });
    const vendorLeads = await prisma.lead.count({ where: { leadType: 'VENDOR' } });
    console.log(`   - SELLER: ${totalSellerLeads}`);
    console.log(`   - BUYER: ${buyerLeads}`);
    console.log(`   - VENDOR: ${vendorLeads}`);
    
    // 3. Leads created in February 2026 (for graph)
    const now = dayjs.utc();
    const febStart = dayjs.utc('2026-02-01').startOf('month');
    const febEnd = dayjs.utc('2026-02-01').endOf('month');
    
    const febLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: febStart.toDate(),
          lte: febEnd.toDate()
        }
      }
    });
    
    console.log('\n📊 3. Lead and Deal Flow Graph (February 2026):');
    console.log(`   Leads created in February: ${febLeads}`);
    console.log(`   Date Range: ${febStart.format('YYYY-MM-DD HH:mm:ss')} to ${febEnd.format('YYYY-MM-DD HH:mm:ss')} UTC`);
    
    // 4. Check last 12 months range
    const end = dayjs.utc().endOf('month');
    const start = end.subtract(11, 'month').startOf('month');
    
    const last12MonthsLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: start.toDate(),
          lte: end.toDate()
        }
      }
    });
    
    console.log('\n📊 4. Last 12 Months (for graph):');
    console.log(`   Total leads in last 12 months: ${last12MonthsLeads}`);
    console.log(`   Date Range: ${start.format('YYYY-MM-DD')} to ${end.format('YYYY-MM-DD')} UTC`);
    
    // 5. Check current month leads (for company overview "This Month")
    const currentMonthStart = now.startOf('month');
    const currentMonthEnd = now.endOf('month');
    
    const currentMonthLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: currentMonthStart.toDate(),
          lte: currentMonthEnd.toDate()
        }
      }
    });
    
    console.log('\n📊 5. Current Month (for Company Overview "This Month"):');
    console.log(`   Leads created this month: ${currentMonthLeads}`);
    console.log(`   Date Range: ${currentMonthStart.format('YYYY-MM-DD HH:mm:ss')} to ${currentMonthEnd.format('YYYY-MM-DD HH:mm:ss')} UTC`);
    
    // 6. Check marketing breakdown (might be showing 12)
    const marketingLeads = await prisma.lead.findMany({
      include: {
        pipelineStage: true
      }
    });
    
    console.log('\n📊 6. Marketing Breakdown (All Leads):');
    console.log(`   Total leads for marketing breakdown: ${marketingLeads.length}`);
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('─────────────────────────────────');
    console.log(`   Leads Page (SELLER only): ${totalSellerLeads}`);
    console.log(`   Company Overview (All types): ${totalAllLeads}`);
    console.log(`   Current Month: ${currentMonthLeads}`);
    console.log(`   February 2026: ${febLeads}`);
    console.log(`   Last 12 Months: ${last12MonthsLeads}`);
    console.log('─────────────────────────────────');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeadCounts();

