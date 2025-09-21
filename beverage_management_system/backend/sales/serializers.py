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
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity', 'unit', 'unit_name', 'unit_symbol', 'unit_price', 'unit_cost', 'total_price', 'total_cost', 'price_mode']
        read_only_fields = ['id', 'total_price', 'unit_cost', 'total_cost']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

class SaleItemCreateSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField()
    unit = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    price_mode = serializers.ChoiceField(choices=[('standard', 'Standard'), ('wholesale', 'Wholesale')], default='standard')
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value
    
    def validate_unit(self, value):
        # Handle case where unit might be a Unit object instead of ID
        if hasattr(value, 'id'):
            return value.id
        
        # Ensure it's an integer
        try:
            return int(value)
        except (ValueError, TypeError) as e:
            raise serializers.ValidationError(f"Unit must be a valid integer ID, got: {value}")
    
    def validate(self, data):
        return data

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
        print(f"SaleCreateSerializer.create - validated_data: {validated_data}")
        items_data = validated_data.pop('items')
        print(f"SaleCreateSerializer.create - items_data: {items_data}")
        sale = Sale.objects.create(**validated_data)
        
        # Generate sale number
        sale.sale_number = f"SALE-{sale.id:06d}"
        sale.save()
        
        # Create sale items and calculate subtotal, cost, and tax
        subtotal = Decimal('0.00')
        total_cost = Decimal('0.00')
        total_tax = Decimal('0.00')
        
        for item_data in items_data:
            # Convert product ID to Product object for the ForeignKey
            from products.models import Product
            product_id = item_data.pop('product')
            product = Product.objects.get(id=product_id)
            
            # Ensure unit_price is set from product if not provided
            if 'unit_price' not in item_data or not item_data['unit_price']:
                item_data['unit_price'] = product.price
            
            # Convert unit ID to Unit object for the ForeignKey
            from products.models import Unit
            unit_id = item_data.pop('unit')
            unit = Unit.objects.get(id=unit_id)
            
            item = SaleItem.objects.create(sale=sale, product=product, unit=unit, **item_data)
            subtotal += item.total_price
            
            # Calculate cost and tax for this item based on its product's tax class (tax-inclusive pricing)
            # First, calculate the actual unit cost based on product cost price and unit conversion
            from products.utils import get_unit_conversion_factor
            
            # Get the cost price per unit in the sale unit
            if item.unit and item.unit.id != item.product.base_unit.id:
                # Convert cost price from base unit to sale unit
                from products.utils import get_price_conversion_factor
                conversion_factor = get_price_conversion_factor(item.product.base_unit.id, item.unit.id)
                unit_cost_price = item.product.cost_price * conversion_factor
            else:
                # Same unit as base unit, use cost price directly
                unit_cost_price = item.product.cost_price
            
            # Store the unit cost in the sale item (frozen for historical accuracy)
            item.unit_cost = unit_cost_price
            item.save()  # Save to update total_cost
            
            # Calculate tax and cost for sale totals
            if item.product.tax_class and item.product.tax_class.is_active and item.product.tax_class.tax_rate > 0:
                # For tax-inclusive pricing: 
                # tax = (price × tax_rate) / (100 + tax_rate)
                # cost = (price × 100) / (100 + tax_rate)
                item_tax = (item.total_price * item.product.tax_class.tax_rate) / (Decimal('100.00') + item.product.tax_class.tax_rate)
                item_cost = (item.total_price * Decimal('100.00')) / (Decimal('100.00') + item.product.tax_class.tax_rate)
                total_tax += item_tax
                total_cost += item_cost
            else:
                # No tax or 0% tax rate, use the stored total cost
                total_cost += item.total_cost
        
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
