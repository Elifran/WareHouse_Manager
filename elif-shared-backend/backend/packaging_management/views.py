from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import PackagingTransaction, PackagingItem, PackagingPayment
from .serializers import (
    PackagingTransactionSerializer, PackagingTransactionCreateSerializer,
    PackagingItemSerializer, PackagingPaymentSerializer, PackagingPaymentCreateSerializer
)
from sales.models import Sale


class PackagingTransactionListCreateView(generics.ListCreateAPIView):
    queryset = PackagingTransaction.objects.select_related('sale', 'created_by').prefetch_related('items__product', 'items__unit', 'payments').all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PackagingTransactionCreateSerializer
        return PackagingTransactionSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PackagingTransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PackagingTransaction.objects.select_related('sale', 'created_by').prefetch_related('items__product', 'items__unit', 'payments').all()
    serializer_class = PackagingTransactionSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'


class PackagingItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PackagingItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        transaction_id = self.kwargs['transaction_id']
        return PackagingItem.objects.filter(transaction_id=transaction_id).select_related('product', 'unit')
    
    def perform_create(self, serializer):
        transaction_id = self.kwargs['transaction_id']
        transaction = get_object_or_404(PackagingTransaction, id=transaction_id)
        serializer.save(transaction=transaction)


class PackagingItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PackagingItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        transaction_id = self.kwargs['transaction_id']
        return PackagingItem.objects.filter(transaction_id=transaction_id).select_related('product', 'unit')


class PackagingPaymentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PackagingPaymentCreateSerializer
        return PackagingPaymentSerializer
    
    def get_queryset(self):
        transaction_id = self.kwargs['transaction_id']
        return PackagingPayment.objects.filter(transaction_id=transaction_id).select_related('created_by')
    
    def perform_create(self, serializer):
        transaction_id = self.kwargs['transaction_id']
        transaction = get_object_or_404(PackagingTransaction, id=transaction_id)
        serializer.save(transaction=transaction, created_by=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_packaging_by_sale(request, sale_id):
    """Get all packaging transactions for a specific sale"""
    try:
        sale = get_object_or_404(Sale, id=sale_id)
        transactions = PackagingTransaction.objects.filter(sale=sale).select_related('created_by').prefetch_related('items__product', 'items__unit', 'payments')
        
        serializer = PackagingTransactionSerializer(transactions, many=True)
        return Response({
            'sale': {
                'id': sale.id,
                'sale_number': sale.sale_number,
                'customer_name': sale.customer_name,
                'customer_phone': sale.customer_phone,
            },
            'packaging_transactions': serializer.data
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_packaging_from_sale(request, sale_id):
    """Create packaging transaction from sale data"""
    try:
        sale = get_object_or_404(Sale, id=sale_id)
        
        # Get packaging items from the sale
        packaging_items = sale.packaging_items.all()
        if not packaging_items.exists():
            return Response({'error': 'No packaging items found in this sale'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create packaging transaction data
        transaction_data = {
            'transaction_type': 'consignation',
            'sale': sale.id,
            'customer_name': sale.customer_name,
            'customer_phone': sale.customer_phone,
            'customer_email': sale.customer_email,
            'payment_method': 'cash',
            'status': 'active',
            'notes': f'Packaging transaction created from sale {sale.sale_number}',
            'items': []
        }
        
        # Convert sale packaging items to transaction items
        for item in packaging_items:
            transaction_data['items'].append({
                'product': item.product.id,
                'quantity': item.quantity,
                'unit': item.unit.id if item.unit else None,
                'unit_price': item.unit_price,
                'notes': item.notes
            })
        
        serializer = PackagingTransactionCreateSerializer(data=transaction_data)
        if serializer.is_valid():
            transaction = serializer.save(created_by=request.user)
            
            # Set the paid amount to the total amount since packaging was paid as part of the sale
            transaction.paid_amount = transaction.total_amount
            transaction.payment_status = 'paid'
            transaction.status = 'completed'
            transaction.save(update_fields=['paid_amount', 'payment_status', 'status'])
            
            return Response({
                'message': 'Packaging transaction created successfully',
                'transaction': PackagingTransactionSerializer(transaction).data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def settle_packaging_transaction(request, transaction_id):
    """Settle a packaging transaction (mark as completed/returned)"""
    try:
        transaction = get_object_or_404(PackagingTransaction, id=transaction_id)
        
        # Allow settlement for both active and completed consignations (to record returns)
        if transaction.status not in ['active', 'completed']:
            return Response({'error': 'Only active or completed transactions can be settled'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get settlement data from request
        settlement_type = request.data.get('settlement_type', 'return')  # 'return' or 'refund'
        notes = request.data.get('notes', '')
        
        # Update transaction status
        if settlement_type == 'return':
            # If returned, mark completed and convert consignation to exchange to reflect returned empties
            transaction.status = 'completed'
            if transaction.transaction_type == 'consignation':
                transaction.transaction_type = 'exchange'
            transaction.notes = f"{transaction.notes}\nSettled: Packaging returned by customer. {notes}".strip()
        elif settlement_type == 'refund':
            transaction.status = 'completed'
            transaction.notes = f"{transaction.notes}\nSettled: Packaging deposit refunded. {notes}".strip()
        else:
            return Response({'error': 'Invalid settlement type. Use "return" or "refund"'}, status=status.HTTP_400_BAD_REQUEST)
        
        transaction.save()
        
        # Create a zero-amount settlement line for audit trail
        PackagingPayment.objects.create(
            transaction=transaction,
            action_type='settle',
            amount=0,
            payment_method='none',
            notes=f"Settlement recorded: {settlement_type}. {notes}",
            created_by=request.user
        )
        
        serializer = PackagingTransactionSerializer(transaction)
        return Response({
            'message': f'Packaging transaction settled successfully as {settlement_type}',
            'transaction': serializer.data
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def packaging_statistics(request):
    """Get packaging statistics"""
    try:
        from django.db.models import Sum, Count
        from decimal import Decimal
        
        # Get basic statistics
        total_transactions = PackagingTransaction.objects.count()
        active_transactions = PackagingTransaction.objects.filter(status='active').count()
        completed_transactions = PackagingTransaction.objects.filter(status='completed').count()
        
        # Get payment statistics
        total_amount = PackagingTransaction.objects.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
        paid_amount = PackagingTransaction.objects.aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')
        remaining_amount = total_amount - paid_amount
        
        # Get transaction type breakdown
        type_breakdown = PackagingTransaction.objects.values('transaction_type').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        )
        
        return Response({
            'total_transactions': total_transactions,
            'active_transactions': active_transactions,
            'completed_transactions': completed_transactions,
            'total_amount': total_amount,
            'paid_amount': paid_amount,
            'remaining_amount': remaining_amount,
            'type_breakdown': list(type_breakdown)
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
