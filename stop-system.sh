#!/bin/bash

# ELIF Applications - Complete System Shutdown Script
# This script stops all applications in the correct order

set -e

echo "🛑 Stopping ELIF Applications System..."
echo "======================================"

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

cd /home/el-ifran/WareHouse_Manager

echo ""
echo "📋 SHUTDOWN SEQUENCE:"
echo "====================="
echo "1. Stop Frontend Applications"
echo "2. Stop Backend"
echo "3. Verify all services stopped"
echo ""

# Stop nginx proxy
docker stop nginx-proxy 2>/dev/null && echo "✅ Nginx Proxy stopped"
docker rm nginx-proxy 2>/dev/null

# Step 1: Stop Frontend Applications
print_status "Step 1: Stopping Frontend Applications..."

print_status "Stopping Orders App..."
cd elif-orders-app && docker compose down && cd ..

print_status "Stopping Sales App..."
cd elif-sales-app && docker compose down && cd ..

print_status "Stopping Admin App..."
cd elif-admin-app && docker compose down && cd ..

print_success "✅ All frontend applications stopped"

# Step 2: Stop Backend
print_status "Step 2: Stopping Backend..."
cd elif-shared-backend
docker compose down
cd ..

print_success "✅ Backend stopped"

# Step 3: Verify all services stopped
print_status "Step 3: Verifying all services stopped..."

echo ""
echo "🔍 SERVICE VERIFICATION:"
echo "========================"

# Check if any ELIF containers are still running
if docker ps --format "table {{.Names}}" | grep -q "elif"; then
    print_warning "⚠️  Some ELIF containers are still running:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep "elif"
else
    print_success "✅ All ELIF containers stopped"
fi

echo ""
echo "🛑 SYSTEM SHUTDOWN COMPLETE!"
echo "============================"
echo ""
echo "🛠️  To start the system again:"
echo "   ./start-system.sh"
echo ""
echo "🔍 To check system status:"
echo "   docker ps"
