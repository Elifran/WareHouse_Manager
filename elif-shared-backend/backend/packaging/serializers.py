from rest_framework import serializers
from .models import PackagingTransaction, PackagingItem, PackagingPayment
from products.models import Product, Unit
from sales.models import Sale


class PackagingItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True)
    
    class Meta:
        model = PackagingItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit', 'unit_name', 'unit_symbol', 
                 'unit_price', 'total_price', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PackagingItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagingItem
        fields = ['product', 'quantity', 'unit', 'unit_price', 'notes']


class PackagingPaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = PackagingPayment
        fields = ['id', 'amount', 'payment_method', 'notes', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_by_name', 'created_at']


class PackagingTransactionSerializer(serializers.ModelSerializer):
    items = PackagingItemSerializer(many=True, read_only=True)
    payments = PackagingPaymentSerializer(many=True, read_only=True)
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = PackagingTransaction
        fields = ['id', 'transaction_number', 'transaction_type', 'sale', 'sale_number',
                 'customer_name', 'customer_phone', 'customer_email', 'total_amount',
                 'paid_amount', 'remaining_amount', 'payment_status', 'payment_method',
                 'status', 'notes', 'items', 'payments', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'transaction_number', 'created_by_name', 'created_at', 'updated_at']


class PackagingTransactionCreateSerializer(serializers.ModelSerializer):
    items = PackagingItemCreateSerializer(many=True)
    
    class Meta:
        model = PackagingTransaction
        fields = ['transaction_type', 'sale', 'customer_name', 'customer_phone', 'customer_email',
                 'payment_method', 'status', 'notes', 'items']
    
    def validate_sale(self, value):
        if not value:
            raise serializers.ValidationError("Sale is required")
        return value
    
    def create(self, validated_data):
        from decimal import Decimal
        import uuid
        
        items_data = validated_data.pop('items')
        
        # Generate transaction number
        transaction_number = f"PKG-{uuid.uuid4().hex[:8].upper()}"
        
        # Create packaging transaction
        transaction = PackagingTransaction.objects.create(
            transaction_number=transaction_number,
            **validated_data
        )
        
        # Create packaging items
        for item_data in items_data:
            # Convert product ID to Product object
            product_id = item_data.pop('product')
            product = Product.objects.get(id=product_id)
            
            # Convert unit ID to Unit object
            unit_id = item_data.pop('unit')
            try:
                unit = Unit.objects.get(id=unit_id)
            except Unit.DoesNotExist:
                # Fallback to piece unit if the specified unit doesn't exist
                unit = Unit.objects.get(symbol='pc', is_base_unit=True)
            
            # Ensure unit_price is set from product if not provided
            if 'unit_price' not in item_data or not item_data['unit_price']:
                item_data['unit_price'] = product.packaging_price or Decimal('0.00')
            
            PackagingItem.objects.create(
                transaction=transaction,
                product=product,
                unit=unit,
                **item_data
            )
        
        # Calculate totals
        transaction.calculate_totals()
        
        return transaction


class PackagingPaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagingPayment
        fields = ['amount', 'payment_method', 'notes']
    
    def create(self, validated_data):
        transaction = self.context['transaction']
        created_by = self.context['created_by']
        
        payment = PackagingPayment.objects.create(
            transaction=transaction,
            created_by=created_by,
            **validated_data
        )
        
        # Update transaction payment amounts
        transaction.paid_amount += payment.amount
        transaction.calculate_totals()
        
        return payment

