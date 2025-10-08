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

# Check if domains already exist
if grep -q "orders.elif" /etc/hosts; then
    echo "ELIF domains already configured in /etc/hosts"
    echo "Current configuration:"
    grep "elif" /etc/hosts
    exit 0
fi

# Add ELIF domains to hosts file
echo "Adding ELIF domains to /etc/hosts..."
echo "10.10.1.1 orders.elif" >> /etc/hosts
echo "10.10.1.1 sales.elif" >> /etc/hosts
echo "10.10.1.1 admin.elif" >> /etc/hosts
echo "10.10.1.1 api.elif" >> /etc/hosts

echo "✅ ELIF domains added successfully!"
echo ""
echo "📱 You can now access:"
echo "   🛒 Orders: http://orders.elif"
echo "   📈 Sales:  http://sales.elif"
echo "   ⚙️  Admin:  http://admin.elif"
echo "   🔧 Backend: http://api.elif"
echo ""
echo "🧪 Test with: ping orders.elif"
