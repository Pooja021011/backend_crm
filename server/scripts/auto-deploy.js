#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function autoDeploy() {
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
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      await prisma.user.count();
      console.log('✅ Database test passed');
      
      await prisma.$disconnect();
    } catch (err) {
      console.log('⚠️  Database test failed:', err.message);
      await prisma.$disconnect();
    }

    // Try to restart PM2 if it's running
    try {
      execSync('pm2 restart all --update-env', { stdio: 'pipe' });
      console.log('✅ PM2 restarted');
    } catch (e) {
      console.log('ℹ️  PM2 not running or restart failed');
    }
    
    console.log('🎉 Auto-deploy completed!');

  } catch (error) {
    console.error('❌ Auto-deploy failed:', error.message);
    process.exit(1);
  }
}

// Run the auto-deploy function
autoDeploy().catch((error) => {
  console.error('❌ Auto-deploy failed:', error.message);
  process.exit(1);
});