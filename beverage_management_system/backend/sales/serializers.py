from rest_framework import serializers
from decimal import Decimal
from .models import Sale, SaleItem, Payment
from products.serializers import ProductListSerializer

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity', 'unit', 'unit_name', 'unit_symbol', 'unit_price', 'total_price']
        read_only_fields = ['id', 'total_price']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

class SaleItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ['product', 'quantity', 'unit', 'unit_price']
    
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
            'status', 'payment_method', 'subtotal', 'cost_amount', 'tax_amount', 'discount_amount',
            'total_amount', 'notes', 'sold_by', 'sold_by_name', 'items', 'payments',
            'items_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sale_number', 'subtotal', 'cost_amount', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    
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
        
        # Create sale items and calculate subtotal, cost, and tax
        subtotal = Decimal('0.00')
        total_cost = Decimal('0.00')
        total_tax = Decimal('0.00')
        
        for item_data in items_data:
            # Ensure unit_price is set from product if not provided
            if 'unit_price' not in item_data or not item_data['unit_price']:
                from products.models import Product
                product = Product.objects.get(id=item_data['product'].id)
                item_data['unit_price'] = product.price
            
            item = SaleItem.objects.create(sale=sale, **item_data)
            subtotal += item.total_price
            
            # Calculate cost and tax for this item based on its product's tax class (tax-inclusive pricing)
            if item.product.tax_class and item.product.tax_class.is_active:
                # For tax-inclusive pricing: 
                # tax = (price × tax_rate) / (100 + tax_rate)
                # cost = (price × 100) / (100 + tax_rate)
                item_tax = (item.total_price * item.product.tax_class.tax_rate) / (Decimal('100.00') + item.product.tax_class.tax_rate)
                item_cost = (item.total_price * Decimal('100.00')) / (Decimal('100.00') + item.product.tax_class.tax_rate)
                total_tax += item_tax
                total_cost += item_cost
            else:
                # No tax, full price is cost
                total_cost += item.total_price
        
        # Calculate totals (tax-inclusive pricing)
        sale.subtotal = subtotal  # This is the total amount including tax
        sale.cost_amount = total_cost  # This is the cost excluding tax
        sale.tax_amount = total_tax  # This is the tax portion of the total
        sale.total_amount = sale.subtotal - sale.discount_amount  # Total after discount
        sale.save()
        
        # Note: Stock deduction is handled in the complete_sale endpoint, not here
        # This prevents double deduction of stock
        
        return sale

class SaleListSerializer(serializers.ModelSerializer):
    sold_by_name = serializers.CharField(source='sold_by.username', read_only=True)
    items_count = serializers.SerializerMethodField()
    items = SaleItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'customer_name', 'status', 'payment_method',
            'total_amount', 'sold_by_name', 'items_count', 'items', 'created_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()
