# Warehouse Manager - Application Architecture

## 🏗️ **Overall Architecture**

The Warehouse Manager is a **microservices-based application** built with a **shared backend** and **multiple frontend applications**, all containerized with Docker.

```
┌─────────────────────────────────────────────────────────────┐
│                    WAREHOUSE MANAGER                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend Applications (React + Nginx)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Admin App   │ │ Orders App  │ │ Sales App   │          │
│  │ Port: 3002  │ │ Port: 3000  │ │ Port: 3001  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Shared Backend (Django REST API)                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Django + DRF + SQLite + JWT Auth                       │ │
│  │ Port: 8000                                             │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                             │
│  • Docker Compose                                          │
│  • Nginx (Frontend)                                        │
│  • SQLite Database                                         │
│  • JWT Authentication                                      │
│  • CORS Configuration                                      │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 **Application Components**

### **1. Frontend Applications (3 Apps)**

#### **Admin App** (`elif-admin-app`)
- **Purpose**: Administrative interface for managers and admins
- **Port**: 3002
- **Features**:
  - Dashboard with analytics
  - Inventory management
  - User management
  - System configuration
  - Purchase orders
  - Suppliers management
  - Tax management
  - Stock movement tracking

#### **Orders App** (`elif-orders-app`)
- **Purpose**: Order processing and management
- **Port**: 3000
- **Features**:
  - Purchase order creation
  - Order tracking
  - Supplier management
  - Inventory updates

#### **Sales App** (`elif-sales-app`)
- **Purpose**: Point of sale and sales management
- **Port**: 3001
- **Features**:
  - POS interface
  - Sales transactions
  - Customer management
  - Sales reporting

### **2. Shared Backend** (`elif-shared-backend`)

#### **Django REST API**
- **Framework**: Django 4.2.7 + Django REST Framework
- **Port**: 8000
- **Database**: SQLite
- **Authentication**: JWT (SimpleJWT)

#### **API Modules**:
- **Core**: User management, authentication, health checks
- **Products**: Product catalog, inventory, stock management
- **Sales**: Sales transactions, POS operations
- **Purchases**: Purchase orders, supplier management
- **Reports**: Analytics, dashboards, reporting

## 🛠️ **Technology Stack**

### **Frontend Stack**
```json
{
  "framework": "React 18.2.0",
  "routing": "React Router DOM 6.8.0",
  "state_management": "React Query 3.39.0",
  "forms": "React Hook Form 7.43.0",
  "http_client": "Axios 1.3.0",
  "internationalization": "i18next + react-i18next",
  "charts": "Recharts 2.5.0",
  "build_tool": "Create React App",
  "web_server": "Nginx (Alpine)"
}
```

### **Backend Stack**
```python
{
  "framework": "Django 4.2.7",
  "api": "Django REST Framework 3.14.0",
  "authentication": "SimpleJWT 5.3.0",
  "cors": "django-cors-headers 4.3.1",
  "filtering": "django-filter 23.3",
  "configuration": "python-decouple 3.8",
  "database": "SQLite",
  "language": "Python 3.11"
}
```

### **Infrastructure Stack**
```yaml
containerization: Docker + Docker Compose
web_server: Nginx (Alpine Linux)
database: SQLite
networking: Docker networks
monitoring: Custom shell scripts
deployment: Docker Compose with health checks
```

## 🏗️ **Build Process**

### **Frontend Build Process**
1. **Development**: `npm start` (React development server)
2. **Production Build**: `npm run build` (Creates optimized build)
3. **Docker Build**: Multi-stage build with Nginx
4. **Deployment**: Static files served by Nginx

### **Backend Build Process**
1. **Dependencies**: Install Python packages from `requirements.txt`
2. **Database**: SQLite database with migrations
3. **Docker Build**: Python 3.11 slim base image
4. **Deployment**: Django development server (production ready)

## 📁 **Project Structure**

```
WareHouse_Manager/
├── elif-admin-app/                 # Admin frontend application
│   ├── beverage_management_system/
│   │   ├── src/                   # React source code
│   │   │   ├── components/        # Reusable components
│   │   │   ├── pages/            # Page components
│   │   │   ├── contexts/         # React contexts
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── services/         # API services
│   │   │   └── i18n/             # Internationalization
│   │   ├── build/                # Production build
│   │   ├── Dockerfile            # Frontend container
│   │   └── nginx.conf            # Nginx configuration
│   └── docker-compose.yml        # Admin app deployment
├── elif-orders-app/               # Orders frontend application
│   └── [similar structure to admin app]
├── elif-sales-app/                # Sales frontend application
│   └── [similar structure to admin app]
├── elif-shared-backend/           # Shared backend API
│   └── backend/
│       ├── config/               # Django settings
│       ├── core/                 # Core functionality
│       ├── products/             # Product management
│       ├── sales/                # Sales management
│       ├── purchases/            # Purchase management
│       ├── reports/              # Reporting
│       ├── db.sqlite3            # SQLite database
│       ├── manage.py             # Django management
│       └── Dockerfile            # Backend container
└── [monitoring and deployment scripts]
```

## 🔐 **Authentication & Authorization**

### **JWT Authentication**
- **Token Type**: Access + Refresh tokens
- **Expiration**: Configurable token lifetime
- **Storage**: Local storage in frontend
- **Refresh**: Automatic token refresh

### **Role-Based Access Control**
```javascript
Roles:
- admin: Full system access
- manager: Management functions
- sales: Sales operations only
```

### **Protected Routes**
- **Authentication Required**: All routes except login
- **Role-Based Access**: Different features per role
- **Sales Blocking**: Sales users blocked from admin functions

## 🌐 **API Architecture**

### **RESTful API Design**
```
Base URL: http://[IP]:8000/api/

