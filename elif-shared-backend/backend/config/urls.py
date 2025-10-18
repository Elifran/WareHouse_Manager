"""
URL configuration for beverage_management_system project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core.views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/core/', include('core.urls')),
    path('api/products/', include('products.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/packaging/', include('packaging_management.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/purchases/', include('purchases.urls')),
]
