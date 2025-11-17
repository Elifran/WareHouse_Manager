#!/bin/bash

# Setup ELIF Domains for Linux/Mac Devices
# Run this script on other Linux/Mac devices to enable domain access

echo "🌐 Setting up ELIF domains for this device..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo):"
    echo "sudo ./setup-domains-linux.sh"
    exit 1
fi

# Get current IP
CURRENT_IP=$(ip route | grep default | awk '{print $9}' | head -1)
if [ -z "$CURRENT_IP" ]; then
    CURRENT_IP=$(hostname -I | awk '{print $1}')
fi

echo "Current IP: $CURRENT_IP"

# Remove existing ELIF domains
echo "Cleaning up existing ELIF domains..."
sed -i.bak '/\.elif$/d' /etc/hosts

# Add all ELIF domains to hosts file with current IP
echo "Adding ELIF domains to /etc/hosts..."
echo "$CURRENT_IP orders.elif" >> /etc/hosts
echo "$CURRENT_IP sales.elif" >> /etc/hosts
echo "$CURRENT_IP admin.elif" >> /etc/hosts
echo "$CURRENT_IP api.elif" >> /etc/hosts

echo "✅ ELIF domains added successfully!"
echo ""
echo "📱 You can now access:"
echo "   🛒 Orders: http://orders.elif"
echo "   📈 Sales:  http://sales.elif"
echo "   ⚙️  Admin:  http://admin.elif"
echo "   🔧 Backend: http://api.elif"
echo ""
echo "🧪 Test with: ping orders.elif"