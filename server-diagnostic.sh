#!/bin/bash

echo "🔍 ===== SERVER DIAGNOSTIC REPORT ====="
echo ""

echo "📍 Current Directory:"
pwd
echo ""

echo "📦 Node & NPM Versions:"
node -v
npm -v
echo ""

echo "🌿 Git Status:"
git branch --show-current
git log --oneline -3
echo ""

echo "📁 Migration Files Count:"
ls -1 server/prisma/migrations/ 2>/dev/null | wc -l
echo ""

echo "📋 Migration Files List:"
ls -1 server/prisma/migrations/ 2>/dev/null
echo ""

echo "🗄️ Database Migration Status:"
cd server
npx prisma migrate status 2>&1
echo ""

echo "📦 Prisma Client Check:"
npx prisma -v 2>&1 | grep "@prisma/client"
echo ""

echo "🔧 Built Files Check:"
if [ -d "dist" ]; then
    echo "✅ dist/ folder exists"
    ls -lh dist/config/db.js 2>/dev/null || echo "❌ dist/config/db.js not found"
else
    echo "❌ dist/ folder not found - need to run 'npm run build'"
fi
echo ""

echo "🚀 PM2 Status:"
pm2 list 2>&1 | head -10
echo ""

echo "📊 PM2 Environment Variables:"
pm2 env 0 2>&1 | grep -E "DATABASE_URL|NODE_ENV" || echo "PM2 not running or env vars not found"
echo ""

echo "🔍 Database Connection Test:"
node --input-type=module -e "
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
try {
  await prisma.\$connect();
  console.log('✅ Database connected');
  const count = await prisma.user.count();
  console.log('✅ User count:', count);
  await prisma.\$disconnect();
} catch(e) {
  console.error('❌ Error:', e.message);
}
" 2>&1

echo ""
echo "🏁 ===== END OF DIAGNOSTIC REPORT ====="


