import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('📢 Testing Event-based Notifications System...\n');
    
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
    
    // Test 1: Create a NEW_CONTRACT notification
    console.log('\n🏠 Creating NEW_CONTRACT notification...');
    const contractNotification = await prisma.notification.create({
      data: {
        type: 'NEW_CONTRACT',
        title: 'New Contract Created',
        message: 'A new contract for 123 Test Street has been created and needs review',
        priority: 'HIGH',
        targetRoles: ['MANAGER', 'TC'],
        triggeredBy: adminUser.id,
        data: {
          address: '123 Test Street, Charlotte, NC',
          contractAmount: 150000,
          test: true
        }
      }
    });
    console.log('✅ Contract notification created:', contractNotification.id);
    
    // Test 2: Create a NEW_LEAD notification
    console.log('\n🎯 Creating NEW_LEAD notification...');
    const leadNotification = await prisma.notification.create({
      data: {
        type: 'NEW_LEAD',
        title: 'New Seller Lead',
        message: 'A new seller lead has been added and requires immediate attention',
        priority: 'MEDIUM',
        targetRoles: ['ACQ'],
        triggeredBy: adminUser.id,
        data: {
          leadType: 'SELLER',
          address: '456 Oak Avenue, Raleigh, NC',
          test: true
        }
      }
    });
    console.log('✅ Lead notification created:', leadNotification.id);
    
    // Test 3: Create a NEW_DEAL_ASSIGNED notification
    console.log('\n💼 Creating NEW_DEAL_ASSIGNED notification...');
    const dealNotification = await prisma.notification.create({
      data: {
        type: 'NEW_DEAL_ASSIGNED',
        title: 'Deal Assigned to You',
        message: 'A new deal has been assigned to you for follow-up',
        priority: 'MEDIUM',
        targetRoles: ['DISP'],
        targetUserId: adminUser.id, // Also target specific user
        triggeredBy: adminUser.id,
        data: {
          dealValue: 200000,
          assignedTo: `${adminUser.firstName} ${adminUser.lastName}`,
          test: true
        }
      }
    });
    console.log('✅ Deal assignment notification created:', dealNotification.id);
    
    // Test 4: Get user notifications
    console.log('\n📋 Fetching user notifications...');
    const userNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetUserId: adminUser.id },
          { targetRoles: { hasSome: adminUser.roles.map(r => r.role.name) } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    console.log(`📊 Found ${userNotifications.length} notifications for user`);
    
    // Test 5: Get unread count
    console.log('\n🔢 Getting unread count...');
    const unreadCount = await prisma.notification.count({
      where: {
        isRead: false,
        OR: [
          { targetUserId: adminUser.id },
          { targetRoles: { hasSome: adminUser.roles.map(r => r.role.name) } }
        ]
      }
    });
    console.log(`🔔 Unread notifications: ${unreadCount}`);
    
    console.log('\n✅ All notification tests completed successfully!');
    console.log('\n📱 Frontend Testing:');
    console.log('1. Login to the app: admin@admin.com / Admin@123#');
    console.log('2. Go to /inbox');
    console.log('3. Click on "Reminders" tab');
    console.log('4. You should see the test notifications with 📢 icons');
    console.log('5. Notifications should have priority badges and colors');
    
  } catch (error) {
    console.error('❌ Error testing notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
