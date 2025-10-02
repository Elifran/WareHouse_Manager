from django.urls import path
from . import views

urlpatterns = [
    path('', views.SaleListCreateView.as_view(), name='sale-list-create'),
    path('<int:pk>/', views.SaleDetailView.as_view(), name='sale-detail'),
    path('items/', views.SaleItemListCreateView.as_view(), name='sale-item-list-create'),
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list-create'),
    path('summary/', views.sales_summary, name='sales-summary'),
    path('chart-data/', views.sales_chart_data, name='sales-chart-data'),
    path('pending/', views.pending_sales, name='pending-sales'),
    path('<int:sale_id>/complete/', views.complete_sale, name='complete-sale'),
    path('<int:sale_id>/cancel/', views.cancel_sale, name='cancel-sale'),
    path('<int:sale_id>/payment/', views.make_payment, name='make-payment'),
    path('<int:sale_id>/payment-method/', views.update_payment_method, name='update-payment-method'),
    path('delete/', views.delete_sales, name='delete-sales'),
    path('<int:sale_id>/edit/', views.edit_sale, name='edit-sale'),
]
