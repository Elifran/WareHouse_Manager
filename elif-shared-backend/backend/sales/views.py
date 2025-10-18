from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import FilterSet, DateFilter
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Sale, SaleItem, Payment, SalePackaging, PackagingReturn
from .serializers import (
    SaleSerializer, SaleCreateSerializer, SaleListSerializer,
    SaleItemSerializer, PaymentSerializer, SalePackagingSerializer,
    SalePackagingCreateSerializer, PackagingReturnSerializer
)

class SaleFilter(FilterSet):
    created_at__date__gte = DateFilter(field_name='created_at', lookup_expr='date__gte')
    created_at__date__lte = DateFilter(field_name='created_at', lookup_expr='date__lte')
    
    class Meta:
        model = Sale
        fields = ['status', 'payment_method', 'sold_by', 'created_at__date__gte', 'created_at__date__lte']

class SaleListCreateView(generics.ListCreateAPIView):
    queryset = Sale.objects.select_related('sold_by').prefetch_related('items__product', 'items__unit', 'packaging_items__product', 'packaging_items__unit', 'payments').all()
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
    queryset = Sale.objects.select_related('sold_by').prefetch_related('items', 'packaging_items', 'payments').all()
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
        
        # For return sales, we still create 'out' movements to remove the returned stock from inventory
        # This is because return sales represent items being returned to the business, not sold to customers
        movement_type = 'out'  # Both regular sales and return sales remove stock when completed
        
        stock_movement = StockMovement.objects.create(
            product=item.product,
            movement_type=movement_type,
            quantity=base_quantity,
            unit=item.product.base_unit,  # Always use base unit for stock movements
            reference_number=sale.sale_number,
            notes=f'{"Return" if sale.sale_type == "return" else "Sale"} {sale.sale_number}',
            created_by=request.user
        )
        
        # Ensure the product stock is updated by refreshing from database
        item.product.refresh_from_db()
    
    # Recalculate totals to ensure accuracy before completing
    sale.calculate_totals()
    
    # Update sale status
    sale.status = 'completed'
    sale.save()
    
    # Automatically create packaging transaction if sale has packaging items
    packaging_transaction = None
    if sale.packaging_items.exists():
        try:
            from packaging_management.models import PackagingTransaction, PackagingItem
            from products.models import Unit
            import uuid
            
            # Generate transaction number
            transaction_number = f"PKG-{uuid.uuid4().hex[:8].upper()}"
            
            # Create packaging transaction
            packaging_transaction = PackagingTransaction.objects.create(
                transaction_number=transaction_number,
                transaction_type='consignation',
                sale=sale,
                customer_name=sale.customer_name,
                customer_phone=sale.customer_phone,
                customer_email=sale.customer_email,
                payment_method='cash',  # Default payment method
                status='active',
                notes=f'Automatically created from sale {sale.sale_number}',
                created_by=request.user
            )
            
            # Create packaging items from sale packaging items
            for sale_packaging in sale.packaging_items.all():
                # Get the unit for packaging (use piece unit if not specified)
                unit = sale_packaging.unit
                if not unit:
                    unit = Unit.objects.get(symbol='pc', is_base_unit=True)
                
                PackagingItem.objects.create(
                    transaction=packaging_transaction,
                    product=sale_packaging.product,
                    quantity=sale_packaging.quantity,
                    unit=unit,
                    unit_price=sale_packaging.unit_price,
                    notes=sale_packaging.notes
                )
            
            # Calculate packaging transaction totals
            packaging_transaction.calculate_totals()
            
        except Exception as e:
            # Log the error but don't fail the sale completion
            print(f"Error creating packaging transaction for sale {sale.sale_number}: {str(e)}")
    
    serializer = SaleSerializer(sale)
    response_data = serializer.data
    
    # Add packaging transaction info to response if created
    if packaging_transaction:
        response_data['packaging_transaction'] = {
            'id': packaging_transaction.id,
            'transaction_number': packaging_transaction.transaction_number,
            'total_amount': packaging_transaction.total_amount
        }
    
    return Response(response_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_sale(request, sale_id):
    """Cancel a sale with different behaviors for pending vs confirmed sales"""
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if sale.status not in ['pending', 'completed']:
        return Response({'error': 'Sale cannot be cancelled'}, status=status.HTTP_400_BAD_REQUEST)
    
    if sale.status == 'pending':
        # For pending sales: just cancel them (no database impact)
        sale.status = 'cancelled'
        sale.save()
        
    elif sale.status == 'completed':
        # For confirmed sales: create a return to restore stock and mark as returned
        # Create a return sale with the same items
        return_sale = Sale.objects.create(
            sale_type='return',
            original_sale=sale,
            customer_name=sale.customer_name,
            customer_phone=sale.customer_phone,
            customer_email=sale.customer_email,
            payment_method=sale.payment_method,
            status='pending',  # Mark return as pending so it can be validated later
            sold_by=request.user
        )
        
        # Generate return sale number
        return_sale.sale_number = f"RET-{return_sale.id:06d}"
        return_sale.save()
        
        # Create return items (same as original sale items)
        for original_item in sale.items.all():
            SaleItem.objects.create(
                sale=return_sale,
                product=original_item.product,
                quantity=original_item.quantity,
                unit=original_item.unit,
                unit_price=original_item.unit_price,
                unit_cost=original_item.unit_cost,
                total_price=original_item.total_price,
                total_cost=original_item.total_cost,
                price_mode=original_item.price_mode,
                original_sale_item=original_item
            )
            
            # Immediately restore stock when cancelling a completed sale
            from products.models import StockMovement
            StockMovement.objects.create(
                product=original_item.product,
                movement_type='return',
                quantity=original_item.quantity,
                unit=original_item.product.base_unit,
                reference_number=return_sale.sale_number,
                notes=f'Return from cancelled sale {sale.sale_number}',
                created_by=request.user
            )
        
        # Calculate return totals
        return_sale.calculate_totals()
        
        # Mark original sale as refunded
        sale.status = 'refunded'
        sale.save()
        
        # Return the return sale data
        serializer = SaleSerializer(return_sale)
        return Response({
            'message': 'Sale cancelled and stock restored',
            'return_sale': serializer.data,
            'original_sale_status': 'refunded',
            'refund_amount': float(sale.paid_amount),  # Amount to be refunded to customer
            'original_sale_number': sale.sale_number
        })
    
    # For pending sales, return the cancelled sale
    serializer = SaleSerializer(sale)
    return Response({
        'message': 'Pending sale cancelled',
        'sale': serializer.data
    })

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
    
    # Prevent editing of completed sales that are fully paid
    if sale.status == 'completed' and sale.payment_status == 'paid':
        return Response({'error': 'Fully paid completed sales cannot be edited'}, status=status.HTTP_400_BAD_REQUEST)
    
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
        
        if quantity < 0:
            return Response({'error': 'Quantity cannot be negative'}, status=status.HTTP_400_BAD_REQUEST)
        
        # If quantity is 0, update the item to have 0 quantity (don't remove it)
        if quantity == 0:
            # Find the corresponding existing item and update it to 0 quantity
            for existing in existing_items:
                if (existing.product.id == product_id and 
                    existing.unit.id == unit_id and 
                    existing.price_mode == price_mode):
                    existing.quantity = 0
                    existing.total_price = 0
                    existing.total_cost = 0
                    existing.save()
                    processed_existing_items.add(existing.id)
                    break
            continue  # Skip to next item (already processed)
        
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
    from datetime import date, timedelta
    sale.subtotal = Decimal(str(subtotal))
    sale.cost_amount = Decimal(str(total_cost))
    sale.tax_amount = Decimal(str(total_tax))
    sale.total_amount = Decimal(str(subtotal)) - sale.discount_amount
    
    # Handle payment amount if provided
    paid_amount = request.data.get('paid_amount')
    if paid_amount is not None:
        try:
            paid_amount = Decimal(str(paid_amount))
            sale.paid_amount = paid_amount
            sale.remaining_amount = sale.total_amount - paid_amount
            
            # Update payment status
            if paid_amount >= sale.total_amount:
                sale.payment_status = 'paid'
                sale.due_date = None
            elif paid_amount > 0:
                sale.payment_status = 'partial'
                if not sale.due_date:
                    sale.due_date = date.today() + timedelta(days=30)
            else:
                sale.payment_status = 'pending'
                sale.due_date = None
        except (ValueError, TypeError):
            return Response({'error': 'Invalid paid amount'}, status=status.HTTP_400_BAD_REQUEST)
    
    sale.save()
    
    # Apply stock adjustments
    for product_id, adjustment in stock_adjustments.items():
        if adjustment != 0:
            product = Product.objects.get(id=product_id)
            
            # Determine movement type and quantity based on sale type
            if sale.sale_type == 'return':
                # For return sales: positive adjustment means more stock returned, negative means less stock returned
                if adjustment > 0:
                    # More stock being returned (stock increase)
                    movement_type = 'return'
                    movement_quantity = adjustment
                else:
                    # Less stock being returned (stock decrease - need to remove some stock)
                    movement_type = 'out'
                    movement_quantity = abs(adjustment)  # adjustment is negative
            else:
                # For regular sales: positive adjustment means more quantity sold, negative means less quantity sold
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
                notes=f'Stock adjustment from {"return" if sale.sale_type == "return" else "sale"} edit {sale.sale_number}',
                created_by=request.user
            )
    
    # Return updated sale
    serializer = SaleSerializer(sale)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_sales(request):
    """Get all pending sales with their items"""
    try:
        sales = Sale.objects.filter(status='pending').select_related('sold_by').prefetch_related(
            'items__product', 'items__unit'
        ).order_by('-created_at')
        
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_payment_method(request, sale_id):
    """Update payment method for a sale"""
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only allow updating payment method for pending sales
    if sale.status != 'pending':
        return Response({'error': 'Payment method can only be updated for pending sales'}, status=status.HTTP_400_BAD_REQUEST)
    
    payment_method = request.data.get('payment_method')
    if not payment_method:
        return Response({'error': 'Payment method is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate payment method
    valid_methods = [choice[0] for choice in Sale.PAYMENT_METHODS]
    if payment_method not in valid_methods:
        return Response({'error': 'Invalid payment method'}, status=status.HTTP_400_BAD_REQUEST)
    
    sale.payment_method = payment_method
    sale.save()
    
    serializer = SaleSerializer(sale)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_payment(request, sale_id):
    """Make a payment for a sale (full payment only for edit management)"""
    from decimal import Decimal
    
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    payment_amount = request.data.get('payment_amount')
    if not payment_amount:
        return Response({'error': 'Payment amount is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        payment_amount = Decimal(str(payment_amount))
    except (ValueError, TypeError):
        return Response({'error': 'Invalid payment amount'}, status=status.HTTP_400_BAD_REQUEST)
    
    if payment_amount <= 0:
        return Response({'error': 'Payment amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if this is a full payment (for edit management)
    is_full_payment = request.data.get('is_full_payment', False)
    
    if is_full_payment:
        # For edit management, only allow full payment
        if payment_amount != sale.remaining_amount:
            return Response({'error': 'Payment amount must equal the remaining amount for full payment'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        # For POS, allow partial payments
        if payment_amount > sale.remaining_amount:
            return Response({'error': 'Payment amount cannot exceed remaining amount'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update payment amounts
    sale.paid_amount += payment_amount
    sale.remaining_amount = sale.total_amount - sale.paid_amount
    
    # Update payment status and due date
    if sale.paid_amount >= sale.total_amount:
        sale.payment_status = 'paid'
        sale.due_date = None  # No due date for fully paid sales
    elif sale.paid_amount > 0:
        sale.payment_status = 'partial'
        # Set due date to 30 days from now if not already set
        if not sale.due_date:
            from datetime import date, timedelta
            sale.due_date = date.today() + timedelta(days=30)
    else:
        sale.payment_status = 'pending'
        sale.due_date = None  # No due date for pending sales
    
    sale.save()
    
    serializer = SaleSerializer(sale)
    return Response({
        'message': 'Payment processed successfully',
        'sale': serializer.data
    })

# Packaging Management Views

class SalePackagingListCreateView(generics.ListCreateAPIView):
    queryset = SalePackaging.objects.select_related('sale', 'product', 'unit').all()
    serializer_class = SalePackagingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['sale', 'product', 'status']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

class SalePackagingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SalePackaging.objects.select_related('sale', 'product', 'unit').all()
    serializer_class = SalePackagingSerializer
    permission_classes = [IsAuthenticated]

class PackagingReturnListCreateView(generics.ListCreateAPIView):
    queryset = PackagingReturn.objects.select_related('sale_packaging__product', 'processed_by').all()
    serializer_class = PackagingReturnSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['sale_packaging', 'return_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def packaging_validation_page(request, sale_id):
    """Get packaging information for a sale validation page"""
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all packaging items for this sale
    packaging_items = SalePackaging.objects.filter(sale=sale).select_related('product', 'unit')
    packaging_serializer = SalePackagingSerializer(packaging_items, many=True)
    
    # Get products that have packaging for potential additions
    from products.models import Product
    products_with_packaging = Product.objects.filter(has_packaging=True, is_active=True)
    
    return Response({
        'sale': {
            'id': sale.id,
            'sale_number': sale.sale_number,
            'customer_name': sale.customer_name,
            'customer_phone': sale.customer_phone,
            'status': sale.status
        },
        'packaging_items': packaging_serializer.data,
        'available_products': [
            {
                'id': product.id,
                'name': product.name,
                'sku': product.sku,
                'packaging_price': product.packaging_price
            }
            for product in products_with_packaging
        ]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_packaging_to_sale(request, sale_id):
    """Add packaging items to a sale"""
    try:
        sale = Sale.objects.get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if sale.status != 'pending':
        return Response({'error': 'Can only add packaging to pending sales'}, status=status.HTTP_400_BAD_REQUEST)
    
    packaging_data = request.data.get('packaging_items', [])
    if not packaging_data:
        return Response({'error': 'Packaging items are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    from products.models import Product, Unit
    from decimal import Decimal
    
    created_packaging = []
    for item_data in packaging_data:
        # Validate product
        try:
            product = Product.objects.get(id=item_data['product'])
        except Product.DoesNotExist:
            return Response({'error': f"Product with ID {item_data['product']} not found"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not product.has_packaging:
            return Response({'error': f"Product {product.name} does not have packaging"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate unit
        try:
            unit = Unit.objects.get(id=item_data['unit'])
        except Unit.DoesNotExist:
            return Response({'error': f"Unit with ID {item_data['unit']} not found"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create packaging item
        packaging = SalePackaging.objects.create(
            sale=sale,
            product=product,
            unit=unit,
            quantity=item_data['quantity'],
            unit_price=item_data.get('unit_price', product.packaging_price or Decimal('0.00')),
            status=item_data.get('status', 'consignation'),
            customer_name=item_data.get('customer_name', sale.customer_name),
            customer_phone=item_data.get('customer_phone', sale.customer_phone),
            notes=item_data.get('notes', '')
        )
        created_packaging.append(packaging)
    
    # Recalculate sale totals
    sale.calculate_totals()
    
    # Return updated sale with packaging
    serializer = SaleSerializer(sale)
    return Response({
        'message': f'Successfully added {len(created_packaging)} packaging items',
        'sale': serializer.data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_packaging_return(request, packaging_id):
    """Process a packaging return or exchange"""
    try:
        packaging = SalePackaging.objects.get(id=packaging_id)
    except SalePackaging.DoesNotExist:
        return Response({'error': 'Packaging item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    return_type = request.data.get('return_type')
    quantity_returned = request.data.get('quantity_returned')
    notes = request.data.get('notes', '')
    
    if not return_type or not quantity_returned:
        return Response({'error': 'Return type and quantity returned are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if quantity_returned <= 0:
        return Response({'error': 'Quantity returned must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
    
    if quantity_returned > packaging.quantity:
        return Response({'error': 'Quantity returned cannot exceed original quantity'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate refund amount
    refund_amount = (quantity_returned / packaging.quantity) * packaging.total_price
    
    # Create packaging return record
    packaging_return = PackagingReturn.objects.create(
        sale_packaging=packaging,
        return_type=return_type,
        quantity_returned=quantity_returned,
        refund_amount=refund_amount,
        notes=notes,
        processed_by=request.user
    )
    
    # Update packaging status if fully returned
    if quantity_returned == packaging.quantity:
        if return_type == 'return':
            packaging.status = 'consignation'  # Fully returned and refunded
        elif return_type == 'exchange':
            packaging.status = 'exchange'  # Exchanged for new packaging
    
    packaging.save()
    
    # Recalculate sale totals
    packaging.sale.calculate_totals()
    
    serializer = PackagingReturnSerializer(packaging_return)
    return Response({
        'message': 'Packaging return processed successfully',
        'return': serializer.data,
        'refund_amount': float(refund_amount)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def due_packaging_list(request):
    """Get list of all due packaging items"""
    due_packaging = SalePackaging.objects.filter(
        status='due'
    ).select_related('sale', 'product', 'unit').order_by('-created_at')
    
    serializer = SalePackagingSerializer(due_packaging, many=True)
    return Response(serializer.data)
