from rest_framework import serializers
from .models import Sale, SaleItem, Payment
from products.serializers import ProductListSerializer

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['id', 'total_price']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

class SaleItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ['product', 'quantity', 'unit_price']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'amount', 'payment_method', 'reference_number', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    sold_by_name = serializers.CharField(source='sold_by.username', read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'customer_name', 'customer_phone', 'customer_email',
            'status', 'payment_method', 'subtotal', 'tax_amount', 'discount_amount',
            'total_amount', 'notes', 'sold_by', 'sold_by_name', 'items', 'payments',
            'items_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sale_number', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    
    def get_items_count(self, obj):
        return obj.items.count()

class SaleCreateSerializer(serializers.ModelSerializer):
    items = SaleItemCreateSerializer(many=True)
    
    class Meta:
        model = Sale
        fields = [
            'customer_name', 'customer_phone', 'customer_email', 'payment_method',
            'discount_amount', 'notes', 'items'
        ]
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)
        
        # Generate sale number
        sale.sale_number = f"SALE-{sale.id:06d}"
        sale.save()
        
        # Create sale items
        subtotal = 0
        for item_data in items_data:
            item = SaleItem.objects.create(sale=sale, **item_data)
            subtotal += item.total_price
        
        # Calculate totals
        sale.subtotal = subtotal
        sale.tax_amount = subtotal * Decimal('0.18')  # 18% tax
        sale.total_amount = sale.subtotal + sale.tax_amount - sale.discount_amount
        sale.save()
        
        return sale

class SaleListSerializer(serializers.ModelSerializer):
    sold_by_name = serializers.CharField(source='sold_by.username', read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'customer_name', 'status', 'payment_method',
            'total_amount', 'sold_by_name', 'items_count', 'created_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()
