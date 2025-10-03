# ELIF - Three Independent Applications

This project has been restructured into **3 completely independent applications** that can be deployed and managed separately:

## 📱 Application Structure

### 1. **ELIF Orders App** (`elif-orders-app/`)
**Purpose**: Point of sale and order processing
- **Location**: `/home/el-ifran/WareHouse_Manager/elif-orders-app/`
- **Features**:
  - Point of Sale (POS)
  - Sales Management
  - Pending Sales
  - Returns & Refunds
- **Default Route**: `/pos`
- **Target Users**: Sales staff, cashiers

### 2. **ELIF Sales App** (`elif-sales-app/`)
**Purpose**: Sales analytics and reporting
- **Location**: `/home/el-ifran/WareHouse_Manager/elif-sales-app/`
- **Features**:
  - Dashboard
  - Reports
  - Analytics
- **Default Route**: `/dashboard`
- **Target Users**: Managers, analysts

### 3. **ELIF Admin App** (`elif-admin-app/`)
**Purpose**: Administration and management
- **Location**: `/home/el-ifran/WareHouse_Manager/elif-admin-app/`
- **Features**:
  - Inventory Management
  - Purchase Orders
  - Suppliers
  - Users Management
  - System Management
  - Tax Management
  - Stock Movement
  - **All Pages** - Comprehensive navigation to all features
- **Default Route**: `/inventory`
- **Target Users**: Administrators, managers

## 🔧 Technical Details

### Shared Backend
All 3 applications share the same Django backend API:
- **Backend Location**: Each app contains a copy of the backend in `beverage_management_system/backend/`
- **API Endpoints**: All apps use the same API endpoints
- **Database**: Shared SQLite database (can be configured for separate databases)

### Independent Frontend Applications
Each app is a complete React application with:
- **Independent routing**
- **Customized navigation**
- **App-specific branding**
- **Separate build processes**

## 🚀 Deployment Options

### Option 1: Separate Deployments
Deploy each app independently:
```bash
# Orders App
cd elif-orders-app/beverage_management_system
npm run build
# Deploy to orders.elif.com

# Sales App  
cd elif-sales-app/beverage_management_system
npm run build
# Deploy to sales.elif.com

# Admin App
cd elif-admin-app/beverage_management_system
npm run build
# Deploy to admin.elif.com
```

### Option 2: Subdirectory Deployment
Deploy all apps under different paths:
```bash
# Orders App: yourdomain.com/elif-orders-app/
# Sales App: yourdomain.com/elif-sales-app/
# Admin App: yourdomain.com/elif-admin-app/
```

### Option 3: Single Domain with Routing
Use a reverse proxy to route based on subdomain or path.

## 🔗 Cross-App Navigation

The **Admin App** includes an "All Pages" feature that provides:
- Overview of all available pages across all 3 apps
- Direct links to access other applications
- Comprehensive navigation hub

## 🖨️ Printer Management

**Printer settings have been removed from the Admin App** as requested. Each device should have its own printer configuration:
- **Shared Printers**: Can be configured per device
- **Individual Printers**: Each device manages its own printer
- **Online Discovery**: Automatic printer detection per device

## 📁 File Structure

```
WareHouse_Manager/
├── elif-orders-app/           # Orders Application
│   └── beverage_management_system/
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── backend/           # Shared backend
├── elif-sales-app/            # Sales Application  
│   └── beverage_management_system/
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── backend/           # Shared backend
├── elif-admin-app/            # Admin Application
│   └── beverage_management_system/
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── backend/           # Shared backend
└── beverage_management_system/ # Original application (kept for reference)
```

## 🛠️ Development

### Running Individual Apps
```bash
# Orders App
cd elif-orders-app/beverage_management_system
npm start

# Sales App
cd elif-sales-app/beverage_management_system  
npm start

# Admin App
cd elif-admin-app/beverage_management_system
npm start
```

### Backend Development
The backend is shared across all apps. Make changes in any app's backend directory and they will be reflected in all apps.

## 🔐 User Roles & Permissions

- **Sales Users**: Can only access Orders App
- **Managers**: Can access Sales App and Admin App (limited features)
- **Administrators**: Full access to all apps and features

## 🌐 Internationalization

All 3 apps support:
- **English** (en)
- **French** (fr) 
- **Malagasy** (mg)

Language preferences are maintained across all apps.

## 📊 Benefits of This Structure

1. **Independent Scaling**: Scale each app based on usage
2. **Focused User Experience**: Each app is tailored to specific user roles
3. **Easier Maintenance**: Changes to one app don't affect others
4. **Flexible Deployment**: Deploy apps to different servers/domains
5. **Role-Based Access**: Users only see relevant features
6. **Reduced Complexity**: Simpler navigation and fewer features per app

## 🔄 Migration from Original App

The original `beverage_management_system/` has been preserved for reference. The 3 new apps contain all the functionality from the original app, but organized by purpose and user role.
