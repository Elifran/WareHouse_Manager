from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Report, DashboardWidget
from .serializers import (
    ReportSerializer, DashboardWidgetSerializer, SalesReportSerializer,
    InventoryReportSerializer, StockMovementReportSerializer
)
from sales.models import Sale, SaleItem
from products.models import Product, StockMovement, Category

class ReportListCreateView(generics.ListCreateAPIView):
    queryset = Report.objects.select_related('generated_by').all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['report_type', 'generated_by']
    search_fields = ['name', 'description']
    ordering_fields = ['generated_at', 'name']
    ordering = ['-generated_at']
    
    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)

class DashboardWidgetListCreateView(generics.ListCreateAPIView):
    queryset = DashboardWidget.objects.all()
    serializer_class = DashboardWidgetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['position_y', 'position_x']
    ordering = ['position_y', 'position_x']

class DashboardWidgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DashboardWidget.objects.all()
    serializer_class = DashboardWidgetSerializer
    permission_classes = [IsAuthenticated]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_sales_report(request):
    """Generate sales report"""
    serializer = SalesReportSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    start_date = data['start_date']
    end_date = data['end_date']
    include_details = data['include_details']
    group_by = data['group_by']
    
    # Base queryset
    sales = Sale.objects.filter(
        created_at__date__range=[start_date, end_date],
        status='completed'
    )
    
    # Summary data
    summary = sales.aggregate(
        total_sales=Sum('total_amount'),
        total_count=Count('id'),
        total_items=Sum('items__quantity')
    )
    
    # Group by period
    if group_by == 'day':
        date_format = '%Y-%m-%d'
    elif group_by == 'week':
        date_format = '%Y-W%U'
    else:  # month
        date_format = '%Y-%m'
    
    daily_data = []
    for sale in sales:
        date_key = sale.created_at.strftime(date_format)
        daily_data.append({
            'date': date_key,
            'total': float(sale.total_amount),
            'count': 1
        })
    
    # Aggregate by date
    from collections import defaultdict
    grouped_data = defaultdict(lambda: {'total': 0, 'count': 0})
    for item in daily_data:
        grouped_data[item['date']]['total'] += item['total']
        grouped_data[item['date']]['count'] += item['count']
    
    chart_data = [{'date': k, 'total': v['total'], 'count': v['count']} for k, v in grouped_data.items()]
    chart_data.sort(key=lambda x: x['date'])
    
    result = {
        'summary': summary,
        'chart_data': chart_data
    }
    
    if include_details:
        # Include detailed sales data
        sales_data = []
        for sale in sales.select_related('sold_by').prefetch_related('items'):
            sales_data.append({
                'id': sale.id,
                'sale_number': sale.sale_number,
                'customer_name': sale.customer_name,
                'total_amount': float(sale.total_amount),
                'sold_by': sale.sold_by.username if sale.sold_by else None,
                'created_at': sale.created_at,
                'items_count': sale.items.count()
            })
        result['details'] = sales_data
    
    return Response(result)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_inventory_report(request):
    """Generate inventory report"""
    serializer = InventoryReportSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    category_id = data.get('category')
    low_stock_only = data.get('low_stock_only', False)
    out_of_stock_only = data.get('out_of_stock_only', False)
    include_inactive = data.get('include_inactive', False)
    
    # Base queryset
    products = Product.objects.select_related('category')
    
    if not include_inactive:
        products = products.filter(is_active=True)
    
    if category_id:
        products = products.filter(category_id=category_id)
    
    if low_stock_only:
        products = products.filter(stock_quantity__lte=F('min_stock_level'))
    elif out_of_stock_only:
        products = products.filter(stock_quantity=0)
    
    # Calculate summary
    summary = products.aggregate(
        total_products=Count('id'),
        total_value=Sum(F('stock_quantity') * F('cost_price')),
        low_stock_count=Count('id', filter=Q(stock_quantity__lte=F('min_stock_level'))),
        out_of_stock_count=Count('id', filter=Q(stock_quantity=0))
    )
    
    # Product data
    product_data = []
    for product in products:
        product_data.append({
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'category': product.category.name,
            'stock_quantity': product.stock_quantity,
            'min_stock_level': product.min_stock_level,
            'max_stock_level': product.max_stock_level,
            'cost_price': float(product.cost_price),
            'selling_price': float(product.price),
            'stock_value': float(product.stock_quantity * product.cost_price),
            'is_low_stock': product.is_low_stock,
            'is_out_of_stock': product.is_out_of_stock,
            'is_active': product.is_active
        })
    
    return Response({
        'summary': summary,
        'products': product_data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_stock_movement_report(request):
    """Generate stock movement report"""
    serializer = StockMovementReportSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    start_date = data['start_date']
    end_date = data['end_date']
    product_id = data.get('product')
    movement_type = data.get('movement_type')
    
    # Base queryset
    movements = StockMovement.objects.filter(
        created_at__date__range=[start_date, end_date]
    ).select_related('product', 'created_by')
    
    if product_id:
        movements = movements.filter(product_id=product_id)
    
    if movement_type:
        movements = movements.filter(movement_type=movement_type)
    
    # Summary by movement type
    summary = movements.values('movement_type').annotate(
        total_quantity=Sum('quantity'),
        count=Count('id')
    )
    
    # Movement data
    movement_data = []
    for movement in movements:
        movement_data.append({
            'id': movement.id,
            'product_name': movement.product.name,
            'product_sku': movement.product.sku,
            'movement_type': movement.movement_type,
            'quantity': movement.quantity,
            'reference_number': movement.reference_number,
            'notes': movement.notes,
            'created_by': movement.created_by.username if movement.created_by else None,
            'created_at': movement.created_at
        })
    
    return Response({
        'summary': list(summary),
        'movements': movement_data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """Get dashboard data"""
    today = timezone.now().date()
    this_month = today.replace(day=1)
    
    # Sales summary
    today_sales = Sale.objects.filter(
        created_at__date=today,
        status='completed'
    ).aggregate(
        total_sales=Sum('total_amount'),
        total_count=Count('id')
    )
    
    month_sales = Sale.objects.filter(
        created_at__date__gte=this_month,
        status='completed'
    ).aggregate(
        total_sales=Sum('total_amount'),
        total_count=Count('id')
    )
    
    # Inventory summary
    inventory_summary = Product.objects.filter(is_active=True).aggregate(
        total_products=Count('id'),
        low_stock_count=Count('id', filter=Q(stock_quantity__lte=F('min_stock_level'))),
        out_of_stock_count=Count('id', filter=Q(stock_quantity=0))
    )
    
    # Recent sales
    recent_sales = Sale.objects.filter(
        status='completed'
    ).select_related('sold_by').order_by('-created_at')[:5]
    
    recent_sales_data = []
    for sale in recent_sales:
        recent_sales_data.append({
            'sale_number': sale.sale_number,
            'customer_name': sale.customer_name,
            'total_amount': float(sale.total_amount),
            'sold_by': sale.sold_by.username if sale.sold_by else None,
            'created_at': sale.created_at
        })
    
    # Top selling products
    top_products = SaleItem.objects.filter(
        sale__status='completed',
        sale__created_at__date__gte=this_month
    ).values('product__name', 'product__sku').annotate(
        total_sold=Sum('quantity'),
        total_revenue=Sum('total_price')
    ).order_by('-total_sold')[:5]
    
    return Response({
        'sales': {
            'today': {
                'total_sales': float(today_sales['total_sales'] or 0),
                'total_count': today_sales['total_count'] or 0
            },
            'this_month': {
                'total_sales': float(month_sales['total_sales'] or 0),
                'total_count': month_sales['total_count'] or 0
            }
        },
        'inventory': inventory_summary,
        'recent_sales': recent_sales_data,
        'top_products': list(top_products)
    })
