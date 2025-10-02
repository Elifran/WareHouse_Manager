#!/bin/bash

# ELIF Applications - Local Development (No Docker)
# This script runs all ELIF applications locally for development without Docker

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

echo "🚀 Starting ELIF Applications Locally (Development Mode)..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Start Backend
print_status "Starting shared backend..."
cd elif-shared-backend/backend

# Install Python dependencies if needed
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Start Django backend in background
print_status "Starting Django backend on http://localhost:8000..."
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!
print_success "Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 5

# Start Orders App
print_status "Starting Orders App..."
cd ../../elif-orders-app/beverage_management_system
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:8000 npm start &
ORDERS_PID=$!
print_success "Orders App starting on http://localhost:3000 (PID: $ORDERS_PID)"

# Start Sales App
print_status "Starting Sales App..."
cd ../../elif-sales-app/beverage_management_system
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:8000 PORT=3001 npm start &
SALES_PID=$!
print_success "Sales App starting on http://localhost:3001 (PID: $SALES_PID)"

# Start Admin App
print_status "Starting Admin App..."
cd ../../elif-admin-app/beverage_management_system
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:8000 PORT=3002 npm start &
ADMIN_PID=$!
print_success "Admin App starting on http://localhost:3002 (PID: $ADMIN_PID)"

# Wait for all apps to start
print_status "Waiting for all applications to start..."
sleep 10

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
echo "   Stop all:     kill $BACKEND_PID $ORDERS_PID $SALES_PID $ADMIN_PID"
echo "   View logs:    Check terminal output above"
echo ""
echo "📊 Development tips:"
echo "   • Backend runs in development mode (DEBUG=True)"
echo "   • Frontend apps run in development mode with hot reload"
echo "   • All apps share the same backend API"
echo "   • Database is shared across all applications"
echo ""
print_warning "Press Ctrl+C to stop all applications"

# Function to cleanup on exit
cleanup() {
    print_status "Stopping all applications..."
    kill $BACKEND_PID $ORDERS_PID $SALES_PID $ADMIN_PID 2>/dev/null || true
    print_success "All applications stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
