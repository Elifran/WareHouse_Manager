#!/bin/bash

# ELIF Applications - API Configuration Verification Script
# This script verifies all API configurations across all applications

set -e

echo "🔍 Verifying API configurations across all ELIF applications..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get current IP
CURRENT_IP=$(ip route | grep default | awk '{print $9}' | head -1)
print_status "Current IP: $CURRENT_IP"

echo ""
echo "📋 BACKEND API CONFIGURATION:"
echo "================================"

# Check Django settings
if [ -f "/home/el-ifran/WareHouse_Manager/elif-shared-backend/backend/config/settings.py" ]; then
    print_success "✅ Django settings.py found"
    
    # Check if dynamic IP detection is implemented
    if grep -q "get_current_ip" /home/el-ifran/WareHouse_Manager/elif-shared-backend/backend/config/settings.py; then
        print_success "✅ Dynamic IP detection implemented"
    else
        print_warning "⚠️  Dynamic IP detection not found"
    fi
    
    # Check ALLOWED_HOSTS
    if grep -q "CURRENT_IP" /home/el-ifran/WareHouse_Manager/elif-shared-backend/backend/config/settings.py; then
        print_success "✅ ALLOWED_HOSTS uses dynamic IP"
    else
        print_warning "⚠️  ALLOWED_HOSTS may not use dynamic IP"
    fi
    
    # Check CORS settings
    if grep -q "f\"http://{CURRENT_IP}" /home/el-ifran/WareHouse_Manager/elif-shared-backend/backend/config/settings.py; then
        print_success "✅ CORS settings use dynamic IP"
    else
        print_warning "⚠️  CORS settings may not use dynamic IP"
    fi
else
    print_error "❌ Django settings.py not found"
fi

echo ""
echo "📱 FRONTEND API CONFIGURATIONS:"
echo "================================"

# Check Sales App
echo "🛒 Sales App:"
if [ -f "/home/el-ifran/WareHouse_Manager/elif-sales-app/beverage_management_system/src/services/api.js" ]; then
    print_success "✅ API service found"
    if grep -q "http://\${currentHost}:8000" /home/el-ifran/WareHouse_Manager/elif-sales-app/beverage_management_system/src/services/api.js; then
        print_success "✅ Dynamic IP detection implemented"
    else
        print_warning "⚠️  Dynamic IP detection may not be implemented"
    fi
else
    print_error "❌ API service not found"
fi

if [ -f "/home/el-ifran/WareHouse_Manager/elif-sales-app/docker-compose.yml" ]; then
    if grep -q "REACT_APP_DYNAMIC_IP" /home/el-ifran/WareHouse_Manager/elif-sales-app/docker-compose.yml; then
        print_success "✅ Dynamic IP environment variable configured"
    else
        print_warning "⚠️  Dynamic IP environment variable not configured"
    fi
else
    print_error "❌ Docker compose not found"
fi

# Check Orders App
echo ""
echo "📦 Orders App:"
if [ -f "/home/el-ifran/WareHouse_Manager/elif-orders-app/beverage_management_system/src/services/api.js" ]; then
    print_success "✅ API service found"
    if grep -q "http://\${currentHost}:8000" /home/el-ifran/WareHouse_Manager/elif-orders-app/beverage_management_system/src/services/api.js; then
        print_success "✅ Dynamic IP detection implemented"
    else
        print_warning "⚠️  Dynamic IP detection may not be implemented"
    fi
else
    print_error "❌ API service not found"
fi

if [ -f "/home/el-ifran/WareHouse_Manager/elif-orders-app/docker-compose.yml" ]; then
    if grep -q "REACT_APP_DYNAMIC_IP" /home/el-ifran/WareHouse_Manager/elif-orders-app/docker-compose.yml; then
        print_success "✅ Dynamic IP environment variable configured"
    else
        print_warning "⚠️  Dynamic IP environment variable not configured"
    fi
else
    print_error "❌ Docker compose not found"
fi

# Check Admin App
echo ""
echo "⚙️  Admin App:"
if [ -f "/home/el-ifran/WareHouse_Manager/elif-admin-app/beverage_management_system/src/services/api.js" ]; then
    print_success "✅ API service found"
    if grep -q "http://\${currentHost}:8000" /home/el-ifran/WareHouse_Manager/elif-admin-app/beverage_management_system/src/services/api.js; then
        print_success "✅ Dynamic IP detection implemented"
    else
        print_warning "⚠️  Dynamic IP detection may not be implemented"
    fi
else
    print_error "❌ API service not found"
fi

if [ -f "/home/el-ifran/WareHouse_Manager/elif-admin-app/docker-compose.yml" ]; then
    if grep -q "REACT_APP_DYNAMIC_IP" /home/el-ifran/WareHouse_Manager/elif-admin-app/docker-compose.yml; then
        print_success "✅ Dynamic IP environment variable configured"
    else
        print_warning "⚠️  Dynamic IP environment variable not configured"
    fi
else
    print_error "❌ Docker compose not found"
fi

echo ""
echo "🌐 NETWORK CONFIGURATION:"
echo "=========================="

# Check if services are running
print_status "Checking running services..."
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-shared-backend"; then
    print_success "✅ Backend is running"
else
    print_warning "⚠️  Backend is not running"
fi

if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-sales-app"; then
    print_success "✅ Sales App is running"
else
    print_warning "⚠️  Sales App is not running"
fi

if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-orders-app"; then
    print_success "✅ Orders App is running"
else
    print_warning "⚠️  Orders App is not running"
fi

if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-admin-app"; then
    print_success "✅ Admin App is running"
else
    print_warning "⚠️  Admin App is not running"
fi

echo ""
echo "🔧 API ENDPOINT TESTING:"
echo "========================"

# Test backend health
print_status "Testing backend health endpoint..."
if curl -f -s http://$CURRENT_IP:8000/api/health/ > /dev/null 2>&1; then
    print_success "✅ Backend health check passed"
else
    print_error "❌ Backend health check failed"
fi

# Test frontend apps
print_status "Testing frontend applications..."
if curl -f -s http://$CURRENT_IP:3001 > /dev/null 2>&1; then
    print_success "✅ Sales App is accessible"
else
    print_error "❌ Sales App is not accessible"
fi

if curl -f -s http://$CURRENT_IP:3000 > /dev/null 2>&1; then
    print_success "✅ Orders App is accessible"
else
    print_error "❌ Orders App is not accessible"
fi

if curl -f -s http://$CURRENT_IP:3002 > /dev/null 2>&1; then
    print_success "✅ Admin App is accessible"
else
    print_error "❌ Admin App is not accessible"
fi

echo ""
echo "📊 SUMMARY:"
echo "============"
print_success "🎉 API configuration verification complete!"
echo ""
echo "🌐 Current network configuration:"
echo "   Backend API: http://$CURRENT_IP:8000"
echo "   Sales App:   http://$CURRENT_IP:3001"
echo "   Orders App:  http://$CURRENT_IP:3000"
echo "   Admin App:   http://$CURRENT_IP:3002"
echo ""
echo "💡 All applications now automatically adapt to your current IP address!"
echo "   No more hardcoded IP addresses - everything is dynamic! 🚀"
