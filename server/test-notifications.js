/**
 * Test script to verify notifications are working
 * Run with: node test-notifications.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('🔍 Testing Notification System...\n');

    // Test 1: Check if notification types are supported
    console.log('📋 Test 1: Checking notification types in database...');
    const allNotifications = await prisma.notification.findMany({
      select: {
        type: true,
        title: true,
        createdAt: true,
        isRead: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`   Found ${allNotifications.length} recent notifications:`);
    allNotifications.forEach(n => {
      console.log(`   - ${n.type}: ${n.title} (${n.isRead ? 'Read' : 'Unread'})`);
    });

    // Test 2: Check SMS notifications
    console.log('\n📱 Test 2: Checking SMS notifications...');
    const smsNotifications = await prisma.notification.findMany({
      where: { type: 'NEW_SMS' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        lead: {
          select: {
            id: true,
            seller: { select: { firstName: true, lastName: true } },
            buyer: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (smsNotifications.length > 0) {
      console.log(`   ✅ Found ${smsNotifications.length} SMS notifications`);
      smsNotifications.forEach(n => {
        const leadName = n.lead?.seller 
          ? `${n.lead.seller.firstName} ${n.lead.seller.lastName}`
          : n.lead?.buyer 
          ? `${n.lead.buyer.firstName} ${n.lead.buyer.lastName}`
          : 'Unknown';
        console.log(`   - ${n.title} from ${leadName} at ${n.createdAt}`);
      });
    } else {
      console.log('   ⚠️  No SMS notifications found (this is normal if no SMS has been received)');
    }

    // Test 3: Check Call notifications
    console.log('\n📞 Test 3: Checking Call notifications...');
    const callNotifications = await prisma.notification.findMany({
      where: { 
        type: { in: ['NEW_CALL', 'MISSED_CALL'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        lead: {
          select: {
            id: true,
            seller: { select: { firstName: true, lastName: true } },
            buyer: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (callNotifications.length > 0) {
      console.log(`   ✅ Found ${callNotifications.length} Call notifications`);
      callNotifications.forEach(n => {
        const leadName = n.lead?.seller 
          ? `${n.lead.seller.firstName} ${n.lead.seller.lastName}`
          : n.lead?.buyer 
          ? `${n.lead.buyer.firstName} ${n.lead.buyer.lastName}`
          : 'Unknown';
        console.log(`   - ${n.type}: ${n.title} from ${leadName} at ${n.createdAt}`);
      });
    } else {
      console.log('   ⚠️  No Call notifications found (this is normal if no calls have been received)');
    }

    // Test 4: Check SMS communications
    console.log('\n💬 Test 4: Checking SMS communications...');
    const smsCommunications = await prisma.communication.findMany({
      where: { type: 'SMS' },
      orderBy: { occurredAt: 'desc' },
      take: 5,
      select: {
        id: true,
        direction: true,
        subject: true,
        body: true,
        occurredAt: true,
        lead: {
          select: {
            id: true,
            seller: { select: { firstName: true, lastName: true } },
            buyer: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (smsCommunications.length > 0) {
      console.log(`   ✅ Found ${smsCommunications.length} SMS communications`);
      smsCommunications.forEach(c => {
        const leadName = c.lead?.seller 
          ? `${c.lead.seller.firstName} ${c.lead.seller.lastName}`
          : c.lead?.buyer 
          ? `${c.lead.buyer.firstName} ${c.lead.buyer.lastName}`
          : 'Unknown';
        console.log(`   - ${c.direction}: ${c.subject} (${leadName}) at ${c.occurredAt}`);
      });
    } else {
      console.log('   ⚠️  No SMS communications found');
    }

    // Test 5: Check Call communications
    console.log('\n📞 Test 5: Checking Call communications...');
    const callCommunications = await prisma.communication.findMany({
      where: { type: 'CALL' },
      orderBy: { occurredAt: 'desc' },
      take: 5,
      select: {
        id: true,
        direction: true,
        subject: true,
        occurredAt: true,
        lead: {
          select: {
            id: true,
            seller: { select: { firstName: true, lastName: true } },
            buyer: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (callCommunications.length > 0) {
      console.log(`   ✅ Found ${callCommunications.length} Call communications`);
      callCommunications.forEach(c => {
        const leadName = c.lead?.seller 
          ? `${c.lead.seller.firstName} ${c.lead.seller.lastName}`
          : c.lead?.buyer 
          ? `${c.lead.buyer.firstName} ${c.lead.buyer.lastName}`
          : 'Unknown';
        console.log(`   - ${c.direction}: ${c.subject} (${leadName}) at ${c.occurredAt}`);
      });
    } else {
      console.log('   ⚠️  No Call communications found');
    }

    // Test 6: Count unread notifications by type
    console.log('\n📊 Test 6: Unread notification summary...');
    const unreadByType = await prisma.notification.groupBy({
      by: ['type'],
      where: { isRead: false },
      _count: { id: true }
    });

    if (unreadByType.length > 0) {
      console.log('   Unread notifications by type:');
      unreadByType.forEach(group => {
        console.log(`   - ${group.type}: ${group._count.id} unread`);
      });
    } else {
      console.log('   ✅ No unread notifications (all caught up!)');
    }

    console.log('\n✅ Notification system test complete!\n');

  } catch (error) {
    console.error('❌ Error testing notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();

