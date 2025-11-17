#!/bin/bash

# Full Rebuild Script for ELIF Applications
# This script performs a complete rebuild of all applications without running them

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔨 ELIF Full Rebuild Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to print status
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

# Check if we're in the right directory
if [ ! -d "elif-shared-backend" ] || [ ! -d "elif-sales-app" ] || [ ! -d "elif-orders-app" ] || [ ! -d "elif-admin-app" ]; then
    print_error "Please run this script from the WareHouse_Manager root directory"
    exit 1
fi

print_status "Starting full rebuild of all ELIF applications..."
echo ""

# 1. Backend Rebuild
print_status "1. Rebuilding Backend (elif-shared-backend)..."
cd elif-shared-backend/backend

# Clean up any existing build artifacts
print_status "   Cleaning backend build artifacts..."
rm -rf __pycache__/
rm -rf */__pycache__/
rm -rf */migrations/__pycache__/
find . -name "*.pyc" -delete

# Activate virtual environment
print_status "   Activating Python virtual environment..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    print_success "   Virtual environment activated"
else
    print_error "   Virtual environment not found at venv/bin/activate"
    print_error "   Please ensure the virtual environment is set up correctly"
    exit 1
fi

# Run Django migrations (if needed)
print_status "   Running Django migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Collect static files
print_status "   Collecting static files..."
python manage.py collectstatic --noinput

# Deactivate virtual environment
deactivate

cd ../..
print_success "   Backend rebuild completed"
echo ""

# 2. Sales App Rebuild
print_status "2. Rebuilding Sales App (elif-sales-app)..."
cd elif-sales-app/beverage_management_system

# Clean build directory
print_status "   Cleaning sales app build directory..."
rm -rf build/
rm -rf node_modules/.cache/

# Install dependencies (if package-lock.json changed)
print_status "   Installing/updating dependencies..."
npm ci --legacy-peer-deps

# Build the application
print_status "   Building sales app..."
npm run build

cd ../..
print_success "   Sales app rebuild completed"
echo ""

# 3. Orders App Rebuild
print_status "3. Rebuilding Orders App (elif-orders-app)..."
cd elif-orders-app/beverage_management_system

# Clean build directory
print_status "   Cleaning orders app build directory..."
rm -rf build/
rm -rf node_modules/.cache/

# Install dependencies (if package-lock.json changed)
print_status "   Installing/updating dependencies..."
npm ci --legacy-peer-deps

# Build the application
print_status "   Building orders app..."
npm run build

cd ../..
print_success "   Orders app rebuild completed"
echo ""

# 4. Admin App Rebuild
print_status "4. Rebuilding Admin App (elif-admin-app)..."
cd elif-admin-app/beverage_management_system

# Clean build directory
print_status "   Cleaning admin app build directory..."
rm -rf build/
rm -rf node_modules/.cache/

# Install dependencies (if package-lock.json changed)
print_status "   Installing/updating dependencies..."
npm ci --legacy-peer-deps

# Build the application
print_status "   Building admin app..."
npm run build

cd ../..
print_success "   Admin app rebuild completed"
echo ""

# 5. Docker Images Rebuild (without running)
print_status "5. Rebuilding Docker images..."
echo ""

# Backend Docker image
print_status "   Building backend Docker image..."
cd elif-shared-backend
docker build -t elif-shared-backend-elif-backend .
cd ..

# Sales App Docker image
print_status "   Building sales app Docker image..."
cd elif-sales-app
docker build -t elif-sales-app-elif-sales-app .
cd ..

# Orders App Docker image
print_status "   Building orders app Docker image..."
cd elif-orders-app
docker build -t elif-orders-app-elif-orders-app .
cd ..

# Admin App Docker image
print_status "   Building admin app Docker image..."
cd elif-admin-app
docker build -t elif-admin-app-elif-admin-app .
cd ..

print_success "   All Docker images rebuilt"
echo ""

# 6. Summary
print_success "🎉 Full rebuild completed successfully!"
echo ""
echo -e "${BLUE}📋 Rebuild Summary:${NC}"
echo "   ✅ Backend (Django) - Migrations, static files, and Docker image"
echo "   ✅ Sales App (React) - Dependencies, build, and Docker image"
echo "   ✅ Orders App (React) - Dependencies, build, and Docker image"
echo "   ✅ Admin App (React) - Dependencies, build, and Docker image"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "   • To start the applications, run: ./start-system.sh"
echo ""
echo -e "${GREEN}🚀 All applications are ready for deployment!${NC}"
