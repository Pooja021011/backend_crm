#!/bin/bash
# Server Fix Script - Run this on your production server

set -e

echo "🔧 ===== FIXING SERVER ISSUES ====="
echo ""

# Navigate to project directory
cd /var/www/RealEstateCRMBackend

echo "📥 Step 1: Pulling latest code..."
git fetch origin
git pull origin development
echo "✅ Code updated"
echo ""

# Navigate to server directory
cd server

echo "📊 Step 2: Checking migrations..."
MIGRATION_COUNT=$(ls -1 prisma/migrations/ | grep -v "migration_lock.toml" | wc -l)
echo "Found $MIGRATION_COUNT migrations"
echo ""

echo "🔄 Step 3: Regenerating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

echo "🗄️ Step 4: Checking migration status..."
npx prisma migrate status || echo "⚠️ Migrations need attention"
echo ""

echo "📦 Step 5: Applying pending migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied"
echo ""

echo "🔨 Step 6: Rebuilding TypeScript..."
npm run build
echo "✅ Build completed"
echo ""

echo "🔄 Step 7: Restarting PM2..."
pm2 restart all --update-env
echo "✅ PM2 restarted"
echo ""

echo "⏳ Waiting 3 seconds for services to start..."
sleep 3
echo ""

echo "📊 Step 8: Checking PM2 status..."
pm2 list
echo ""

echo "📋 Step 9: Recent logs..."
pm2 logs --lines 20 --nostream
echo ""

echo "🎉 ===== FIX COMPLETE ====="
echo ""
echo "🧪 Test your API:"
echo "   curl http://localhost:4000/api/v1/health"
echo ""


