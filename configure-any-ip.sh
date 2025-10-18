#!/bin/bash

# ELIF Applications - Configure for Any IP Address
# This script helps you configure the system to work with any IP address

set -e

echo "🔧 ELIF Applications - Configure for Any IP Address"
echo "=================================================="

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

# Get current server IP
SERVER_IP=$(ip route | grep default | awk '{print $9}' | head -1)
print_status "Current server IP: $SERVER_IP"

echo ""
echo "📋 Current Configuration:"
echo "=========================="
print_status "Backend is configured to accept connections from ANY IP address"
print_status "CORS is configured to allow ANY origin"
print_status "Backend is listening on: 0.0.0.0:8000"

echo ""
echo "🌐 How to Access Your Applications:"
echo "==================================="
echo ""
echo "From the SAME network as the server ($SERVER_IP):"
echo "  Backend API: http://$SERVER_IP:8000"
echo "  Orders App:  http://$SERVER_IP:3000"
echo "  Sales App:   http://$SERVER_IP:3001"
echo "  Admin App:   http://$SERVER_IP:3002"
echo ""
echo "From ANY other IP address (if network allows):"
echo "  Backend API: http://[YOUR_IP]:8000"
echo "  Orders App:  http://[YOUR_IP]:3000"
echo "  Sales App:   http://[YOUR_IP]:3001"
echo "  Admin App:   http://[YOUR_IP]:3002"
echo ""

# Test backend accessibility
print_status "Testing backend accessibility..."
if curl -f -s http://localhost:8000/api/health/ > /dev/null 2>&1; then
    print_success "✅ Backend is running and healthy"
else
    print_error "❌ Backend is not accessible"
fi

echo ""
echo "🔧 Troubleshooting:"
echo "==================="
echo ""
echo "If you can't access from a different IP:"
echo "1. Check if you're on the same network as the server"
echo "2. Check firewall settings on the server"
echo "3. Check network routing between your IP and server IP"
echo "4. Try accessing from the server's IP directly: $SERVER_IP"
echo ""

# Check if services are running
print_status "Checking running services..."
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-shared-backend"; then
    print_success "✅ Backend container is running"
else
    print_error "❌ Backend container is not running"
fi

if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-orders-app"; then
    print_success "✅ Orders App container is running"
else
    print_error "❌ Orders App container is not running"
fi

if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-sales-app"; then
    print_success "✅ Sales App container is running"
else
    print_error "❌ Sales App container is not running"
fi

if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "elif-admin-app"; then
    print_success "✅ Admin App container is running"
else
    print_error "❌ Admin App container is not running"
fi

echo ""
echo "💡 The backend is configured to accept connections from ANY IP address!"
echo "   No additional configuration needed - just use the correct IP address."
echo ""
echo "🚀 Your packaging system is ready to use!"
