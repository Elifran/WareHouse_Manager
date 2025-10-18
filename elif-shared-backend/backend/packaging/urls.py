from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'packaging'

urlpatterns = [
    # Packaging transactions
    path('transactions/', views.PackagingTransactionListCreateView.as_view(), name='transaction-list-create'),
    path('transactions/<int:id>/', views.PackagingTransactionDetailView.as_view(), name='transaction-detail'),
    
    # Packaging items
    path('transactions/<int:transaction_id>/items/', views.PackagingItemListCreateView.as_view(), name='item-list-create'),
    path('transactions/<int:transaction_id>/items/<int:pk>/', views.PackagingItemDetailView.as_view(), name='item-detail'),
    
    # Packaging payments
    path('transactions/<int:transaction_id>/payments/', views.PackagingPaymentListCreateView.as_view(), name='payment-list-create'),
    
    # Sale-related packaging
    path('sales/<int:sale_id>/', views.get_packaging_by_sale, name='packaging-by-sale'),
    path('sales/<int:sale_id>/create/', views.create_packaging_from_sale, name='create-from-sale'),
    
    # Statistics
    path('statistics/', views.packaging_statistics, name='statistics'),
]

