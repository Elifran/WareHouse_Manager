#!/bin/bash

# Configure Other Devices to Access ELIF Applications
# This script provides instructions for configuring other devices on the 10.10.1.0/24 network

echo "📱 Configure Other Devices for ELIF Applications"
echo "==============================================="

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

# Get current network information
DYNAMIC_IP=$(ip route | grep default | awk '{print $9}' | head -1)
STATIC_IP="10.10.1.1"

print_status "ELIF Server Configuration:"
print_status "  Static IP: $STATIC_IP (for other devices)"
print_status "  Dynamic IP: $DYNAMIC_IP (current internet connection)"
print_status "  Network: 10.10.1.0/24"

echo ""
print_status "📋 Instructions for Other Devices:"
echo "========================================"

echo ""
print_warning "Method 1: Static IP Configuration (Recommended)"
echo "------------------------------------------------------"
echo "Configure other devices with static IPs in the 10.10.1.0/24 range:"
echo ""
echo "📱 For each device, set:"
echo "   IP Address: 10.10.1.X (where X = 2-254)"
echo "   Subnet Mask: 255.255.255.0"
echo "   Gateway: 10.10.1.1"
echo "   DNS: 8.8.8.8 (or your preferred DNS)"
echo ""
echo "📱 Example configurations:"
echo "   Device 1: 10.10.1.2"
echo "   Device 2: 10.10.1.3"
echo "   Device 3: 10.10.1.4"
echo "   etc..."

echo ""
print_warning "Method 2: DHCP Configuration (If supported)"
echo "--------------------------------------------------"
echo "If your router supports custom DHCP ranges:"
echo "   Configure DHCP to assign 10.10.1.0/24 range"
echo "   Set gateway to 10.10.1.1"

echo ""
print_status "🌐 Access URLs for Other Devices:"
echo "======================================"
echo ""
echo "Once configured, other devices can access:"
echo ""
echo "🛒 Orders App:"
echo "   http://10.10.1.1:3000"
echo ""
echo "📈 Sales App:"
echo "   http://10.10.1.1:3001"
echo ""
echo "⚙️  Admin App:"
echo "   http://10.10.1.1:3002"
echo ""
echo "🔧 Backend API:"
echo "   http://10.10.1.1:8000"
echo ""

echo ""
print_status "🔧 Platform-Specific Instructions:"
echo "======================================="

echo ""
print_warning "Windows:"
echo "---------"
echo "1. Open Network Settings"
echo "2. Change adapter options"
echo "3. Right-click your network adapter → Properties"
echo "4. Select 'Internet Protocol Version 4 (TCP/IPv4)' → Properties"
echo "5. Select 'Use the following IP address'"
echo "6. Enter: IP=10.10.1.X, Subnet=255.255.255.0, Gateway=10.10.1.1"
echo "7. DNS: 8.8.8.8"

echo ""
print_warning "Android:"
echo "--------"
echo "1. Go to Settings → Wi-Fi"
echo "2. Long-press your network → Modify network"
echo "3. Advanced options → IP settings → Static"
echo "4. Enter: IP=10.10.1.X, Gateway=10.10.1.1, DNS1=8.8.8.8"

echo ""
print_warning "iOS:"
echo "----"
echo "1. Settings → Wi-Fi"
echo "2. Tap (i) next to your network"
echo "3. Configure IP → Manual"
echo "4. Enter: IP=10.10.1.X, Subnet=255.255.255.0, Router=10.10.1.1"

echo ""
print_warning "Linux:"
echo "------"
echo "1. Edit /etc/netplan/50-cloud-init.yaml (Ubuntu)"
echo "2. Or use nmcli:"
echo "   nmcli connection modify <connection> ipv4.addresses 10.10.1.X/24"
echo "   nmcli connection modify <connection> ipv4.gateway 10.10.1.1"
echo "   nmcli connection modify <connection> ipv4.dns 8.8.8.8"
echo "   nmcli connection modify <connection> ipv4.method manual"

echo ""
print_status "🧪 Testing Connectivity:"
echo "============================"
echo ""
echo "After configuring, test from other devices:"
echo ""
echo "1. Ping test:"
echo "   ping 10.10.1.1"
echo ""
echo "2. Web access test:"
echo "   Open browser → http://10.10.1.1:3000"
echo ""
echo "3. Backend test:"
echo "   curl http://10.10.1.1:8000/api/health/"

echo ""
print_status "🔧 Troubleshooting:"
echo "======================"
echo ""
echo "If devices can't connect:"
echo "1. Check IP configuration (must be 10.10.1.X)"
echo "2. Check subnet mask (255.255.255.0)"
echo "3. Check gateway (10.10.1.1)"
echo "4. Test ping: ping 10.10.1.1"
echo "5. Check firewall on ELIF server"
echo "6. Verify ELIF applications are running"

echo ""
print_success "🎉 Configuration Complete!"
echo ""
echo "📱 Other devices configured with 10.10.1.X IPs will be able to access:"
echo "   🛒 Orders: http://10.10.1.1:3000"
echo "   📈 Sales: http://10.10.1.1:3001"
echo "   ⚙️  Admin: http://10.10.1.1:3002"
echo "   🔧 Backend: http://10.10.1.1:8000"
echo ""
print_success "✨ This approach is more reliable than dynamic IPs!"
