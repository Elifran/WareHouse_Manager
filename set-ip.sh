#!/bin/bash

# ELIF Applications - Dynamic IP Configuration Script
# This script sets the current IP address for all applications

set -e

echo "🔧 Setting up ELIF Applications with current IP address..."

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

# Get current IP address
print_status "Detecting current IP address..."
CURRENT_IP=$(ip route | grep default | awk '{print $9}' | head -1)

if [ -z "$CURRENT_IP" ]; then
    print_error "Could not determine current IP address"
    exit 1
fi

print_success "Current IP address: $CURRENT_IP"

# Set environment variables for all apps
export REACT_APP_API_URL="http://$CURRENT_IP:8000"
export REACT_APP_DYNAMIC_IP="$CURRENT_IP"
export HOST_IP="$CURRENT_IP"

print_status "Environment variables set:"
print_status "  REACT_APP_API_URL=$REACT_APP_API_URL"
print_status "  REACT_APP_DYNAMIC_IP=$REACT_APP_DYNAMIC_IP"
print_status "  HOST_IP=$HOST_IP"

# Update Django settings with current IP
print_status "Updating Django settings with current IP..."
if [ -f "elif-shared-backend/backend/config/settings.py" ]; then
    # The settings.py now automatically detects IP, but we can also update ALLOWED_HOSTS
    print_success "Django settings will automatically use current IP: $CURRENT_IP"
fi

print_success "🎉 IP configuration complete!"
echo ""
echo "📱 You can now run your applications with:"
echo "   ./deploy-with-domains.sh"
echo ""
echo "🌐 Or manually with:"
echo "   REACT_APP_API_URL=$REACT_APP_API_URL ./deploy-with-domains.sh"
echo ""
echo "🔧 Current configuration:"
echo "   Backend: http://$CURRENT_IP:8000"
echo "   Sales App: http://$CURRENT_IP:3001"
echo "   Orders App: http://$CURRENT_IP:3000"
echo "   Admin App: http://$CURRENT_IP:3002"