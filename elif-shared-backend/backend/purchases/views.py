from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.utils import timezone
import uuid

from .models import Supplier, PurchaseOrder, PurchaseOrderItem, Delivery, DeliveryItem
from .serializers import (
    SupplierSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderCreateSerializer,
    DeliverySerializer,
    DeliveryCreateSerializer,
    DeliveryUpdateSerializer,
    DeliveryConfirmSerializer
)


class SupplierListCreateView(generics.ListCreateAPIView):
    # queryset = Supplier.objects.filter(is_active=True)
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_destroy(self, instance):
        # Soft delete - set is_active to False
        instance.is_active = False
        instance.save()


class PurchaseOrderListCreateView(generics.ListCreateAPIView):
    queryset = PurchaseOrder.objects.prefetch_related('items__product', 'items__tax_class').select_related('supplier', 'created_by')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer
    
    def perform_create(self, serializer):
        # Generate unique order number
        order_number = f"PO-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Ensure the order number is unique
        while PurchaseOrder.objects.filter(order_number=order_number).exists():
            order_number = f"PO-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        serializer.save(order_number=order_number)


class PurchaseOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PurchaseOrder.objects.prefetch_related('items__product', 'items__tax_class').select_related('supplier', 'created_by')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_update(self, serializer):
        # Update status based on action
        status = self.request.data.get('status')
        if status and status in ['sent', 'confirmed', 'cancelled']:
            serializer.save(status=status)
        else:
            serializer.save()


class DeliveryListCreateView(generics.ListCreateAPIView):
    queryset = Delivery.objects.prefetch_related('items__product', 'items__purchase_order_item__product').select_related('purchase_order__supplier', 'received_by')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DeliveryCreateSerializer
        return DeliverySerializer
    
    def perform_create(self, serializer):
        # Generate unique delivery number
        delivery_number = f"DEL-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Ensure the delivery number is unique
        while Delivery.objects.filter(delivery_number=delivery_number).exists():
            delivery_number = f"DEL-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        serializer.save(delivery_number=delivery_number)


class DeliveryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Delivery.objects.prefetch_related('items__product', 'items__purchase_order_item__product').select_related('purchase_order__supplier', 'received_by')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DeliveryUpdateSerializer
        return DeliverySerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_delivery(request):
    """Confirm delivery and update stock"""
    serializer = DeliveryConfirmSerializer(data=request.data)
    if serializer.is_valid():
        delivery_id = serializer.validated_data['delivery_id']
        delivery = get_object_or_404(Delivery, id=delivery_id)
        
        try:
            with transaction.atomic():
                delivery.confirm_delivery(request.user)
                return Response(
                    {'message': 'Delivery confirmed and stock updated successfully'},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            return Response(
                {'error': f'Failed to confirm delivery: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def purchase_order_status(request, order_id):
    """Get purchase order status and delivery progress"""
    purchase_order = get_object_or_404(PurchaseOrder, id=order_id)
    
    # Calculate delivery progress
    total_items = purchase_order.items.count()
    delivered_items = 0
    total_quantity_ordered = 0
    total_quantity_received = 0
    
    for item in purchase_order.items.all():
        total_quantity_ordered += item.quantity_ordered
        # Check if there are deliveries for this item
        delivery_items = DeliveryItem.objects.filter(purchase_order_item=item)
        if delivery_items.exists():
            delivered_items += 1
            total_quantity_received += sum(di.quantity_received for di in delivery_items)
    
    progress_percentage = (delivered_items / total_items * 100) if total_items > 0 else 0
    quantity_progress = (total_quantity_received / total_quantity_ordered * 100) if total_quantity_ordered > 0 else 0
    
    return Response({
        'purchase_order': PurchaseOrderSerializer(purchase_order).data,
        'delivery_progress': {
            'items_delivered': delivered_items,
            'total_items': total_items,
            'progress_percentage': round(progress_percentage, 2),
            'quantity_received': total_quantity_received,
            'quantity_ordered': total_quantity_ordered,
            'quantity_progress': round(quantity_progress, 2)
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supplier_products(request, supplier_id):
    """Get products that can be ordered from a specific supplier"""
    supplier = get_object_or_404(Supplier, id=supplier_id)
    
    # For now, return all active products
    # In a real scenario, you might have a relationship between suppliers and products
    from products.models import Product
    products = Product.objects.filter(is_active=True)
    
    from products.serializers import ProductSerializer
    return Response({
        'supplier': SupplierSerializer(supplier).data,
        'products': ProductSerializer(products, many=True).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_deliveries(request):
    """Get all pending deliveries that need to be confirmed"""
    pending_deliveries = Delivery.objects.filter(status__in=['pending', 'received', 'verified']).prefetch_related('items__product', 'items__purchase_order_item__product').select_related('purchase_order__supplier', 'received_by')
    serializer = DeliverySerializer(pending_deliveries, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_products(request):
    """Get products with low stock that might need reordering"""
    from products.models import Product
    low_stock_products = Product.objects.filter(
        is_active=True,
        stock_quantity__lte=models.F('min_stock_level')
    )
    
    from products.serializers import ProductSerializer
    return Response(ProductSerializer(low_stock_products, many=True).data)