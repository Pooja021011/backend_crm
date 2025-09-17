#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Auto-deploying database changes...');

// Check if we're in the right directory
if (!fs.existsSync('prisma/schema.prisma')) {
  console.log('⚠️  Prisma schema not found, skipping auto-deploy');
  process.exit(0);
}

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('⚠️  .env file not found, skipping auto-deploy');
  process.exit(0);
}

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Apply migrations (only if DATABASE_URL is set)
  if (process.env.DATABASE_URL) {
    console.log('🗄️  Applying database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } else {
    console.log('⚠️  DATABASE_URL not set, skipping migrations');
  }

  // Test database connection
  console.log('🔍 Testing database connection...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully');
      return prisma.user.count();
    })
    .then(count => {
      console.log('✅ Database test passed');
      return prisma.$disconnect();
    })
    .catch(err => {
      console.log('⚠️  Database test failed:', err.message);
      return prisma.$disconnect();
    })
    .finally(() => {
      // Try to restart PM2 if it's running
      try {
        execSync('pm2 restart all --update-env', { stdio: 'pipe' });
        console.log('✅ PM2 restarted');
      } catch (e) {
        console.log('ℹ️  PM2 not running or restart failed');
      }
      
      console.log('🎉 Auto-deploy completed!');
    });

} catch (error) {
  console.error('❌ Auto-deploy failed:', error.message);
  process.exit(1);
}