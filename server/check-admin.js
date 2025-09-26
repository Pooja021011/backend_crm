import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (admin) {
      console.log('✅ Admin user found:');
      console.log(`Email: ${admin.email}`);
      console.log(`Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`Status: ${admin.status}`);
      console.log(`Roles: ${admin.roles.map(r => r.role.name).join(', ')}`);
    } else {
      console.log('❌ Admin user not found with email: admin@admin.com');
      
      // Check if there are any users
      const users = await prisma.user.findMany({
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });
      
      console.log(`\nFound ${users.length} users in database:`);
      users.forEach(user => {
        console.log(`- ${user.email} (${user.firstName} ${user.lastName}) - Roles: ${user.roles.map(r => r.role.name).join(', ')}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
