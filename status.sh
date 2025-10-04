#!/bin/bash

# ELIF Applications - Status Check Script
# Shows current status of all applications and network configuration

echo "📊 ELIF Applications - Status Check"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Get network information
print_status "Network Configuration:"
DYNAMIC_IP=$(ip route | grep default | awk '{print $9}' | head -1)
STATIC_IP=$(ip addr show wlo1 | grep "inet 10.10.1" | awk '{print $2}' | cut -d'/' -f1 2>/dev/null || echo "")

echo "  Dynamic IP: $DYNAMIC_IP"
echo "  Static IP: ${STATIC_IP:-'Not configured'}"

# Check Docker containers
print_status "Docker Containers:"
if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "elif"; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "elif"
else
    print_warning "No ELIF containers are running"
fi

# Check nginx status
print_status "Nginx Status:"
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
    if [ -f "/etc/nginx/sites-enabled/elif-apps" ]; then
        print_success "ELIF nginx configuration is active"
    else
        print_warning "ELIF nginx configuration not found"
    fi
else
    print_warning "Nginx is not running"
fi

# Check domain resolution
print_status "Domain Resolution:"
if grep -q "orders.elif" /etc/hosts; then
    print_success "Domain resolution is configured"
    echo "  Domains: orders.elif, sales.elif, admin.elif, api.elif"
else
    print_warning "Domain resolution not configured"
fi

# Test service accessibility
print_status "Service Accessibility:"

# Test backend
if curl -f http://127.0.0.1:8000/api/health/ 2>/dev/null; then
    print_success "Backend is accessible"
else
    print_error "Backend is not accessible"
fi

# Test frontend apps
if curl -s http://127.0.0.1:3000 | grep -q "ELIF Orders"; then
    print_success "Orders app is accessible"
else
    print_error "Orders app is not accessible"
fi

if curl -s http://127.0.0.1:3001 | grep -q "ELIF Sales"; then
    print_success "Sales app is accessible"
else
    print_error "Sales app is not accessible"
fi

if curl -s http://127.0.0.1:3002 | grep -q "ELIF Admin"; then
    print_success "Admin app is accessible"
else
    print_error "Admin app is not accessible"
fi

# Show access URLs
echo ""
print_status "Access URLs:"
echo ""
echo "🌐 Direct IP Access:"
echo "   🛒 Orders:  http://$DYNAMIC_IP:3000"
echo "   📈 Sales:   http://$DYNAMIC_IP:3001"
echo "   ⚙️  Admin:   http://$DYNAMIC_IP:3002"
echo "   🔧 Backend: http://$DYNAMIC_IP:8000"

if [ -n "$STATIC_IP" ]; then
    echo ""
    echo "🔒 Static IP Access:"
    echo "   🛒 Orders:  http://$STATIC_IP:3000"
    echo "   📈 Sales:   http://$STATIC_IP:3001"
    echo "   ⚙️  Admin:   http://$STATIC_IP:3002"
    echo "   🔧 Backend: http://$STATIC_IP:8000"
fi

if systemctl is-active --quiet nginx && [ -f "/etc/nginx/sites-enabled/elif-apps" ]; then
    echo ""
    echo "🌐 Domain Access:"
    echo "   🛒 Orders:  http://orders.elif"
    echo "   📈 Sales:   http://sales.elif"
    echo "   ⚙️  Admin:   http://admin.elif"
    echo "   🔧 Backend: http://api.elif"
fi

echo ""
print_status "Management Commands:"
echo "   Deploy:        ./deploy-unified.sh"
echo "   Deploy+Domains: sudo ./deploy-unified.sh --with-domains"
echo "   Stop:          ./stop-server.sh"
echo "   Status:        ./status.sh"
echo "   Change IP:     sudo ./change-static-ip.sh"
echo "   Network Access: sudo ./enable-network-access.sh"
