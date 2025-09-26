import { PrismaClient } from '@prisma/client';
import { RoleName } from '@prisma/client';
import { cryptoUtil } from './src/utils/crypto.js';

const prisma = new PrismaClient();

async function setupAdmin() {
  try {
    console.log('🔍 Checking admin user setup...');

    // Check if admin role exists
    let adminRole = await prisma.role.findUnique({
      where: { name: RoleName.ADMIN }
    });

    if (!adminRole) {
      console.log('📝 Creating ADMIN role...');
      adminRole = await prisma.role.create({
        data: { name: RoleName.ADMIN }
      });
      console.log('✅ ADMIN role created');
    } else {
      console.log('✅ ADMIN role exists');
    }

    // Check if admin user exists
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    const passwordHash = await cryptoUtil.hashPassword('Admin@123#');

    if (!adminUser) {
      console.log('📝 Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@admin.com',
          firstName: 'Admin',
          lastName: 'User',
          passwordHash: passwordHash,
          status: 'active',
          roles: {
            create: {
              role: {
                connect: { name: RoleName.ADMIN }
              }
            }
          }
        },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });
      console.log('✅ Admin user created successfully');
    } else {
      console.log('👤 Admin user exists, checking configuration...');
      
      // Update password and ensure active status
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          passwordHash: passwordHash,
          status: 'active',
          firstName: 'Admin',
          lastName: 'User'
        }
      });
      console.log('✅ Admin user updated with new password');

      // Check if user has admin role
      const hasAdminRole = adminUser.roles.some(ur => ur.role.name === RoleName.ADMIN);
      
      if (!hasAdminRole) {
        console.log('📝 Adding ADMIN role to user...');
        await prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id
          }
        });
        console.log('✅ ADMIN role assigned to user');
      } else {
        console.log('✅ User already has ADMIN role');
      }
    }

    // Final verification
    const finalUser = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('\n🎯 FINAL ADMIN USER SETUP:');
    console.log(`📧 Email: ${finalUser.email}`);
    console.log(`👤 Name: ${finalUser.firstName} ${finalUser.lastName}`);
    console.log(`🔒 Status: ${finalUser.status}`);
    console.log(`🛡️ Roles: ${finalUser.roles.map(ur => ur.role.name).join(', ')}`);
    console.log(`🔑 Password: Admin@123#`);
    
    console.log('\n✅ Admin user setup completed successfully!');
    console.log('🚀 You can now login with:');
    console.log('   Email: admin@admin.com');
    console.log('   Password: Admin@123#');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
