from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.CategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category-detail'),
    path('tax-classes/', views.TaxClassListCreateView.as_view(), name='tax-class-list-create'),
    path('tax-classes/<int:pk>/', views.TaxClassDetailView.as_view(), name='tax-class-detail'),
    path('units/', views.UnitListCreateView.as_view(), name='unit-list-create'),
    path('units/<int:pk>/', views.UnitDetailView.as_view(), name='unit-detail'),
    path('base-units/', views.BaseUnitListView.as_view(), name='base-unit-list'),
    path('unit-conversions/', views.UnitConversionListCreateView.as_view(), name='unit-conversion-list-create'),
    path('unit-conversions/<int:pk>/', views.UnitConversionDetailView.as_view(), name='unit-conversion-detail'),
    path('', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('stock-movements/', views.StockMovementListCreateView.as_view(), name='stock-movement-list-create'),
    path('low-stock/', views.low_stock_products, name='low-stock-products'),
    path('out-of-stock/', views.out_of_stock_products, name='out-of-stock-products'),
    path('<int:product_id>/adjust-stock/', views.adjust_stock, name='adjust-stock'),
    path('bulk-stock-availability/', views.bulk_stock_availability, name='bulk-stock-availability'),
    path('<int:product_id>/stock-availability/', views.check_stock_availability, name='check-stock-availability'),
    path('<int:product_id>/units/', views.ProductUnitListCreateView.as_view(), name='product-unit-list-create'),
    path('<int:product_id>/units/<int:pk>/', views.ProductUnitDetailView.as_view(), name='product-unit-detail'),
    path('<int:product_id>/compatible-units/', views.get_product_compatible_units, name='product-compatible-units'),
    path('<int:product_id>/available-units/', views.get_product_available_units, name='product-available-units'),
    path('price-conversion-factor/', views.get_price_conversion_factor_api, name='price-conversion-factor'),
    path('quantity-conversion-factor/', views.get_quantity_conversion_factor_api, name='quantity-conversion-factor'),
]
