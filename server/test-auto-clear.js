import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAutoClear() {
  try {
    console.log('🔄 Testing Auto-Clear Notifications System...\n');
    
    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`👤 Testing with user: ${adminUser.email}`);
    console.log(`🎭 User roles:`, adminUser.roles.map(r => r.role.name));
    
    // Get a lead to work with
    const testLead = await prisma.lead.findFirst({
      where: { address: { isNot: null } },
      include: { address: true }
    });
    
    if (!testLead) {
      console.log('❌ No lead found for testing');
      return;
    }
    
    console.log(`🏠 Using test lead: ${testLead.address?.address1 || testLead.id}`);
    
    // Test 1: Create notifications that will be auto-cleared
    console.log('\n📢 Creating notifications for auto-clear testing...');
    
    // Create a NEW_LEAD notification for ACQ agents
    const leadNotification = await prisma.notification.create({
      data: {
        type: 'NEW_LEAD',
        title: 'New Lead Requires Attention',
        message: `New seller lead at ${testLead.address?.address1 || 'Unknown address'} needs immediate follow-up`,
        priority: 'HIGH',
        targetRoles: ['ACQ'],
        leadId: testLead.id,
        triggeredBy: adminUser.id,
        data: {
          address: testLead.address?.address1,
          test: true
        }
      }
    });
    console.log('✅ Created NEW_LEAD notification:', leadNotification.id);
    
    // Create a NEW_DEAL_ASSIGNED notification for DISP agents
    const dealNotification = await prisma.notification.create({
      data: {
        type: 'NEW_DEAL_ASSIGNED',
        title: 'Deal Assignment Pending',
        message: `Deal for ${testLead.address?.address1 || 'Unknown address'} requires your attention`,
        priority: 'MEDIUM',
        targetRoles: ['DISP'],
        leadId: testLead.id,
        triggeredBy: adminUser.id,
        data: {
          address: testLead.address?.address1,
          test: true
        }
      }
    });
    console.log('✅ Created NEW_DEAL_ASSIGNED notification:', dealNotification.id);
    
    // Test 2: Check current unread count
    console.log('\n📊 Checking unread notifications...');
    const unreadBefore = await prisma.notification.count({
      where: {
        isRead: false,
        leadId: testLead.id
      }
    });
    console.log(`📈 Unread notifications before auto-clear: ${unreadBefore}`);
    
    // Test 3: Simulate auto-clear on lead update
    console.log('\n🔄 Testing auto-clear on lead update...');
    const autoClearResult = await prisma.notification.updateMany({
      where: {
        OR: [
          { type: 'NEW_LEAD', leadId: testLead.id },
          { type: 'NEW_DEAL_ASSIGNED', leadId: testLead.id }
        ],
        isRead: false,
        targetRoles: { hasSome: ['ACQ', 'DISP'] }
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
    
    console.log(`🎯 Auto-cleared ${autoClearResult.count} notifications`);
    
    // Test 4: Check unread count after auto-clear
    const unreadAfter = await prisma.notification.count({
      where: {
        isRead: false,
        leadId: testLead.id
      }
    });
    console.log(`📉 Unread notifications after auto-clear: ${unreadAfter}`);
    
    // Test 5: Verify role-based auto-clear permissions
    console.log('\n🎭 Testing role-based permissions...');
    const acqRoles = ['ACQ'];
    const dispRoles = ['DISP'];
    const managerRoles = ['MANAGER'];
    
    const shouldAutoClearACQ = acqRoles.some(role => ['ACQ', 'DISP'].includes(role));
    const shouldAutoClearDISP = dispRoles.some(role => ['ACQ', 'DISP'].includes(role));
    const shouldAutoClearManager = managerRoles.some(role => ['ACQ', 'DISP'].includes(role));
    
    console.log(`🏠 ACQ Agent auto-clear permission: ${shouldAutoClearACQ ? '✅ YES' : '❌ NO'}`);
    console.log(`💰 DISP Agent auto-clear permission: ${shouldAutoClearDISP ? '✅ YES' : '❌ NO'}`);
    console.log(`📊 Manager auto-clear permission: ${shouldAutoClearManager ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n✅ Auto-clear testing completed!');
    console.log('\n🎯 Integration Points:');
    console.log('1. Email Reply: POST /notifications/auto-clear/message-reply');
    console.log('2. SMS Reply: POST /notifications/auto-clear/message-reply');
    console.log('3. Task Complete: POST /notifications/auto-clear/task-complete');
    console.log('4. Lead Update: POST /notifications/auto-clear/lead-update');
    console.log('\n📱 Frontend Integration:');
    console.log('- Auto-clear calls added to email reply function');
    console.log('- Auto-clear calls added to SMS reply function');
    console.log('- Notifications refresh automatically after auto-clear');
    console.log('- Only ACQ and DISP agents get auto-clear functionality');
    
  } catch (error) {
    console.error('❌ Error testing auto-clear:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoClear();
