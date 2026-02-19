import { prisma } from './src/config/db.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

async function debugGraphLeads() {
  console.log('🔍 Debugging Graph Lead Count...\n');
  
  try {
    // Replicate the exact logic from getLeadDealFlowLast12Months
    const end = dayjs.utc().endOf('month');
    const start = end.subtract(11, 'month').startOf('month');
    
    console.log('📅 Date Range:');
    console.log(`   Start: ${start.format('YYYY-MM-DD HH:mm:ss')} UTC`);
    console.log(`   End: ${end.format('YYYY-MM-DD HH:mm:ss')} UTC`);
    console.log(`   Current Date: ${dayjs.utc().format('YYYY-MM-DD HH:mm:ss')} UTC\n`);
    
    // Get all leads in this range (no userId filter for now)
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: start.toDate(), lte: end.toDate() },
      },
      select: {
        id: true,
        createdAt: true,
        leadType: true,
        pipelineStage: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📊 Total Leads in Range: ${leads.length}`);
    console.log('\n📋 Lead Details:');
    leads.forEach((lead, idx) => {
      const leadDate = dayjs.utc(lead.createdAt);
      const monthName = leadDate.format('MMM YYYY');
      const leadMonth = leadDate.startOf('month');
      const idx_calc = leadMonth.diff(start, 'month');
      
      console.log(`   ${idx + 1}. Lead ID: ${lead.id}`);
      console.log(`      Created: ${leadDate.format('YYYY-MM-DD HH:mm:ss')} UTC`);
      console.log(`      Month: ${monthName}`);
      console.log(`      Month Index: ${idx_calc}`);
      console.log(`      Type: ${lead.leadType}`);
      console.log(`      Stage: ${lead.pipelineStage?.name || 'No Stage'}`);
      console.log('');
    });
    
    // Group by month like the graph does
    const months: Record<string, number> = {};
    for (const lead of leads) {
      const leadMonth = dayjs.utc(lead.createdAt).startOf('month');
      const monthKey = leadMonth.format('MMM');
      months[monthKey] = (months[monthKey] || 0) + 1;
    }
    
    console.log('📊 Leads per Month:');
    Object.entries(months).sort((a, b) => {
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]);
    }).forEach(([month, count]) => {
      console.log(`   ${month}: ${count} leads`);
    });
    
    // Check February specifically
    const febStart = dayjs.utc('2026-02-01').startOf('month');
    const febEnd = dayjs.utc('2026-02-01').endOf('month');
    const febLeads = leads.filter(l => {
      const leadDate = dayjs.utc(l.createdAt);
      return leadDate.isSameOrAfter(febStart) && leadDate.isSameOrBefore(febEnd);
    });
    
    console.log(`\n📊 February 2026 Leads: ${febLeads.length}`);
    febLeads.forEach((lead, idx) => {
      console.log(`   ${idx + 1}. ${dayjs.utc(lead.createdAt).format('YYYY-MM-DD HH:mm:ss')} UTC - ${lead.leadType} - ${lead.pipelineStage?.name || 'No Stage'}`);
    });
    
    // Check if any leads are outside the range
    const allLeads = await prisma.lead.findMany({
      select: {
        id: true,
        createdAt: true,
        leadType: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    const outsideRange = allLeads.filter(l => {
      const leadDate = dayjs.utc(l.createdAt);
      return leadDate.isBefore(start) || leadDate.isAfter(end);
    });
    
    console.log(`\n📊 Leads Outside 12-Month Range: ${outsideRange.length}`);
    if (outsideRange.length > 0) {
      outsideRange.forEach((lead, idx) => {
        console.log(`   ${idx + 1}. ${dayjs.utc(lead.createdAt).format('YYYY-MM-DD HH:mm:ss')} UTC - ${lead.leadType}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debugGraphLeads();

