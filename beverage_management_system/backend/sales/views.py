from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Sale, SaleItem, Payment
from .serializers import (
    SaleSerializer, SaleCreateSerializer, SaleListSerializer,
    SaleItemSerializer, PaymentSerializer
)

class SaleListCreateView(generics.ListCreateAPIView):
    queryset = Sale.objects.select_related('sold_by').prefetch_related('items', 'payments').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method', 'sold_by']
    search_fields = ['sale_number', 'customer_name', 'customer_phone']
    ordering_fields = ['created_at', 'total_amount', 'sale_number']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return SaleListSerializer
        return SaleCreateSerializer
    
    def perform_create(self, serializer):
        serializer.save(sold_by=self.request.user)

class SaleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Sale.objects.select_related('sold_by').prefetch_related('items', 'payments').all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

class SaleItemListCreateView(generics.ListCreateAPIView):
    queryset = SaleItem.objects.select_related('sale', 'product').all()
    serializer_class = SaleItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['sale', 'product']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

class PaymentListCreateView(generics.ListCreateAPIView):
    queryset = Payment.objects.select_related('sale').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['sale', 'payment_method']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_summary(request):
    """Get sales summary for dashboard"""
    today = timezone.now().date()
    this_month = today.replace(day=1)
    
    # Today's sales
    today_sales = Sale.objects.filter(
        created_at__date=today,
        status='completed'
    ).aggregate(
        total_sales=Sum('total_amount'),
        total_count=Count('id')
    )
    
    # This month's sales
    month_sales = Sale.objects.filter(
        created_at__date__gte=this_month,
        status='completed'
    ).aggregate(
        total_sales=Sum('total_amount'),
        total_count=Count('id')
    )
    
    # Pending sales
    pending_sales = Sale.objects.filter(status='pending').count()
    
    return Response({
        'today': {
            'total_sales': today_sales['total_sales'] or 0,
            'total_count': today_sales['total_count'] or 0
        },
        'this_month': {
            'total_sales': month_sales['total_sales'] or 0,
            'total_count': month_sales['total_count'] or 0
        },
        'pending_sales': pending_sales
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_chart_data(request):
    """Get sales data for charts"""
    days = int(request.GET.get('days', 7))
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=days-1)
    
    sales_data = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        daily_sales = Sale.objects.filter(
            created_at__date=date,
            status='completed'
        ).aggregate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        
        sales_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'total': float(daily_sales['total'] or 0),
            'count': daily_sales['count'] or 0
        })
    
    return Response(sales_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_sale(request, sale_id):
    """Complete a sale and update stock"""
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if sale.status != 'pending':
        return Response({'error': 'Sale is not pending'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update stock for each item
    for item in sale.items.all():
        if item.product.stock_quantity < item.quantity:
            return Response({
                'error': f'Insufficient stock for {item.product.name}. Available: {item.product.stock_quantity}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create stock movement
        from products.models import StockMovement
        StockMovement.objects.create(
            product=item.product,
            movement_type='out',
            quantity=item.quantity,
            reference_number=sale.sale_number,
            notes=f'Sale {sale.sale_number}',
            created_by=request.user
        )
    
    # Update sale status
    sale.status = 'completed'
    sale.save()
    
    serializer = SaleSerializer(sale)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_sale(request, sale_id):
    """Cancel a sale"""
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if sale.status not in ['pending', 'completed']:
        return Response({'error': 'Sale cannot be cancelled'}, status=status.HTTP_400_BAD_REQUEST)
    
    sale.status = 'cancelled'
    sale.save()
    
    serializer = SaleSerializer(sale)
    return Response(serializer.data)
