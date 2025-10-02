from django.urls import path
from . import views

urlpatterns = [
    path('', views.ReportListCreateView.as_view(), name='report-list-create'),
    path('widgets/', views.DashboardWidgetListCreateView.as_view(), name='dashboard-widget-list-create'),
    path('widgets/<int:pk>/', views.DashboardWidgetDetailView.as_view(), name='dashboard-widget-detail'),
    path('sales/', views.generate_sales_report, name='generate-sales-report'),
    path('inventory/', views.generate_inventory_report, name='generate-inventory-report'),
    path('stock-movements/', views.generate_stock_movement_report, name='generate-stock-movement-report'),
    path('dashboard/', views.dashboard_data, name='dashboard-data'),
]
