#!/bin/bash

# Create the project structure for Beverage Management System
echo "Creating Beverage Management System project structure..."

# Create root directory
mkdir -p beverage_management_system
cd beverage_management_system

# Create backend Django structure
echo "Creating backend structure..."
mkdir -p backend
cd backend

# Create main Django project directory
django-admin startproject backend .
mkdir -p core products sales reports

# Create core app
cd core
touch __init__.py
cat > models.py << 'EOF'
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[('admin', 'Admin'), ('sales', 'Sales Agent')])
    phone_number = models.CharField(max_length=15, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"
EOF

cat > utils.py << 'EOF'
def calculate_current_stock(product_id):
    """
    Calculate current stock for a product by summing all stock movements
    """
    from products.models import StockMovement
    from django.db.models import Sum
    
    result = StockMovement.objects.filter(product_id=product_id).aggregate(Sum('quantity_change'))
    return result['quantity_change__sum'] or 0
EOF

touch admin.py apps.py serializers.py views.py

# Create products app
cd ../products
touch __init__.py
cat > models.py << 'EOF'
from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    sku = models.CharField(max_length=50, unique=True, blank=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name
    
    def current_stock(self):
        from core.utils import calculate_current_stock
        return calculate_current_stock(self.id)

class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('adjustment', 'Adjustment'),
        ('return', 'Return'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_change = models.IntegerField()  # Positive for addition, negative for subtraction
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)
    related_sale = models.ForeignKey('sales.Sale', on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_change} - {self.movement_type}"
EOF

touch admin.py apps.py serializers.py views.py

# Create sales app
cd ../sales
touch __init__.py
cat > models.py << 'EOF'
from django.db import models
from django.contrib.auth.models import User

class Sale(models.Model):
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('mobile_money', 'Mobile Money'),
        ('transfer', 'Bank Transfer'),
    ]
    
    sale_number = models.CharField(max_length=20, unique=True)
    date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    customer_name = models.CharField(max_length=100, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    def __str__(self):
        return self.sale_number

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of sale
    
    def __str__(self):
        return f"{self.sale.sale_number} - {self.product.name}"
    
    def total_price(self):
        return self.quantity * self.unit_price
EOF

touch admin.py apps.py serializers.py views.py

# Create reports app
cd ../reports
touch __init__.py
cat > models.py << 'EOF'
# This app is for report generation, may not need models
# Reports will be generated from data in other apps
EOF

touch admin.py apps.py serializers.py views.py

# Create requirements.txt
cd ..
cat > requirements.txt << 'EOF'
Django==4.2.7
djangorestframework==3.14.0
django-cors-headers==4.3.1
djangorestframework-simplejwt==5.3.0
psycopg2-binary==2.9.7
python-decouple==3.8
EOF

# Create frontend React structure
cd ..
echo "Creating frontend structure..."
npx create-react-app frontend
cd frontend

# Create additional directories
mkdir -p src/components src/pages src/services src/contexts src/hooks src/utils

# Create basic component files
touch src/components/Button.js src/components/Table.js src/components/Navbar.js

# Create page files
touch src/pages/Dashboard.js src/pages/PointOfSale.js src/pages/Inventory.js src/pages/Login.js

# Create service files
touch src/services/api.js src/services/auth.js

# Create context files
touch src/contexts/AuthContext.js

# Create hook files
touch src/hooks/useApi.js src/hooks/useAuth.js

# Create utility files
touch src/utils/helpers.js

# Create Dockerfile
cat > Dockerfile << 'EOF'
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --silent
COPY . ./
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create a simple nginx configuration file
cat > nginx.conf << 'EOF'
server {
    listen 80;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Update package.json with additional dependencies
cat > package.json << 'EOF'
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.4",
    "@testing-library/react": "^13.3.0",
    "@testing-library/user-event": "^13.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "react-query": "^3.39.0",
    "react-hook-form": "^7.43.0",
    "recharts": "^2.5.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

# Create basic App.js component
cat > src/App.js << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PointOfSale from './pages/PointOfSale';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<PointOfSale />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
EOF

# Create a basic api service
cat > src/services/api.js << 'EOF'
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken
        });
        
        const { access } = response.data;
        localStorage.setItem('accessToken', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
EOF

cd ../..

echo "Project structure created successfully!"
echo "Next steps:"
echo "1. cd beverage_management_system/backend"
echo "2. python -m venv venv"
echo "3. source venv/bin/activate (or venv\Scripts\activate on Windows)"
echo "4. pip install -r requirements.txt"
echo "5. Add 'core', 'products', 'sales', 'reports' to INSTALLED_APPS in backend/settings.py"
echo "6. python manage.py makemigrations"
echo "7. python manage.py migrate"
echo "8. cd ../frontend && npm install"
echo "9. npm start"