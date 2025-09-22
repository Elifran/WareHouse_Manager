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
        # SaleItem.quantity is already stored in base units, no conversion needed
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
            unit=item.product.base_unit,  # Always use base unit for stock movements
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
    """Edit a sale - only allow quantity changes"""
    from products.models import Product, StockMovement
    
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
    
    # Get existing items for comparison
    existing_items = list(sale.items.all())
    
    # Allow item removal but not addition
    if len(new_items_data) > len(existing_items):
        return Response({'error': 'Cannot add new items, only quantity changes and item removal allowed'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate stock adjustments and validate changes
    stock_adjustments = {}
    subtotal = 0
    total_cost = 0
    total_tax = 0
    processed_existing_items = set()  # Track which existing items have been processed
    
    for item_data in new_items_data:
        product_id = item_data.get('product')
        quantity = float(item_data.get('quantity', 0))
        unit_price = float(item_data.get('unit_price', 0))
        unit_id = item_data.get('unit')
        price_mode = item_data.get('price_mode', 'standard')
        
        if quantity <= 0:
            return Response({'error': 'Quantity must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the corresponding existing item
        existing_item = None
        for existing in existing_items:
            if (existing.product.id == product_id and 
                existing.unit.id == unit_id and 
                existing.price_mode == price_mode):
                existing_item = existing
                processed_existing_items.add(existing.id)
                break
        
        if not existing_item:
            return Response({'error': 'Cannot change product, unit, or price mode - only quantity changes allowed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if unit price matches (should not change)
        from decimal import Decimal
        if abs(float(existing_item.unit_price) - unit_price) > 0.01:  # Allow small floating point differences
            return Response({'error': 'Cannot change unit price - only quantity changes allowed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate quantity difference in display unit first
        original_display_quantity = existing_item.get_quantity_in_unit(existing_item.unit)
        quantity_diff_display = quantity - original_display_quantity
        
        # Convert quantity difference from display unit to base unit
        from products.models import UnitConversion
        product = existing_item.product
        unit = existing_item.unit
        
        if unit != product.base_unit:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=product.base_unit,
                    is_active=True
                )
                # Convert display unit quantity difference to base unit quantity difference
                quantity_diff_base = quantity_diff_display * float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                try:
                    conversion = UnitConversion.objects.get(
                        from_unit=product.base_unit,
                        to_unit=unit,
                        is_active=True
                    )
                    # Convert display unit quantity difference to base unit quantity difference
                    quantity_diff_base = quantity_diff_display * float(conversion.conversion_factor)
                except UnitConversion.DoesNotExist:
                    quantity_diff_base = quantity_diff_display
        else:
            quantity_diff_base = quantity_diff_display
        
        # Add to stock adjustments
        if quantity_diff_base != 0:
            if product_id in stock_adjustments:
                stock_adjustments[product_id] += quantity_diff_base
            else:
                stock_adjustments[product_id] = quantity_diff_base
        
        # Convert new quantity from display unit to base unit for storage
        if unit != product.base_unit:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=product.base_unit,
                    is_active=True
                )
                # Convert display unit quantity to base unit quantity
                base_quantity = quantity * float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                try:
                    conversion = UnitConversion.objects.get(
                        from_unit=product.base_unit,
                        to_unit=unit,
                        is_active=True
                    )
                    # Convert display unit quantity to base unit quantity
                    base_quantity = quantity * float(conversion.conversion_factor)
                except UnitConversion.DoesNotExist:
                    base_quantity = quantity
        else:
            base_quantity = quantity
        
        # Update the existing item quantity (store in base units)
        existing_item.quantity = base_quantity
        existing_item.save()
        
        # Calculate totals
        item_total = quantity * unit_price
        subtotal += item_total
        
        # Calculate cost and tax for this item
        if existing_item.product.tax_class and existing_item.product.tax_class.is_active and existing_item.product.tax_class.tax_rate > 0:
            # Tax-inclusive pricing
            item_tax = (item_total * existing_item.product.tax_class.tax_rate) / (100 + existing_item.product.tax_class.tax_rate)
            item_cost = (item_total * 100) / (100 + existing_item.product.tax_class.tax_rate)
            total_tax += item_tax
            total_cost += item_cost
        else:
            # No tax or 0% tax rate, use the stored unit cost
            total_cost += existing_item.total_cost
    
    # Handle removed items (existing items not in new_items_data)
    for existing_item in existing_items:
        if existing_item.id not in processed_existing_items:
            # This item was removed - add negative stock adjustment
            product_id = existing_item.product.id
            if product_id in stock_adjustments:
                stock_adjustments[product_id] -= existing_item.quantity
            else:
                stock_adjustments[product_id] = -existing_item.quantity
            
            # Delete the removed item
            existing_item.delete()
    
    # Note: Stock validation is handled in the frontend by disabling the update button
    
    # Update sale totals
    from decimal import Decimal
    sale.subtotal = Decimal(str(subtotal))
    sale.cost_amount = Decimal(str(total_cost))
    sale.tax_amount = Decimal(str(total_tax))
    sale.total_amount = Decimal(str(subtotal)) - sale.discount_amount
    sale.save()
    
    # Apply stock adjustments
    for product_id, adjustment in stock_adjustments.items():
        if adjustment != 0:
            product = Product.objects.get(id=product_id)
            
            # Determine movement type and quantity
            if adjustment > 0:
                # Stock decrease (additional sale - more quantity sold)
                movement_type = 'out'
                movement_quantity = adjustment
            else:
                # Stock increase (return - less quantity sold)
                movement_type = 'in'
                movement_quantity = abs(adjustment)  # adjustment is negative
            
            # Create stock movement record (this will automatically update product stock via save method)
            StockMovement.objects.create(
                product=product,
                movement_type=movement_type,
                quantity=movement_quantity,
                unit=product.base_unit,  # Always use base unit for stock movements
                reference_number=f'EDIT-{sale.sale_number}',
                notes=f'Stock adjustment from sale edit {sale.sale_number}',
                created_by=request.user
            )
    
    # Return updated sale
    serializer = SaleSerializer(sale)
    return Response(serializer.data)
