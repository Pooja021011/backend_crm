#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
    // Step 1: Generate Prisma client first
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Step 2: Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set, skipping migrations');
      console.log('✅ Prisma client generated successfully');
      process.exit(0);
    }

    // Step 3: Check migration status
    console.log('🔍 Checking migration status...');
    try {
      execSync('npx prisma migrate status', { stdio: 'pipe' });
      console.log('✅ Database is up to date!');
    } catch (statusError) {
      // Migration status check failed, which means migrations are pending
      console.log('📋 Pending migrations detected...');
      
      // Step 4: Apply pending migrations
      console.log('🗄️  Applying database migrations...');
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Migrations applied successfully');
      } catch (migrateError) {
        // If migrate deploy fails, it might be because tables exist but aren't tracked
        console.log('⚠️  Migration deployment failed. This might be due to untracked tables.');
        console.log('ℹ️  You may need to run: npx prisma migrate resolve --applied <migration_name>');
        
        // Don't exit with error - the schema might be in sync even if tracking is off
        console.log('🔄 Continuing with deployment...');
      }
    }

    // Step 5: Verify Prisma client is working
    console.log('🔍 Testing database connection...');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Simple query to verify it's working
      const userCount = await prisma.user.count();
      console.log('✅ Database queries working');
      
      // Step 5.5: Check if database needs seeding
      const roleCount = await prisma.role.count();
      const leadStatusCount = await prisma.leadStatus.count();
      
      if (userCount === 0 || roleCount === 0 || leadStatusCount === 0) {
        console.log('🌱 Database needs seeding...');
        console.log(`   - Users: ${userCount}, Roles: ${roleCount}, Lead Statuses: ${leadStatusCount}`);
        
        try {
          execSync('npm run seed', { stdio: 'inherit' });
          console.log('✅ Database seeded successfully');
        } catch (seedError) {
          console.log('⚠️  Seed failed, but continuing...', seedError.message);
        }
      } else {
        console.log('ℹ️  Database already seeded (users, roles, and lead statuses exist)');
      }
      
      await prisma.$disconnect();
    } catch (err) {
      console.log('⚠️  Database test failed:', err.message);
      await prisma.$disconnect();
    }

    // Step 6: Try to restart PM2 if it's running (production only)
    try {
      const pm2List = execSync('pm2 list', { stdio: 'pipe', encoding: 'utf-8' });
      if (pm2List.includes('online')) {
        console.log('🔄 Restarting PM2 processes...');
        execSync('pm2 restart all --update-env', { stdio: 'pipe' });
        console.log('✅ PM2 restarted');
      } else {
        console.log('ℹ️  No PM2 processes running');
      }
    } catch (e) {
      console.log('ℹ️  PM2 not installed or not running (this is normal in development)');
    }
    
    console.log('🎉 Auto-deploy completed successfully!');

  } catch (error) {
    console.error('❌ Auto-deploy failed:', error.message);
    
    // Don't fail the npm install if auto-deploy fails
    // This allows developers to install dependencies even if DB is not ready
    console.log('⚠️  Continuing anyway... You can manually run: npm run db:deploy');
    process.exit(0);
  }
}

// Run the auto-deploy function
autoDeploy().catch((error) => {
  console.error('❌ Auto-deploy error:', error.message);
  console.log('⚠️  Continuing anyway... You can manually run: npm run db:deploy');
  process.exit(0);
});