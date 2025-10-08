#!/bin/bash

# ELIF Applications - Deploy with Domain Access
# This script deploys all applications and sets up domain routing automatically
# Updated to support both static and dynamic IPs

set -e

echo "🚀 Deploying ELIF Applications with Domain Access..."
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo) to set up domain access"
    print_status "Run: sudo ./deploy-with-domains.sh"
    exit 1
fi

# Get current network information
print_status "Detecting network configuration..."
DYNAMIC_IP=$(ip route | grep default | awk '{print $9}' | head -1)
STATIC_IP=$(ip addr show wlo1 | grep "inet 10.10.1" | awk '{print $2}' | cut -d'/' -f1 2>/dev/null || echo "")

if [ -z "$DYNAMIC_IP" ]; then
    print_error "Could not determine dynamic IP address"
    exit 1
fi

print_status "Network Configuration:"
print_status "  Dynamic IP: $DYNAMIC_IP"
print_status "  Static IP: ${STATIC_IP:-'Not configured'}"

# Update configurations with current IPs
print_status "Updating configurations with current IP addresses..."

# Update Django settings
if [ -f "elif-shared-backend/backend/config/settings.py" ]; then
    # Update ALLOWED_HOSTS
    sed -i "s/'192\.168\.[0-9]*\.[0-9]*',  # Dynamic IP (updated by deploy script)/'$DYNAMIC_IP',  # Dynamic IP (updated by deploy script)/" elif-shared-backend/backend/config/settings.py
    
    # Update CORS origins
    sed -i "s|http://192\.168\.[0-9]*\.[0-9]*:3000|http://$DYNAMIC_IP:3000|g" elif-shared-backend/backend/config/settings.py
    sed -i "s|http://192\.168\.[0-9]*\.[0-9]*:3001|http://$DYNAMIC_IP:3001|g" elif-shared-backend/backend/config/settings.py
    sed -i "s|http://192\.168\.[0-9]*\.[0-9]*:3002|http://$DYNAMIC_IP:3002|g" elif-shared-backend/backend/config/settings.py
fi

# Update Docker Compose environment variables
if [ -f "elif-shared-backend/docker-compose.yml" ]; then
    sed -i "s|192\.168\.[0-9]*\.[0-9]*|$DYNAMIC_IP|g" elif-shared-backend/docker-compose.yml
fi

# Update frontend Docker Compose files with current IP
print_status "Updating frontend API URLs..."
sed -i "s|REACT_APP_API_URL=http://[0-9.]*:8000|REACT_APP_API_URL=http://$DYNAMIC_IP:8000|g" elif-orders-app/docker-compose.yml
sed -i "s|REACT_APP_API_URL=http://[0-9.]*:8000|REACT_APP_API_URL=http://$DYNAMIC_IP:8000|g" elif-sales-app/docker-compose.yml
sed -i "s|REACT_APP_API_URL=http://[0-9.]*:8000|REACT_APP_API_URL=http://$DYNAMIC_IP:8000|g" elif-admin-app/docker-compose.yml

# Update nginx configuration
if [ -f "nginx.conf" ]; then
    sed -i "s|192\.168\.[0-9]*\.[0-9]*|$DYNAMIC_IP|g" nginx.conf
fi

print_success "Configurations updated with current IP: $DYNAMIC_IP"

# Stop existing services
print_status "Stopping existing services..."
cd elif-shared-backend && docker compose down 2>/dev/null || true && cd ..
cd elif-orders-app && docker compose down 2>/dev/null || true && cd ..
cd elif-sales-app && docker compose down 2>/dev/null || true && cd ..
cd elif-admin-app && docker compose down 2>/dev/null || true && cd ..

# Create Docker network if needed
print_status "Creating Docker network..."
docker network create elif-network 2>/dev/null || true
print_success "Docker network ready"

# Deploy Backend
print_status "Deploying Backend..."
cd elif-shared-backend
docker compose up -d --build
print_success "Backend deployed on $DYNAMIC_IP:8000 and ${STATIC_IP:-'N/A'}:8000"

# Go back to root directory
cd ..

# Deploy Frontend Apps
print_status "Deploying Frontend Applications..."

# Orders App
print_status "Deploying Orders App (rebuilding with updated API URL)..."
cd elif-orders-app
docker compose up -d --build --force-recreate
print_success "Orders App deployed on $DYNAMIC_IP:3000 with API URL: http://$DYNAMIC_IP:8000"

# Sales App
print_status "Deploying Sales App (rebuilding with updated API URL)..."
cd ../elif-sales-app
docker compose up -d --build --force-recreate
print_success "Sales App deployed on $DYNAMIC_IP:3001 with API URL: http://$DYNAMIC_IP:8000"

# Admin App
print_status "Deploying Admin App (rebuilding with updated API URL)..."
cd ../elif-admin-app
docker compose up -d --build --force-recreate
print_success "Admin App deployed on $DYNAMIC_IP:3002 with API URL: http://$DYNAMIC_IP:8000"

# Go back to root directory
cd ..

# Setup domain resolution
print_status "Setting up domain resolution..."
if ! grep -q "orders.elif" /etc/hosts; then
    echo "$DYNAMIC_IP orders.elif" >> /etc/hosts
    echo "$DYNAMIC_IP sales.elif" >> /etc/hosts
    echo "$DYNAMIC_IP admin.elif" >> /etc/hosts
    echo "$DYNAMIC_IP api.elif" >> /etc/hosts
    print_success "Domain resolution configured in /etc/hosts with IP: $DYNAMIC_IP"
