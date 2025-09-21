from django.urls import path
from . import views

urlpatterns = [
    # Supplier URLs
    path('suppliers/', views.SupplierListCreateView.as_view(), name='supplier-list-create'),
    path('suppliers/<int:pk>/', views.SupplierDetailView.as_view(), name='supplier-detail'),
    path('suppliers/<int:supplier_id>/products/', views.supplier_products, name='supplier-products'),
    
    # Purchase Order URLs
    path('purchase-orders/', views.PurchaseOrderListCreateView.as_view(), name='purchase-order-list-create'),
    path('purchase-orders/<int:pk>/', views.PurchaseOrderDetailView.as_view(), name='purchase-order-detail'),
    path('purchase-orders/<int:order_id>/status/', views.purchase_order_status, name='purchase-order-status'),
    
    # Delivery URLs
    path('deliveries/', views.DeliveryListCreateView.as_view(), name='delivery-list-create'),
    path('deliveries/<int:pk>/', views.DeliveryDetailView.as_view(), name='delivery-detail'),
    path('deliveries/confirm/', views.confirm_delivery, name='confirm-delivery'),
    path('deliveries/pending/', views.pending_deliveries, name='pending-deliveries'),
    
    # Utility URLs
    path('products/low-stock/', views.low_stock_products, name='low-stock-products'),
]
