# 🍺 Beverage Management System

A comprehensive beverage inventory and point-of-sale management system built with Django REST Framework and React.

## Features

### Core Features
- **Dashboard**: Real-time sales metrics, inventory alerts, and recent activity
- **Inventory Management**: Product catalog, stock tracking, low stock alerts
- **Point of Sale**: Modern POS interface with cart management and payment processing
- **User Management**: Role-based access control (Admin, Manager, Sales)
- **Reports**: Sales reports, inventory reports, and analytics
- **Stock Management**: Automatic stock updates, movement tracking

### Advanced Features
- **Multi-Unit System**: Support for different units (pieces, packs, kg, liters) with automatic conversion
- **Unit Conversion**: Flexible unit relationships (e.g., 1 carton = 12 pieces, 1 kg = 1000g)
- **Product-Specific Units**: Each product can have its own set of compatible units
- **Dynamic Pricing**: Prices automatically convert based on selected unit
- **Purchase Orders & Deliveries**: Complete procurement workflow with supplier management
- **Return & Refund System**: Complete return management with stock restoration and refund tracking
- **Payment Options**: Full and partial payment support with payment status tracking
- **Print System**: Comprehensive printing for all documents with network printer support
- **System Management**: Manage tax classes, categories, units, and unit conversions
- **Stock Movement Tracking**: Complete audit trail of all stock changes
- **Role-Based Navigation**: Dynamic navigation based on user permissions

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework
- JWT Authentication
- PostgreSQL (production) / SQLite (development)
- Django Filter

### Frontend
- React 18
- React Router
- Axios for API calls
- Modern CSS with responsive design

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./setup.sh
```

### Default Admin Credentials

After setup, you can log in with these default credentials:

- **Username**: `admin`
- **Password**: `admin123`

**Backup Admin Account:**
- **Username**: `backup_admin`
- **Password**: `backup123`

### Reset Admin Password

If you need to reset the admin password:

```bash
# Use the reset script
./beverage_management_system/reset_admin.sh

# Or use the Django management command
cd beverage_management_system/backend
source venv/bin/activate
python manage.py reset_admin_password
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd beverage_management_system/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

#### Frontend Setup

```bash
cd beverage_management_system

# Install dependencies
npm install

# Start development server
npm start
```

### Option 3: Docker Setup

```bash
# Start all services with Docker
docker-compose up --build
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/
- **Docker Frontend**: http://localhost (port 80)

## Default Login

After running migrations and creating a superuser, you can log in with your admin credentials.

## API Endpoints

### Authentication
- `POST /api/core/login/` - User login
- `POST /api/core/register/` - User registration
- `GET /api/core/profile/` - User profile

### Products & Units
- `GET /api/products/` - List products
- `POST /api/products/` - Create product
- `GET /api/products/{id}/` - Product details
- `PUT /api/products/{id}/` - Update product
- `DELETE /api/products/{id}/` - Delete product
- `GET /api/products/categories/` - List categories
- `GET /api/products/units/` - List all units
- `GET /api/products/base-units/` - List base units
- `GET /api/products/unit-conversions/` - List unit conversions
- `POST /api/products/unit-conversions/` - Create unit conversion
- `GET /api/products/{id}/stock-availability/` - Get stock in different units
- `POST /api/products/bulk-stock-availability/` - Bulk stock availability check

### Sales
- `GET /api/sales/` - List sales (with date filtering)
- `POST /api/sales/` - Create sale
- `POST /api/sales/{id}/complete/` - Complete sale
- `POST /api/sales/{id}/cancel/` - Cancel sale (pending) or create return (completed)
- `POST /api/sales/{id}/payment/` - Make payment on sale
- `PATCH /api/sales/{id}/payment-method/` - Update payment method for pending sales
- `PUT /api/sales/{id}/edit/` - Edit sale items and payment information
- `GET /api/sales/summary/` - Sales summary
- `GET /api/sales/chart-data/` - Chart data for dashboard
- `GET /api/sales/pending/` - List pending sales
- `GET /api/sales/{id}/items-for-return/` - Get sale items for return processing

### Purchase Orders & Deliveries
- `GET /api/purchases/suppliers/` - List suppliers
- `POST /api/purchases/suppliers/` - Create supplier
- `GET /api/purchases/purchase-orders/` - List purchase orders
- `POST /api/purchases/purchase-orders/` - Create purchase order
- `GET /api/purchases/deliveries/` - List deliveries
- `POST /api/purchases/deliveries/` - Create delivery
- `POST /api/purchases/deliveries/confirm/` - Confirm delivery
- `GET /api/purchases/deliveries/pending/` - Get pending deliveries

### Reports & Analytics
- `GET /api/reports/dashboard/` - Dashboard data
- `POST /api/reports/sales/` - Generate sales report
- `POST /api/reports/inventory/` - Generate inventory report
- `GET /api/reports/stock-movements/` - Stock movement history

## User Roles

- **Admin**: Full access to all features including system management
- **Manager**: Access to inventory, sales, reports, and purchase orders
- **Sales**: Access to POS and basic inventory view (restricted from stock management)

## Environment Variables

Create a `.env` file in the backend directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/beverage_db
```

