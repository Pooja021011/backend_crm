import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn']
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Test database connection on startup
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
    console.log('🔍 Debug - Prisma client models:', Object.keys(prisma));
    console.log('🔍 Debug - UserEmailSettings available:', !!prisma.userEmailSettings);
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    console.error('❌ DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.error('❌ Error details:', error.message);
  });

