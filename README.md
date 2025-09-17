# 🍺 Beverage Management System

A comprehensive beverage inventory and point-of-sale management system built with Django REST Framework and React.

## Features

- **Dashboard**: Real-time sales metrics, inventory alerts, and recent activity
- **Inventory Management**: Product catalog, stock tracking, low stock alerts
- **Point of Sale**: Modern POS interface with cart management and payment processing
- **User Management**: Role-based access control (Admin, Manager, Sales)
- **Reports**: Sales reports, inventory reports, and analytics
- **Stock Management**: Automatic stock updates, movement tracking

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

### Products
- `GET /api/products/` - List products
- `POST /api/products/` - Create product
- `GET /api/products/{id}/` - Product details
- `PUT /api/products/{id}/` - Update product
- `DELETE /api/products/{id}/` - Delete product
- `GET /api/products/categories/` - List categories

### Sales
- `GET /api/sales/` - List sales
- `POST /api/sales/` - Create sale
- `POST /api/sales/{id}/complete/` - Complete sale
- `GET /api/sales/summary/` - Sales summary

### Reports
- `GET /api/reports/dashboard/` - Dashboard data
- `POST /api/reports/sales/` - Generate sales report
- `POST /api/reports/inventory/` - Generate inventory report

## User Roles

- **Admin**: Full access to all features
- **Manager**: Access to inventory, sales, and reports
- **Sales**: Access to POS and basic inventory view

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

## Support

For support, please open an issue in the GitHub repository.