Endpoints:
├── /api/health/                  # Health check
├── /api/token/                   # JWT authentication
├── /api/token/refresh/           # Token refresh
├── /api/core/                    # User management
├── /api/products/                # Product operations
├── /api/sales/                   # Sales operations
├── /api/purchases/               # Purchase operations
└── /api/reports/                 # Reporting
```

### **API Features**
- **Pagination**: Large dataset handling
- **Filtering**: Advanced query filtering
- **Search**: Full-text search capabilities
- **CORS**: Cross-origin resource sharing
- **Validation**: Request/response validation

## 🐳 **Docker Configuration**

### **Frontend Containers**
```dockerfile
# Multi-stage build
Stage 1: Node.js build (npm run build)
Stage 2: Nginx serve (Alpine Linux)
```

### **Backend Container**
```dockerfile
# Single stage
Base: Python 3.11 slim
Dependencies: PostgreSQL client, build tools
Application: Django + DRF
```

### **Docker Compose**
- **Networks**: Shared `elif-network`
- **Volumes**: Database persistence
- **Health Checks**: Backend health monitoring
- **Restart Policy**: `unless-stopped`

## 🚀 **Deployment Architecture**

### **Network Configuration**
- **Static IP**: 10.10.1.1 (primary)
- **Dynamic IP**: 192.168.13.215 (fallback)
- **Domain Support**: elif domains (admin.elif, orders.elif, sales.elif)

### **Port Mapping**
```
Frontend Apps:
- Admin: 10.10.1.1:3002
- Orders: 10.10.1.1:3000
- Sales: 10.10.1.1:3001

Backend API:
- API: 10.10.1.1:8000
```

### **Environment Configuration**
- **Frontend**: `REACT_APP_API_URL` environment variable
- **Backend**: `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- **Dynamic IP**: Automatic IP detection and configuration

## 📊 **Database Schema**

### **Core Models**
- **User**: Extended Django user with roles
- **Product**: Product catalog with variants
- **Inventory**: Stock levels and movements
- **Sales**: Sales transactions and items
- **Purchases**: Purchase orders and suppliers

### **Key Features**
- **Unit Conversion**: Flexible unit system
- **Stock Tracking**: Real-time inventory
- **Multi-currency**: Currency support
- **Tax Management**: Configurable tax rates

## 🔧 **Development Workflow**

### **Frontend Development**
1. **Setup**: `npm install`
2. **Development**: `npm start`
3. **Build**: `npm run build`
4. **Test**: `npm test`

### **Backend Development**
1. **Setup**: `pip install -r requirements.txt`
2. **Migrations**: `python manage.py migrate`
3. **Development**: `python manage.py runserver`
4. **Admin**: `python manage.py createsuperuser`

### **Full Stack Development**
1. **Backend**: Start Django server
2. **Frontend**: Start React development server
3. **API Integration**: Frontend connects to backend
4. **Testing**: Full stack testing

## 📈 **Monitoring & Observability**

### **Health Checks**
- **Backend**: `/api/health/` endpoint
- **Frontend**: Connection status component
- **Docker**: Container health checks

### **Logging**
- **Backend**: Django logging
- **Frontend**: Console logging
- **Nginx**: Access and error logs
- **Docker**: Container logs

### **Monitoring Scripts**
- **Real-time Logs**: Live log monitoring
- **Health Dashboard**: Service status
- **Performance**: Resource usage
- **Connections**: Network monitoring

## 🎯 **Key Features**

### **Multi-Application Architecture**
- **Separation of Concerns**: Different apps for different roles
- **Shared Backend**: Single API for all frontends
- **Role-Based Access**: Different features per user type

### **Scalability**
- **Microservices**: Independent frontend applications
- **Containerized**: Easy deployment and scaling
- **Database**: SQLite for simplicity (can be upgraded to PostgreSQL)

### **User Experience**
- **Responsive Design**: Works on all devices
- **Internationalization**: Multi-language support
- **Real-time Updates**: Live data synchronization
- **Offline Capability**: Local storage and caching

### **Security**
- **JWT Authentication**: Secure token-based auth
- **CORS Configuration**: Controlled cross-origin access
- **Role-Based Access**: Granular permissions
- **Input Validation**: Server-side validation

---

**🎉 This is a modern, scalable warehouse management system built with best practices in mind!**
