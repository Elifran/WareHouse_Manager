# 🏠 ELIF Local Development Guide

This guide shows you how to run all ELIF applications locally for development and testing.

## 🎯 **Local Development Options**

You have **3 ways** to run the applications locally:

### **Option 1: Docker Compose (Recommended)**
- All apps in containers
- Production-like environment
- Easy to manage

### **Option 2: Direct Development (Fastest)**
- Apps run directly on your machine
- Hot reload for frontend
- Faster development cycle

### **Option 3: Mixed Approach**
- Backend in Docker, frontend directly
- Best of both worlds

## 🐳 **Option 1: Docker Compose Setup**

### **Quick Start:**
```bash
# Run all applications with Docker
./run-local.sh
```

### **Manual Steps:**
```bash
# 1. Create Docker network
docker network create elif-network

# 2. Start shared backend
cd elif-shared-backend
docker-compose up -d --build

# 3. Build frontend apps
cd ../elif-orders-app/beverage_management_system
npm install && npm run build

cd ../../elif-sales-app/beverage_management_system
npm install && npm run build

cd ../../elif-admin-app/beverage_management_system
npm install && npm run build

# 4. Start all applications
cd ../../
docker-compose -f docker-compose.local.yml up -d --build
```

### **Access Applications:**
- **🛒 Orders**: http://localhost:3000
- **📈 Sales**: http://localhost:3001
- **⚙️ Admin**: http://localhost:3002
- **🔧 API**: http://localhost:8000

### **Management Commands:**
```bash
# View logs
docker-compose -f docker-compose.local.yml logs -f

# Stop all apps
docker-compose -f docker-compose.local.yml down

# Restart all apps
docker-compose -f docker-compose.local.yml restart

# Rebuild and restart
docker-compose -f docker-compose.local.yml up -d --build
```

## 🚀 **Option 2: Direct Development Setup**

### **Quick Start:**
```bash
# Run all applications directly
./run-local-dev.sh
```

### **Manual Steps:**

#### **1. Start Backend:**
```bash
cd elif-shared-backend/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Django backend
python manage.py runserver 0.0.0.0:8000
```

#### **2. Start Frontend Apps (in separate terminals):**

**Orders App:**
```bash
cd elif-orders-app/beverage_management_system
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

**Sales App:**
```bash
cd elif-sales-app/beverage_management_system
npm install
REACT_APP_API_URL=http://localhost:8000 PORT=3001 npm start
```

**Admin App:**
```bash
cd elif-admin-app/beverage_management_system
npm install
REACT_APP_API_URL=http://localhost:8000 PORT=3002 npm start
```

### **Access Applications:**
- **🛒 Orders**: http://localhost:3000
- **📈 Sales**: http://localhost:3001
- **⚙️ Admin**: http://localhost:3002
- **🔧 API**: http://localhost:8000

## 🔧 **Option 3: Mixed Approach**

### **Backend in Docker, Frontend Directly:**

#### **1. Start Backend in Docker:**
```bash
cd elif-shared-backend
docker-compose up -d --build
```

#### **2. Start Frontend Apps Directly:**
```bash
# Orders App
cd elif-orders-app/beverage_management_system
npm install
REACT_APP_API_URL=http://localhost:8000 npm start

# Sales App (in new terminal)
cd elif-sales-app/beverage_management_system
npm install
REACT_APP_API_URL=http://localhost:8000 PORT=3001 npm start

# Admin App (in new terminal)
cd elif-admin-app/beverage_management_system
npm install
REACT_APP_API_URL=http://localhost:8000 PORT=3002 npm start
```

## 📋 **Prerequisites**

### **For Docker Setup:**
- Docker
- Docker Compose
- Node.js (for building frontend)

### **For Direct Development:**
- Node.js 18+
- Python 3.8+
- pip

## 🛠️ **Development Features**

### **Backend (Django):**
- **Debug Mode**: Enabled for development
- **Hot Reload**: Automatic restart on code changes
- **Database**: SQLite (shared across all apps)
- **API**: REST API with CORS enabled

### **Frontend (React):**
- **Hot Reload**: Automatic refresh on code changes
- **Development Server**: Fast compilation
- **API Integration**: Connected to shared backend
- **Multi-language**: i18n support

## 🔍 **Troubleshooting**

### **Port Already in Use:**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001
lsof -i :3002
lsof -i :8000

# Kill process using the port
kill -9 <PID>
```

### **Docker Issues:**
```bash
# Clean up Docker containers
docker-compose -f docker-compose.local.yml down
docker system prune -f

# Rebuild everything
docker-compose -f docker-compose.local.yml up -d --build --force-recreate
```

### **Node.js Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### **Python Issues:**
```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 📊 **Development Workflow**

### **1. Code Changes:**
- **Frontend**: Changes are automatically reflected (hot reload)
- **Backend**: Restart required for changes to take effect

### **2. Database Changes:**
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### **3. Adding Dependencies:**
```bash
# Frontend
npm install <package-name>

# Backend
pip install <package-name>
pip freeze > requirements.txt
```

## 🎯 **Local URLs Summary**

| Application | URL | Purpose |
|-------------|-----|---------|
| Orders App | http://localhost:3000 | Point of sale and orders |
| Sales App | http://localhost:3001 | Sales analytics and reports |
| Admin App | http://localhost:3002 | Administration and management |
| Backend API | http://localhost:8000 | Shared Django API |
| Django Admin | http://localhost:8000/admin | Database administration |

## 🚀 **Quick Commands**

```bash
# Start everything with Docker
./run-local.sh

# Start everything directly
./run-local-dev.sh

# Stop Docker setup
docker-compose -f docker-compose.local.yml down

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Rebuild everything
docker-compose -f docker-compose.local.yml up -d --build --force-recreate
```

## 🎉 **Ready for Development!**

Choose the setup that works best for you:
- **Docker**: For production-like testing
- **Direct**: For fastest development
- **Mixed**: For backend stability + frontend speed

All setups share the same backend API and database, ensuring consistency across your development environment.
