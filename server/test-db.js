const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn', 'info']
  });

  try {
    console.log('📋 Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.log('- DATABASE_URL (first 50 chars):', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    console.log('\n🔌 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    console.log('\n🔍 Available models:', Object.keys(prisma));
    console.log('🔍 UserEmailSettings model:', !!prisma.userEmailSettings);

    console.log('\n📊 Testing query...');
    const count = await prisma.user.count();
    console.log('✅ User count query successful:', count);

    console.log('\n📧 Testing UserEmailSettings...');
    const emailSettings = await prisma.userEmailSettings.findMany();
    console.log('✅ UserEmailSettings query successful, found:', emailSettings.length, 'records');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('❌ Full error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  }
}

testDatabase();
