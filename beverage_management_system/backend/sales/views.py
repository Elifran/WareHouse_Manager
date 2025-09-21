from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import FilterSet, DateFilter
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Sale, SaleItem, Payment
from .serializers import (
    SaleSerializer, SaleCreateSerializer, SaleListSerializer,
    SaleItemSerializer, PaymentSerializer
)

class SaleFilter(FilterSet):
    created_at__date__gte = DateFilter(field_name='created_at', lookup_expr='date__gte')
    created_at__date__lte = DateFilter(field_name='created_at', lookup_expr='date__lte')
    
    class Meta:
        model = Sale
        fields = ['status', 'payment_method', 'sold_by', 'created_at__date__gte', 'created_at__date__lte']

class SaleListCreateView(generics.ListCreateAPIView):
    queryset = Sale.objects.select_related('sold_by').prefetch_related('items__product', 'items__unit', 'payments').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SaleFilter
    search_fields = ['sale_number', 'customer_name', 'customer_phone']
    ordering_fields = ['created_at', 'total_amount', 'sale_number']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return SaleListSerializer
        return SaleCreateSerializer
    
    def perform_create(self, serializer):
        serializer.save(sold_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = serializer.save(sold_by=request.user)
        
        # Return the full sale data using SaleSerializer
        full_serializer = SaleSerializer(sale)
        return Response(full_serializer.data, status=status.HTTP_201_CREATED)

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
        # Calculate quantity in base unit for stock check
        if item.unit and item.product.base_unit:
            # Convert quantity from sale unit to base unit
            base_quantity = item.product.convert_quantity(item.quantity, item.unit, item.product.base_unit)
            if base_quantity is None:
                base_quantity = item.quantity
            else:
                base_quantity = int(base_quantity)
        else:
            # If no unit specified, assume it's already in base unit
            base_quantity = item.quantity
        
        if item.product.stock_quantity < base_quantity:
            return Response({
                'error': f'Insufficient stock for {item.product.name}. Available: {item.product.stock_quantity}, Required: {base_quantity}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create stock movement
        from products.models import StockMovement
        stock_movement = StockMovement.objects.create(
            product=item.product,
            movement_type='out',
            quantity=base_quantity,
            unit=item.product.base_unit,
            reference_number=sale.sale_number,
            notes=f'Sale {sale.sale_number}',
            created_by=request.user
        )
        
        # Ensure the product stock is updated by refreshing from database
        item.product.refresh_from_db()
    
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

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_sales(request):
    """Delete multiple sales based on filters"""
    # Only allow admin and manager roles to delete sales
    if request.user.role not in ['admin', 'manager']:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    customer_name = request.data.get('customer_name', '').strip()
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')
    status_filter = request.data.get('status', 'completed')
    
    # Build query filters
    query_filters = {}
    
    if customer_name:
        query_filters['customer_name__icontains'] = customer_name
    
    if start_date:
        query_filters['created_at__date__gte'] = start_date
    
    if end_date:
        query_filters['created_at__date__lte'] = end_date
    
    if status_filter:
        query_filters['status'] = status_filter
    
    # Get sales to delete
    sales_to_delete = Sale.objects.filter(**query_filters)
    
    if not sales_to_delete.exists():
        return Response({'error': 'No sales found matching the criteria'}, status=status.HTTP_404_NOT_FOUND)
    
    # For completed sales, we need to restore stock
    for sale in sales_to_delete:
        if sale.status == 'completed':
            # Restore stock for each item
            for item in sale.items.all():
                from products.models import StockMovement
                StockMovement.objects.create(
                    product=item.product,
                    movement_type='return',
                    quantity=item.quantity,
                    reference_number=f'DELETE-{sale.sale_number}',
                    notes=f'Stock restored from deleted sale {sale.sale_number}',
                    created_by=request.user
                )
    
    # Delete the sales
    deleted_count = sales_to_delete.count()
    sales_to_delete.delete()
    
    return Response({
        'message': f'Successfully deleted {deleted_count} sales',
        'deleted_count': deleted_count
    })

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def edit_sale(request, sale_id):
    """Edit a sale for returns or modifications"""
    # Only allow admin and manager roles to edit sales
    if request.user.role not in ['admin', 'manager']:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if sale.status not in ['completed', 'pending']:
        return Response({'error': 'Sale cannot be edited'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the new items data
    new_items_data = request.data.get('items', [])
    if not new_items_data:
        return Response({'error': 'Items are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate differences for stock adjustment
    old_items = {item.id: item for item in sale.items.all()}
    new_items = {}
    
    # Process new items
    for item_data in new_items_data:
        product_id = item_data.get('product')
        quantity = int(item_data.get('quantity', 0))
        
        if quantity <= 0:
            continue
            
        if product_id in new_items:
            new_items[product_id] += quantity
        else:
            new_items[product_id] = quantity
    
    # Calculate stock adjustments
    stock_adjustments = {}
    
    # Check old items
    for item in old_items.values():
        product_id = item.product.id
        old_quantity = item.quantity
        
        if product_id in new_items:
            # Item exists in both old and new
            new_quantity = new_items[product_id]
            if new_quantity != old_quantity:
                # Quantity changed
                diff = new_quantity - old_quantity
                if product_id in stock_adjustments:
                    stock_adjustments[product_id] += diff
                else:
                    stock_adjustments[product_id] = diff
        else:
            # Item removed
            if product_id in stock_adjustments:
                stock_adjustments[product_id] -= old_quantity
            else:
                stock_adjustments[product_id] = -old_quantity
    
    # Check new items
    for product_id, new_quantity in new_items.items():
        if product_id not in [item.product.id for item in old_items.values()]:
            # New item added
            if product_id in stock_adjustments:
                stock_adjustments[product_id] += new_quantity
            else:
                stock_adjustments[product_id] = new_quantity
    
    # Check stock availability for positive adjustments
    for product_id, adjustment in stock_adjustments.items():
        if adjustment > 0:  # Adding stock (returning items)
            from products.models import Product
            try:
                product = Product.objects.get(id=product_id)
                if product.stock_quantity < adjustment:
                    return Response({
                        'error': f'Insufficient stock for {product.name}. Available: {product.stock_quantity}, Required: {adjustment}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Product.DoesNotExist:
                return Response({'error': f'Product {product_id} not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update sale items
    sale.items.all().delete()  # Remove all existing items
    
    # Create new items
    subtotal = 0
    total_cost = 0
    total_tax = 0
    
    for item_data in new_items_data:
        product_id = item_data.get('product')
        quantity = int(item_data.get('quantity', 0))
        unit_price = float(item_data.get('unit_price', 0))
        
        if quantity <= 0 or unit_price <= 0:
            continue
        
        from products.models import Product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            continue
        
        # Create sale item
        SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=quantity,
            unit_price=unit_price
        )
        
        # Calculate totals
        item_total = quantity * unit_price
        subtotal += item_total
        
        # Calculate cost and tax for this item
        if product.tax_class and product.tax_class.is_active and product.tax_class.tax_rate > 0:
            # Tax-inclusive pricing
            item_tax = (item_total * product.tax_class.tax_rate) / (100 + product.tax_class.tax_rate)
            item_cost = (item_total * 100) / (100 + product.tax_class.tax_rate)
            total_tax += item_tax
            total_cost += item_cost
        else:
            # No tax or 0% tax rate, full price is cost
            total_cost += item_total
    
    # Update sale totals
    sale.subtotal = subtotal
    sale.cost_amount = total_cost
    sale.tax_amount = total_tax
    sale.total_amount = subtotal - sale.discount_amount
    sale.save()
    
    # Apply stock adjustments
    for product_id, adjustment in stock_adjustments.items():
        if adjustment != 0:
            from products.models import Product, StockMovement
            product = Product.objects.get(id=product_id)
            
            movement_type = 'return' if adjustment > 0 else 'out'
            StockMovement.objects.create(
                product=product,
                movement_type=movement_type,
                quantity=abs(adjustment),
                reference_number=f'EDIT-{sale.sale_number}',
                notes=f'Stock adjustment from sale edit {sale.sale_number}',
                created_by=request.user
            )
    
    # Return updated sale
    serializer = SaleSerializer(sale)
    return Response(serializer.data)
