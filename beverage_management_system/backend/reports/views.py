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
    """Get dashboard data with time period support and role-based access"""
    today = timezone.now().date()
    this_week = today - timedelta(days=today.weekday())
    this_month = today.replace(day=1)
    
    # Get user role
    user_role = request.user.role
    is_sales_team = user_role == 'sales'
    
    # For sales teams, only allow daily view
    if is_sales_team:
        period = 'daily'
        start_date = today
        end_date = today
    else:
        # Get time period from query params for admin/manager
        period = request.GET.get('period', 'month')  # daily, weekly, monthly
        
        # Calculate date range based on period
        if period == 'daily':
            start_date = today
            end_date = today
        elif period == 'weekly':
            start_date = this_week
            end_date = today
        else:  # monthly
            start_date = this_month
            end_date = today
    
    # Sales summary for selected period
    period_sales = Sale.objects.filter(
        created_at__date__range=[start_date, end_date],
        status='completed'
    ).aggregate(
        total_sales=Sum('total_amount'),
        total_count=Count('id'),
        total_cost=Sum('cost_amount')  # Use cost_amount from sales (calculated from stored sale item costs)
    )
    
    # Get total cost from sales cost_amount field (already calculated with tax-inclusive pricing)
    total_cost = float(period_sales['total_cost'] or 0)
    total_revenue = float(period_sales['total_sales'] or 0)
    profit_margin = ((total_revenue - total_cost) / total_revenue * 100) if total_revenue > 0 else 0
    
    # Daily sales for chart (last 7 days)
    chart_data = []
    for i in range(7):
        date = today - timedelta(days=i)
        daily_sales = Sale.objects.filter(
            created_at__date=date,
            status='completed'
        ).aggregate(
            total_sales=Sum('total_amount'),
            total_count=Count('id')
        )
        
        # Calculate daily cost from sales cost_amount field
        daily_cost_data = Sale.objects.filter(
            created_at__date=date,
            status='completed'
        ).aggregate(total_cost=Sum('cost_amount'))
        daily_cost = float(daily_cost_data['total_cost'] or 0)
        
        chart_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'sales': float(daily_sales['total_sales'] or 0),
            'cost': daily_cost,
            'profit': float(daily_sales['total_sales'] or 0) - daily_cost,
            'transactions': daily_sales['total_count'] or 0
        })
    
    chart_data.reverse()  # Show oldest to newest
    
    # Inventory summary with cost data
    inventory_summary = Product.objects.filter(is_active=True).aggregate(
        total_products=Count('id'),
        low_stock_count=Count('id', filter=Q(stock_quantity__lte=F('min_stock_level'))),
        out_of_stock_count=Count('id', filter=Q(stock_quantity=0)),
        total_inventory_value=Sum(F('stock_quantity') * F('cost_price')),
        total_retail_value=Sum(F('stock_quantity') * F('price'))
    )
    
    # Recent sales
    recent_sales = Sale.objects.filter(
        status='completed'
    ).select_related('sold_by').order_by('-created_at')[:5]
    
    recent_sales_data = []
    for sale in recent_sales:
        recent_sales_data.append({
            'id': sale.id,
            'sale_number': sale.sale_number,
            'customer_name': sale.customer_name,
            'total_amount': float(sale.total_amount),
            'sold_by': sale.sold_by.username if sale.sold_by else None,
            'created_at': sale.created_at
        })
    
    # Top selling products with cost data and unit information
    top_products = SaleItem.objects.filter(
        sale__status='completed',
        sale__created_at__date__range=[start_date, end_date]
    ).select_related('product', 'unit', 'product__tax_class').values(
        'product__name', 'product__sku', 'product__tax_class__tax_rate', 'unit__name', 'unit__symbol'
    ).annotate(
        total_sold=Sum('quantity'),
        total_revenue=Sum('total_price')
    ).order_by('-total_sold')[:5]
    
    # Add cost and profit data to top products using tax-inclusive pricing
    top_products_data = []
    for product in top_products:
        # Calculate cost using tax-inclusive pricing logic
        if product['product__tax_class__tax_rate'] and product['product__tax_class__tax_rate'] > 0:
            # For tax-inclusive pricing: cost = (price × 100) / (100 + tax_rate)
            tax_rate = float(product['product__tax_class__tax_rate'])
            product_revenue = float(product['total_revenue'])
            product_cost = (product_revenue * 100) / (100 + tax_rate)
        else:
            # No tax, full revenue is cost
            product_cost = float(product['total_revenue'])
        
        profit = float(product['total_revenue']) - product_cost
        top_products_data.append({
            'product__name': product['product__name'],
            'product__sku': product['product__sku'],
            'total_sold': product['total_sold'],
            'unit_name': product['unit__name'] or 'piece',
            'unit_symbol': product['unit__symbol'] or 'piece',
            'total_revenue': float(product['total_revenue']),
            'total_cost': product_cost,
            'profit': profit,
            'profit_margin': (profit / float(product['total_revenue']) * 100) if product['total_revenue'] > 0 else 0
        })
    
    # Base response data
    response_data = {
        'period': period,
        'date_range': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d')
        },
        'sales': {
            'total_sales': total_revenue,
            'total_count': period_sales['total_count'] or 0
        },
        'inventory': {
            'total_products': inventory_summary['total_products'],
            'low_stock_count': inventory_summary['low_stock_count'],
            'out_of_stock_count': inventory_summary['out_of_stock_count']
        },
        'recent_sales': recent_sales_data
    }
    
    # Add sensitive data only for admin/manager roles
    if not is_sales_team:
        response_data['sales'].update({
            'total_cost': total_cost,
            'profit': total_revenue - total_cost,
            'profit_margin': profit_margin
        })
        response_data['inventory'].update({
            'total_inventory_value': float(inventory_summary['total_inventory_value'] or 0),
            'total_retail_value': float(inventory_summary['total_retail_value'] or 0)
        })
        response_data['chart_data'] = chart_data
        response_data['top_products'] = top_products_data
    else:
        # For sales teams, provide basic top products without cost/profit data
        basic_top_products = []
        for product in top_products:
            basic_top_products.append({
                'product__name': product['product__name'],
                'product__sku': product['product__sku'],
                'total_sold': product['total_sold'],
                'unit_name': product['unit__name'] or 'piece',
                'unit_symbol': product['unit__symbol'] or 'piece',
                'total_revenue': float(product['total_revenue'])
            })
        response_data['top_products'] = basic_top_products
    
    return Response(response_data)
