from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.CategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category-detail'),
    path('', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('stock-movements/', views.StockMovementListCreateView.as_view(), name='stock-movement-list-create'),
    path('low-stock/', views.low_stock_products, name='low-stock-products'),
    path('out-of-stock/', views.out_of_stock_products, name='out-of-stock-products'),
    path('<int:product_id>/adjust-stock/', views.adjust_stock, name='adjust-stock'),
]
