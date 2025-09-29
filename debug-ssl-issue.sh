#!/bin/bash

echo "🔍 Debugging SSL/HTTPS Issues"
echo "=============================="

echo ""
echo "1. 📋 Checking Current PM2 Processes:"
pm2 list

echo ""
echo "2. 📋 Checking PM2 Environment Variables:"
pm2 show real-estate-frontend | grep -A 20 "env:"

echo ""
echo "3. 📋 Testing HTTP Access to Frontend:"
curl -I http://localhost:8080 2>/dev/null || echo "❌ Frontend not accessible on HTTP"

echo ""
echo "4. 📋 Testing HTTP Access to Backend:"
curl -I http://localhost:4000/api/v1/health 2>/dev/null || echo "❌ Backend not accessible on HTTP"

echo ""
echo "5. 📋 Checking if any process is listening on HTTPS ports:"
netstat -tlnp | grep ":443 " || echo "✅ No process on port 443 (HTTPS)"
netstat -tlnp | grep ":8443 " || echo "✅ No process on port 8443"

echo ""
echo "6. 📋 Checking Nginx/Apache configuration (if exists):"
if [ -f /etc/nginx/nginx.conf ]; then
    echo "📄 Nginx found - checking for HTTPS redirects:"
    grep -n "return 301 https" /etc/nginx/sites-available/* 2>/dev/null || echo "✅ No HTTPS redirects in Nginx"
else
    echo "✅ No Nginx configuration found"
fi

if [ -f /etc/apache2/apache2.conf ]; then
    echo "📄 Apache found - checking for HTTPS redirects:"
    grep -rn "RewriteRule.*https" /etc/apache2/ 2>/dev/null || echo "✅ No HTTPS redirects in Apache"
else
    echo "✅ No Apache configuration found"
fi

echo ""
echo "7. 📋 Checking system-level SSL certificates:"
ls -la /etc/ssl/certs/ 2>/dev/null | head -5 || echo "ℹ️  SSL certificates directory not accessible"

echo ""
echo "8. 📋 Environment Variables Check:"
echo "NODE_ENV: ${NODE_ENV:-'not set'}"
echo "HTTPS: ${HTTPS:-'not set'}"
echo "SSL_ENABLED: ${SSL_ENABLED:-'not set'}"

echo ""
echo "9. 📋 Current Network Interfaces:"
ip addr show | grep inet | head -10

echo ""
echo "🔧 SOLUTIONS:"
echo "============="
echo "1. Restart PM2 processes:"
echo "   pm2 restart all"
echo ""
echo "2. Clear browser cache and try:"
echo "   http://your-server-ip:8080"
echo ""
echo "3. If still redirecting to HTTPS, check:"
echo "   - Browser settings (disable 'Always use secure connections')"
echo "   - Server proxy/load balancer configuration"
echo "   - DNS/CDN settings"
echo ""
echo "4. Force HTTP in browser:"
echo "   - Type 'http://' explicitly"
echo "   - Use incognito/private mode"
echo "   - Clear HSTS cache in Chrome: chrome://net-internals/#hsts"
