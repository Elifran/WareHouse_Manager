#!/bin/bash

echo "🍺 Setting up Beverage Management System..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup Backend
echo "🔧 Setting up Django backend..."
cd beverage_management_system/backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install setuptools
pip install -r requirements.txt

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser if it doesn't exist
echo "Creating superuser account..."
python manage.py shell -c "
from core.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123', role='admin')
    print('Admin user created successfully!')
else:
    print('Admin user already exists!')
"

echo "✅ Backend setup completed"

# Setup Frontend
echo "🔧 Setting up React frontend..."
cd ../

# Install npm dependencies
echo "Installing Node.js dependencies..."
npm install

echo "✅ Frontend setup completed"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start the development servers:"
echo ""
echo "Backend (Terminal 1):"
echo "  cd beverage_management_system/backend"
echo "  source venv/bin/activate"
echo "  python manage.py runserver"
echo ""
echo "Frontend (Terminal 2):"
echo "  cd beverage_management_system"
echo "  npm start"
echo ""
echo "Then visit:"
echo "  Frontend: http://localhost:3000"
echo "  Backend Admin: http://localhost:8000/admin"
echo ""
echo "Or use Docker:"
echo "  docker-compose up --build"
echo ""

# cd beverage_management_system/backend
# source venv/bin/activate
# python manage.py runserver

# cd beverage_management_system
# npm start