#!/bin/bash

# ELIF Applications - Complete System Startup Script
# This script starts all applications in the correct order

set -e

echo "🚀 Starting ELIF Applications System..."
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

# Get current IP
CURRENT_IP=$(ip route | grep default | awk '{print $9}' | head -1)
print_status "Current IP: $CURRENT_IP"

echo ""
echo "📋 STARTUP SEQUENCE:"
echo "===================="
echo "1. Stop all existing services"
echo "2. Start Backend (Database + API)"
echo "3. Start Frontend Applications"
echo "4. Verify all services"
echo ""

# Step 1: Stop all existing services
print_status "Step 1: Stopping all existing services..."
cd /home/el-ifran/WareHouse_Manager

print_status "Stopping Backend..."
cd elif-shared-backend && docker compose down && cd ..

print_status "Stopping Orders App..."
cd elif-orders-app && docker compose down && cd ..

print_status "Stopping Sales App..."
cd elif-sales-app && docker compose down && cd ..

print_status "Stopping Admin App..."
cd elif-admin-app && docker compose down && cd ..

print_success "✅ All services stopped"

# Step 2: Start Backend
print_status "Step 2: Starting Backend..."
cd elif-shared-backend
docker compose up -d
print_status "Waiting for backend to be ready..."
sleep 10

# Test backend health
if curl -f -s http://localhost:8000/api/health/ > /dev/null 2>&1; then
    print_success "✅ Backend is healthy"
else
    print_warning "⚠️  Backend health check failed, but continuing..."
fi

cd ..
print_success "✅ Backend started"

# Step 3: Start Frontend Applications
print_status "Step 3: Starting Frontend Applications..."

print_status "Starting Orders App..."
cd elif-orders-app && docker compose up -d && cd ..

print_status "Starting Sales App..."
cd elif-sales-app && docker compose up -d && cd ..

print_status "Starting Admin App..."
cd elif-admin-app && docker compose up -d && cd ..

print_success "✅ All frontend applications started"

# Step 4: Verify all services
print_status "Step 4: Verifying all services..."
sleep 5

echo ""
echo "🔍 SERVICE VERIFICATION:"
echo "========================"

# Check backend
if curl -f -s http://localhost:8000/api/health/ > /dev/null 2>&1; then
    print_success "✅ Backend API: http://$CURRENT_IP:8000"
else
    print_error "❌ Backend API: Not accessible"
fi

# Check frontend apps
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "✅ Orders App: http://$CURRENT_IP:3000"
else
    print_error "❌ Orders App: Not accessible"
fi

if curl -f -s http://localhost:3001 > /dev/null 2>&1; then
    print_success "✅ Sales App: http://$CURRENT_IP:3001"
else
    print_error "❌ Sales App: Not accessible"
fi

if curl -f -s http://localhost:3002 > /dev/null 2>&1; then
    print_success "✅ Admin App: http://$CURRENT_IP:3002"
else
    print_error "❌ Admin App: Not accessible"
fi

echo ""
echo "🎉 SYSTEM STARTUP COMPLETE!"
echo "==========================="
echo ""
echo "🌐 Access your applications:"
echo "   Backend API: http://$CURRENT_IP:8000"
echo "   Orders App:  http://$CURRENT_IP:3000"
echo "   Sales App:   http://$CURRENT_IP:3001"
echo "   Admin App:   http://$CURRENT_IP:3002"
echo ""
echo "📦 Your packaging system is ready to use!"
echo ""
echo "🛠️  Management Commands:"
echo "   Stop all:    ./stop-system.sh"
echo "   Check status: docker ps"
echo "   View logs:   docker compose logs -f [service-name]"