else
    # Update existing entries with current IP
    sed -i "s/^[0-9].* orders\.elif/$DYNAMIC_IP orders.elif/" /etc/hosts
    sed -i "s/^[0-9].* sales\.elif/$DYNAMIC_IP sales.elif/" /etc/hosts
    sed -i "s/^[0-9].* admin\.elif/$DYNAMIC_IP admin.elif/" /etc/hosts
    sed -i "s/^[0-9].* api\.elif/$DYNAMIC_IP api.elif/" /etc/hosts
    print_success "Domain resolution updated with current IP: $DYNAMIC_IP"
fi

# Setup Nginx
print_status "Setting up Nginx reverse proxy..."

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    apt update && apt install -y nginx
    print_success "Nginx installed"
fi

# Check and fix port 80 conflict
print_status "Checking for port 80 conflicts..."
PORT80_PROCESS=$(ss -tlnp | grep ":80 " | head -1)
if [ -n "$PORT80_PROCESS" ]; then
    print_warning "Port 80 is in use: $PORT80_PROCESS"
    print_status "Stopping conflicting services..."
    
    # Stop Apache if running
    if systemctl is-active --quiet apache2; then
        systemctl stop apache2
        systemctl disable apache2
        print_success "Apache stopped and disabled"
    elif systemctl is-active --quiet httpd; then
        systemctl stop httpd
        systemctl disable httpd
        print_success "HTTPD stopped and disabled"
    fi
    
    # Stop nginx if running
    systemctl stop nginx 2>/dev/null || true
    
    # Wait for ports to be released
    print_status "Waiting for ports to be released..."
    sleep 3
    
    # Force kill any remaining process on port 80
    PORT80_PROCESS=$(ss -tlnp | grep ":80 " | head -1)
    if [ -n "$PORT80_PROCESS" ]; then
        print_status "Force killing process on port 80..."
        PID=$(echo $PORT80_PROCESS | grep -o 'pid=[0-9]*' | cut -d= -f2)
        if [ -n "$PID" ]; then
            kill -9 $PID 2>/dev/null || true
            sleep 2
        fi
    fi
else
    print_success "Port 80 is free"
fi

# Stop nginx
print_status "Configuring Nginx..."
systemctl stop nginx 2>/dev/null || true

# Remove old configurations
print_status "Removing old nginx configurations..."
rm -f /etc/nginx/sites-enabled/elif-apps
rm -f /etc/nginx/sites-available/elif-apps
rm -f /etc/nginx/sites-enabled/default

# Install new configuration
print_status "Installing nginx configuration..."
cp nginx.conf /etc/nginx/sites-available/elif-apps

# Enable site
print_status "Enabling ELIF site..."
ln -sf /etc/nginx/sites-available/elif-apps /etc/nginx/sites-enabled/elif-apps

# Test nginx configuration
print_status "Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
    
    # Start nginx
    print_status "Starting Nginx..."
    systemctl start nginx
    systemctl enable nginx
    
    # Wait for nginx to start
    sleep 3
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running and enabled"
    else
        print_error "Failed to start nginx"
        print_status "Checking nginx status..."
        systemctl status nginx --no-pager -l | head -10
        exit 1
    fi
else
    print_error "Nginx configuration test failed"
    nginx -t 2>&1
    exit 1
fi

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Test services
print_status "Testing services..."

# Test backend
if curl -f http://127.0.0.1:8000/api/health/ 2>/dev/null; then
    print_success "Backend is healthy"
else
    print_warning "Backend health check failed"
fi

# Test frontend apps
if curl -s http://127.0.0.1:3000 | grep -q "ELIF Orders"; then
    print_success "Orders app is running"
else
    print_warning "Orders app test failed"
fi

if curl -s http://127.0.0.1:3001 | grep -q "ELIF Sales"; then
    print_success "Sales app is running"
else
    print_warning "Sales app test failed"
fi

if curl -s http://127.0.0.1:3002 | grep -q "ELIF Admin"; then
    print_success "Admin app is running"
else
    print_warning "Admin app test failed"
fi

# Test domain access
print_status "Testing domain access..."

# Test orders.elif
if curl -s http://orders.elif | grep -q "ELIF Orders"; then
    print_success "orders.elif is working"
else
    print_warning "orders.elif is not working"
fi

# Test sales.elif
if curl -s http://sales.elif | grep -q "ELIF Sales"; then
    print_success "sales.elif is working"
else
    print_warning "sales.elif is not working"
fi

# Test admin.elif
if curl -s http://admin.elif | grep -q "ELIF Admin"; then
    print_success "admin.elif is working"
else
    print_warning "admin.elif is not working"
fi

# Show running containers
print_status "Current Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

print_success "🎉 ELIF Applications deployed with domain access!"
echo ""
echo "📱 Applications are now accessible via domains:"
echo "   🛒 Orders:  http://orders.elif"
echo "   📈 Sales:   http://sales.elif"
echo "   ⚙️  Admin:   http://admin.elif"
echo "   🔧 Backend: http://api.elif"
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

echo ""
echo "🔧 Management commands:"
echo "   View logs:    docker compose logs -f"
echo "   Stop all:     ./stop-server.sh"
echo "   Restart:      sudo ./deploy-with-domains.sh"
echo "   Status:       ./status.sh"
echo ""
print_success "✨ Domain access is now fully configured and working!"
print_success "🌐 Applications are accessible from other devices on the network!"