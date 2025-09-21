#!/bin/bash

# Reset Admin Password Script
# This script helps reset the admin password for the beverage management system

echo "🔐 Beverage Management System - Admin Password Reset"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "beverage_management_system/backend/manage.py" ]; then
    echo "❌ Error: Please run this script from the WareHouse_Manager directory"
    exit 1
fi

# Navigate to backend directory
cd beverage_management_system/backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Error: Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

echo "📋 Available admin users:"
python manage.py shell -c "
from core.models import User
admins = User.objects.filter(role='admin')
for admin in admins:
    print(f'  - {admin.username} ({admin.email})')
"

echo ""
echo "🔧 Resetting admin password..."
echo "Default credentials: admin / admin123"
echo ""

# Reset admin password
python manage.py reset_admin_password

echo ""
echo "✅ Admin password reset complete!"
echo ""
echo "📝 Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🌐 Access the system at: http://localhost:3000"
echo ""
echo "💡 Tip: You can also use the backup admin account:"
echo "   Username: backup_admin"
echo "   Password: backup123"
