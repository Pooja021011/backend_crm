import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAdmin() {
  try {
    console.log('🔍 Checking admin user configuration...\n');

    // Get admin user with roles
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
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ ADMIN USER FOUND:');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`👤 Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`🆔 ID: ${adminUser.id}`);
    console.log(`🔒 Status: ${adminUser.status}`);
    console.log(`📅 Created: ${adminUser.createdAt}`);
    console.log(`🛡️ Roles: ${adminUser.roles.map(ur => ur.role.name).join(', ')}`);
    
    // Check if user has ADMIN role
    const hasAdminRole = adminUser.roles.some(ur => ur.role.name === 'ADMIN');
    
    if (hasAdminRole) {
      console.log('\n🎉 SUCCESS: User has ADMIN role and full access!');
      console.log('\n🔑 LOGIN CREDENTIALS:');
      console.log('   Email: admin@admin.com');
      console.log('   Password: Admin@123#');
    } else {
      console.log('\n❌ WARNING: User does not have ADMIN role!');
    }

    // Check all available roles
    console.log('\n📋 ALL AVAILABLE ROLES:');
    const allRoles = await prisma.role.findMany();
    allRoles.forEach(role => {
      console.log(`   - ${role.name}`);
    });

  } catch (error) {
    console.error('❌ Error verifying admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdmin();
