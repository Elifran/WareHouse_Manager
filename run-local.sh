#!/bin/bash

# ELIF Applications - Local Development Runner
# This script runs all ELIF applications locally for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🚀 Starting ELIF Applications Locally..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create Docker network
print_status "Creating Docker network..."
docker network create elif-network 2>/dev/null || true

# Build and start backend first
print_status "Building and starting shared backend..."
cd elif-shared-backend
docker-compose up -d --build
print_success "Backend started on http://localhost:8000"

# Wait for backend to be ready
print_status "Waiting for backend to be ready..."
sleep 10

# Build frontend applications
print_status "Building Orders App..."
cd ../elif-orders-app/beverage_management_system
npm install --legacy-peer-deps
npm run build
print_success "Orders App built"

print_status "Building Sales App..."
cd ../../elif-sales-app/beverage_management_system
npm install --legacy-peer-deps
npm run build
print_success "Sales App built"

print_status "Building Admin App..."
cd ../../elif-admin-app/beverage_management_system
npm install --legacy-peer-deps
npm run build
print_success "Admin App built"

# Start all applications
print_status "Starting all applications..."
cd ../../
docker-compose -f docker-compose.local.yml up -d --build

# Wait for all services to be ready
print_status "Waiting for all services to be ready..."
sleep 15

# Check if services are running
print_status "Checking service status..."
if curl -f http://localhost:8000/api/health/ > /dev/null 2>&1; then
    print_success "Backend API is running"
else
    print_warning "Backend API might not be ready yet"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Orders App is running"
else
    print_warning "Orders App might not be ready yet"
fi

if curl -f http://localhost:3001 > /dev/null 2>&1; then
    print_success "Sales App is running"
else
    print_warning "Sales App might not be ready yet"
fi

if curl -f http://localhost:3002 > /dev/null 2>&1; then
    print_success "Admin App is running"
else
    print_warning "Admin App might not be ready yet"
fi

# Final status
print_success "🎉 ELIF Applications are now running locally!"
echo ""
echo "📱 Applications are available at:"
echo "   🛒 Orders:  http://localhost:3000"
echo "   📈 Sales:   http://localhost:3001"
echo "   ⚙️  Admin:   http://localhost:3002"
echo "   🔧 API:     http://localhost:8000"
echo ""
echo "🔧 Management commands:"
echo "   View logs:    docker-compose -f docker-compose.local.yml logs -f"
echo "   Stop apps:    docker-compose -f docker-compose.local.yml down"
echo "   Restart:      docker-compose -f docker-compose.local.yml restart"
echo "   Rebuild:      docker-compose -f docker-compose.local.yml up -d --build"
echo ""
echo "📊 Development tips:"
echo "   • Backend runs in development mode (DEBUG=True)"
echo "   • Frontend apps are built and served via Nginx"
echo "   • All apps share the same backend API"
echo "   • Database is shared across all applications"
echo ""
print_warning "Note: This is for local development only!"
print_warning "For production deployment, use the subdomain setup."
