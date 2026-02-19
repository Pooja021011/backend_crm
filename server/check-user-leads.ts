import { prisma } from './src/config/db.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

async function checkUserLeads() {
  console.log('🔍 Checking which leads belong to which users...\n');
  
  try {
    const end = dayjs.utc().endOf('month');
    const start = end.subtract(11, 'month').startOf('month');
    
    // Get all leads in range
    const allLeads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: start.toDate(), lte: end.toDate() },
      },
      select: {
        id: true,
        createdAt: true,
        createdById: true,
        leadType: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📊 Total Leads in Range: ${allLeads.length}\n`);
    
    // Group by createdById
    const byUser: Record<string, any[]> = {};
    allLeads.forEach(lead => {
      const userId = lead.createdById || 'null';
      if (!byUser[userId]) {
        byUser[userId] = [];
      }
      byUser[userId].push(lead);
    });
    
    console.log('📊 Leads by User:');
    for (const [userId, leads] of Object.entries(byUser)) {
      const user = userId !== 'null' ? await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true }
      }) : null;
      
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown/System';
      console.log(`\n   ${userName} (${userId === 'null' ? 'No Creator' : userId}): ${leads.length} leads`);
      leads.forEach((lead, idx) => {
        console.log(`      ${idx + 1}. ${dayjs.utc(lead.createdAt).format('YYYY-MM-DD')} - ${lead.leadType}`);
      });
    }
    
    // Check February specifically
    const febStart = dayjs.utc('2026-02-01').startOf('month');
    const febEnd = dayjs.utc('2026-02-01').endOf('month');
    const febLeads = allLeads.filter(l => {
      const leadDate = dayjs.utc(l.createdAt);
      return leadDate.isSameOrAfter(febStart) && leadDate.isSameOrBefore(febEnd);
    });
    
    console.log(`\n📊 February 2026 Leads: ${febLeads.length}`);
    const febByUser: Record<string, any[]> = {};
    febLeads.forEach(lead => {
      const userId = lead.createdById || 'null';
      if (!febByUser[userId]) {
        febByUser[userId] = [];
      }
      febByUser[userId].push(lead);
    });
    
    for (const [userId, leads] of Object.entries(febByUser)) {
      const user = userId !== 'null' ? await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true }
      }) : null;
      
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown/System';
      console.log(`   ${userName}: ${leads.length} leads`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserLeads();