## Production Deployment

1. Set `DEBUG=False` in settings
2. Configure proper database (PostgreSQL recommended)
3. Set up static file serving
4. Configure environment variables
5. Use a production WSGI server (Gunicorn)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Recent Updates

### Return & Refund System
- **Complete Return Management**: Create returns for completed sales with stock restoration
- **Return Processing**: Select items to return with quantity validation
- **Refund Tracking**: Track refund amounts and payment status
- **Return Sales**: Returns are stored as separate sales with RET- prefix
- **Stock Restoration**: Automatic stock updates when returns are processed
- **Refund Information**: Display refund details and amounts to be paid back

### Payment Options & Tracking
- **Full Payment**: Complete payment at time of sale
- **Partial Payment**: Support for partial payments with remaining amount tracking
- **Payment Status**: Track payment status (Pending, Partial, Paid)
- **Payment Methods**: Support for Cash, Card, Mobile Money, Bank Transfer
- **Due Date Tracking**: Set due dates for partial payments
- **Payment History**: Complete payment tracking and history

### Enhanced Sales Management
- **Edit Sales**: Edit completed sales (when not fully paid) and pending sales
- **Cancel Sales**: Cancel pending sales or create returns for completed sales
- **Payment Method Updates**: Update payment methods for pending sales
- **Quantity Adjustments**: Modify item quantities with stock validation
- **Payment Integration**: Edit payment information within sales management

### Improved User Interface
- **Table Layout Fixes**: Fixed table alignment and column sizing issues
- **Inventory Table**: Optimized inventory table with proper column widths
- **Status Indicators**: Enhanced status badges and payment indicators
- **Responsive Design**: Improved responsive design for all screen sizes
- **Visual Feedback**: Better visual feedback for user actions

### Multi-Unit System
- **Flexible Units**: Support for pieces, packs, kg, liters, and custom units
- **Unit Conversions**: Define conversion relationships (e.g., 1 carton = 12 pieces)
- **Product-Specific Units**: Each product can have its own set of compatible units
- **Dynamic Pricing**: Prices automatically convert based on selected unit
- **Stock Display**: Show stock quantities in multiple units simultaneously

### Purchase Orders & Deliveries
- **Supplier Management**: Complete supplier database with contact information
- **Purchase Order Workflow**: Create, send, and track purchase orders
- **Delivery Processing**: Receive goods and automatically update stock
- **Side-by-Side Layout**: Modern interface with mini navigation tabs
- **Print Integration**: Print purchase orders and delivery receipts

### Enhanced Printing System
- **Network Printers**: Detect and configure network printers
- **Print Templates**: Professional print layouts for all documents
- **Unit Information**: Print reports include unit details and conversions
- **Print IDs**: Track printing with unique identifiers and timestamps
- **Payment Information**: Print receipts include payment status and amounts

### System Management
- **Tax Classes**: Manage different tax rates and categories
- **Product Categories**: Organize products with realistic categories
- **Unit Management**: Create and manage units and conversions
- **Data Validation**: Comprehensive validation with user-friendly error messages

### User Experience Improvements
- **Role-Based Navigation**: Dynamic menus based on user permissions
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Real-Time Updates**: Automatic refresh after operations
- **Enhanced Filtering**: Advanced filtering for sales and reports
- **Stock Validation**: Prevent overselling with real-time stock checks

## Support

For support, please open an issue in the GitHub repository.