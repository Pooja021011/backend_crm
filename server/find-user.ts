import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findUser() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'hardeep', mode: 'insensitive' } },
          { firstName: { contains: 'hardeep', mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    if (user) {
      console.log('\nUser Found:');
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Email: ${user.email}`);
      console.log(`Roles: ${user.roles.map(r => r.role.name).join(', ')}`);
      console.log(`\nRun: npx tsx server/test-mishandled-leads.ts "${user.id}"\n`);
    } else {
      console.log('User not found. Listing all ACQ users:');
      const acqUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: 'ACQ'
              }
            }
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      });
      acqUsers.forEach(u => {
        console.log(`- ${u.firstName} ${u.lastName} (${u.email}): ${u.id}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findUser();

