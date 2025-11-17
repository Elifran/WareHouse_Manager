#!/bin/bash

# ELIF Server Stop Script
# Stops all ELIF applications and services

set -e

echo "🛑 Stopping ELIF Server..."

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

# Stop nginx proxy
docker stop nginx-proxy 2>/dev/null && echo "✅ Nginx Proxy stopped"
docker rm nginx-proxy 2>/dev/null


# Stop Backend
print_status "Stopping Backend..."
cd elif-shared-backend
docker compose down 2>/dev/null || true
print_success "Backend stopped"

# Stop Orders App
print_status "Stopping Orders App..."
cd ../elif-orders-app
docker compose down 2>/dev/null || true
print_success "Orders App stopped"

# Stop Sales App
print_status "Stopping Sales App..."
cd ../elif-sales-app
docker compose down 2>/dev/null || true
print_success "Sales App stopped"

# Stop Admin App
print_status "Stopping Admin App..."
cd ../elif-admin-app
docker compose down 2>/dev/null || true
print_success "Admin App stopped"

# Go back to root directory
cd ..

# Stop nginx (if running as root)
if [ "$EUID" -eq 0 ]; then
    print_status "Stopping Nginx..."
    systemctl stop nginx 2>/dev/null || true
    print_success "Nginx stopped"
else
    print_warning "Not running as root. Nginx not stopped."
    print_status "To stop nginx, run: sudo systemctl stop nginx"
fi

# Clean up any remaining containers
print_status "Cleaning up remaining containers..."
docker container prune -f 2>/dev/null || true
print_success "Cleanup completed"

# Show remaining containers
print_status "Checking remaining containers..."
REMAINING=$(docker ps -q | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    print_success "All ELIF containers stopped"
else
    print_warning "Some containers are still running:"
    docker ps
fi

print_success "🎉 ELIF Server stopped!"
echo ""
echo "📋 Summary:"
echo "   ✅ Backend stopped"
echo "   ✅ Orders App stopped"
echo "   ✅ Sales App stopped"
echo "   ✅ Admin App stopped"
echo "   ✅ Nginx stopped (if running as root)"
echo ""
echo "🔧 To start the server again:"
echo "   ./deploy.sh"
echo ""
echo "🔧 To start with domain support:"
echo "   sudo ./deploy-ip-based.sh"
