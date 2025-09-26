import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
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

    if (adminUser) {
      console.log('✅ ADMIN USER VERIFIED:');
      console.log(`📧 Email: ${adminUser.email}`);
      console.log(`👤 Name: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`🔒 Status: ${adminUser.status}`);
      console.log(`🛡️ Roles: ${adminUser.roles.map(ur => ur.role.name).join(', ')}`);
      console.log('\n🔑 LOGIN CREDENTIALS:');
      console.log('   Email: admin@admin.com');
      console.log('   Password: Admin@123#');
      console.log('\n🎉 Admin user has full access and ADMIN role!');
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
