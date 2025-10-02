#!/bin/bash

# ELIF Applications - Subdomain Deployment Script
# This script deploys all 3 ELIF applications to their respective subdomains

set -e

echo "🚀 Starting ELIF Subdomain Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="yourdomain.com"
NGINX_CONFIG="/etc/nginx/sites-available/elif-apps"
NGINX_ENABLED="/etc/nginx/sites-enabled/elif-apps"
WEB_ROOT="/var/www"

# Function to print colored output
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
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Create web directories
print_status "Creating web directories..."
mkdir -p $WEB_ROOT/elif-orders-app
mkdir -p $WEB_ROOT/elif-sales-app
mkdir -p $WEB_ROOT/elif-admin-app

# Build Orders App
print_status "Building Orders App..."
cd elif-orders-app/beverage_management_system
npm install
npm run build
cp -r build/* $WEB_ROOT/elif-orders-app/
print_success "Orders App built successfully"

# Build Sales App
print_status "Building Sales App..."
cd ../../elif-sales-app/beverage_management_system
npm install
npm run build
cp -r build/* $WEB_ROOT/elif-sales-app/
print_success "Sales App built successfully"

# Build Admin App
print_status "Building Admin App..."
cd ../../elif-admin-app/beverage_management_system
npm install
npm run build
cp -r build/* $WEB_ROOT/elif-admin-app/
print_success "Admin App built successfully"

# Setup Nginx configuration
print_status "Setting up Nginx configuration..."
cp ../../nginx-subdomains.conf $NGINX_CONFIG

# Replace placeholder domain with actual domain
sed -i "s/yourdomain.com/$DOMAIN/g" $NGINX_CONFIG

# Enable the site
ln -sf $NGINX_CONFIG $NGINX_ENABLED

# Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
    
    # Reload Nginx
    print_status "Reloading Nginx..."
    systemctl reload nginx
    print_success "Nginx reloaded successfully"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Deploy Shared Backend
print_status "Deploying shared backend..."
cd elif-shared-backend
docker-compose up -d
print_success "Shared backend deployed"

# Setup SSL certificates (Let's Encrypt)
print_status "Setting up SSL certificates..."
if command -v certbot &> /dev/null; then
    certbot --nginx -d orders.$DOMAIN -d sales.$DOMAIN -d admin.$DOMAIN -d api.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    print_success "SSL certificates configured"
else
    print_warning "Certbot not found. Please install SSL certificates manually."
fi

# Create Docker network
print_status "Creating Docker network..."
docker network create elif-network 2>/dev/null || true

# Deploy with Docker Compose
print_status "Deploying applications with Docker..."

cd ../../elif-orders-app
docker-compose up -d
print_success "Orders App deployed"

cd ../elif-sales-app
docker-compose up -d
print_success "Sales App deployed"

cd ../elif-admin-app
docker-compose up -d
print_success "Admin App deployed"

# Final status
print_success "🎉 ELIF Applications deployed successfully!"
echo ""
echo "📱 Applications are now available at:"
echo "   🛒 Orders:  https://orders.$DOMAIN"
echo "   📈 Sales:   https://sales.$DOMAIN"
echo "   ⚙️  Admin:   https://admin.$DOMAIN"
echo "   🔧 API:     https://api.$DOMAIN"
echo ""
echo "🔧 Management commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop apps:    docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Update:       ./deploy-subdomains.sh"
echo ""
print_warning "Don't forget to:"
echo "   1. Update DNS records for your subdomains"
echo "   2. Configure your firewall"
echo "   3. Set up database backups"
echo "   4. Configure monitoring"
