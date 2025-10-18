from rest_framework import serializers
from decimal import Decimal
from .models import Sale, SaleItem, Payment, SalePackaging, PackagingReturn
from products.serializers import ProductListSerializer

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True)
    quantity_display = serializers.SerializerMethodField()
    
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity', 'quantity_display', 'unit', 'unit_name', 'unit_symbol', 'unit_price', 'unit_cost', 'total_price', 'total_cost', 'price_mode', 'original_sale_item']
        read_only_fields = ['id', 'total_price', 'unit_cost', 'total_cost']
    
    def get_quantity_display(self, obj):
        """Get quantity in the display unit"""
        return obj.get_quantity_in_unit(obj.unit or obj.product.base_unit)
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value
    
    def to_representation(self, instance):
        """Override to show quantity in display unit"""
        data = super().to_representation(instance)
        # Show quantity in the unit used for this sale item
        data['quantity'] = instance.get_quantity_in_unit(instance.unit or instance.product.base_unit)
        return data
    
    def to_internal_value(self, data):
        """Override to convert quantity to base unit for storage"""
        # Convert quantity from display unit to base unit
        if 'quantity' in data and 'unit' in data:
            try:
                from products.models import Unit, UnitConversion
                
                unit = Unit.objects.get(id=data['unit'])
                product_id = data.get('product')
                if product_id:
                    from products.models import Product
                    product = Product.objects.get(id=product_id)
                    
                    if unit != product.base_unit:
                        # The frontend is sending quantities in the selected unit
                        # We need to convert them to base unit quantities by multiplying by the conversion factor
                        try:
                            conversion = UnitConversion.objects.get(
                                from_unit=unit,
                                to_unit=product.base_unit,
                                is_active=True
                            )
                            # Always multiply by conversion factor to convert to base unit
                            # If frontend sends 10 24-Pack, we need 10 × 24 = 240 pieces
                            data['quantity'] = float(data['quantity']) * float(conversion.conversion_factor)
                        except UnitConversion.DoesNotExist:
                            try:
                                conversion = UnitConversion.objects.get(
                                    from_unit=product.base_unit,
                                    to_unit=unit,
                                    is_active=True
                                )
                                # Always multiply by conversion factor to convert to base unit
                                data['quantity'] = float(data['quantity']) * float(conversion.conversion_factor)
                            except UnitConversion.DoesNotExist:
                                pass  # Keep original value if no conversion found
            except (Unit.DoesNotExist, Product.DoesNotExist, ValueError):
                pass  # Keep original value if conversion fails
        
        return super().to_internal_value(data)

class SaleItemCreateSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.FloatField()
    unit = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    price_mode = serializers.ChoiceField(choices=[('standard', 'Standard'), ('wholesale', 'Wholesale')], default='standard')
    original_sale_item = serializers.IntegerField(required=False, allow_null=True)
    
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
        # Convert quantity from display unit to base unit
        if 'quantity' in data and 'unit' in data and 'product' in data:
            try:
                from products.models import Unit, UnitConversion, Product
                
                unit = Unit.objects.get(id=data['unit'])
                product = Product.objects.get(id=data['product'])
                
                if unit != product.base_unit:
                    # The frontend is sending quantities in the selected unit
                    # We need to convert them to base unit quantities by multiplying by the conversion factor
                    try:
                        conversion = UnitConversion.objects.get(
                            from_unit=unit,
                            to_unit=product.base_unit,
                            is_active=True
                        )
                        # Always multiply by conversion factor to convert to base unit
                        # If frontend sends 10 24-Pack, we need 10 × 24 = 240 pieces
                        data['quantity'] = float(data['quantity']) * float(conversion.conversion_factor)
                    except UnitConversion.DoesNotExist:
                        try:
                            conversion = UnitConversion.objects.get(
                                from_unit=product.base_unit,
                                to_unit=unit,
                                is_active=True
                            )
                            # Always multiply by conversion factor to convert to base unit
                            data['quantity'] = float(data['quantity']) * float(conversion.conversion_factor)
                        except UnitConversion.DoesNotExist:
                            pass  # Keep original value if no conversion found
            except (Unit.DoesNotExist, Product.DoesNotExist, ValueError):
                pass  # Keep original value if conversion fails
        
        return data

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'amount', 'payment_method', 'reference_number', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

class SalePackagingSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True)
    
    class Meta:
        model = SalePackaging
        fields = [
            'id', 'sale', 'product', 'product_name', 'product_sku', 'quantity', 
            'unit', 'unit_name', 'unit_symbol', 'unit_price', 'total_price', 
            'status', 'customer_name', 'customer_phone', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_price', 'created_at', 'updated_at']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

class SalePackagingCreateSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.FloatField()
    unit = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.ChoiceField(choices=[('exchange', 'Exchange'), ('consignation', 'Consignation (Paid)'), ('due', 'Due (To be returned)')], default='consignation')
    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

class PackagingReturnSerializer(serializers.ModelSerializer):
    sale_packaging_product = serializers.CharField(source='sale_packaging.product.name', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.username', read_only=True)
    
    class Meta:
        model = PackagingReturn
        fields = [
            'id', 'sale_packaging', 'sale_packaging_product', 'return_type', 
            'quantity_returned', 'refund_amount', 'notes', 'processed_by', 
            'processed_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_quantity_returned(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity returned must be greater than 0.")
        return value

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    packaging_items = SalePackagingSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    sold_by_name = serializers.CharField(source='sold_by.username', read_only=True)
    items_count = serializers.SerializerMethodField()
    packaging_count = serializers.SerializerMethodField()
    original_sale_number = serializers.CharField(source='original_sale.sale_number', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'sale_type', 'original_sale', 'original_sale_number',
            'customer_name', 'customer_phone', 'customer_email',
            'status', 'payment_method', 'subtotal', 'cost_amount', 'tax_amount', 'discount_amount', 'packaging_total',
            'total_amount', 'paid_amount', 'remaining_amount', 'payment_status', 'due_date', 'notes', 'sold_by', 'sold_by_name', 
            'items', 'packaging_items', 'payments', 'items_count', 'packaging_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sale_number', 'subtotal', 'cost_amount', 'tax_amount', 'packaging_total', 'total_amount', 'created_at', 'updated_at']
    
    def get_items_count(self, obj):
        return obj.items.count()
    
    def get_packaging_count(self, obj):
        return obj.packaging_items.count()
    
    def update(self, instance, validated_data):
        # Get items data from the request data (passed through context)
        items_data = None
        if hasattr(self, 'context') and self.context.get('request'):
            request = self.context.get('request')
            if hasattr(request, 'data'):
                items_data = request.data.get('items', None)
        
        # Handle items update if provided
        if items_data is not None:
            # Update existing items
            for item_data in items_data:
                item_id = item_data.get('id')
                if item_id:
                    try:
                        item = SaleItem.objects.get(id=item_id, sale=instance)
                        
                        # Get the new quantity and convert it to base unit if needed
                        new_quantity = item_data.get('quantity', item.quantity)
                        if new_quantity != item.quantity:
                            # The frontend is sending quantity in display unit, convert to base unit
                            if item.unit != item.product.base_unit:
                                # Convert from display unit to base unit using the product's conversion method
                                base_quantity = item.product.convert_quantity(new_quantity, item.unit, item.product.base_unit)
                                item.quantity = base_quantity
                            else:
                                # Already in base unit
                                item.quantity = new_quantity
                        
                        # Update other fields (price_mode is read-only)
                        from decimal import Decimal
                        unit_price = item_data.get('unit_price', item.unit_price)
                        if unit_price is not None:
                            item.unit_price = Decimal(str(unit_price))
                        
                        unit_cost = item_data.get('unit_cost', item.unit_cost)
                        if unit_cost is not None:
                            item.unit_cost = Decimal(str(unit_cost))
                        
                        item.save()
                    except SaleItem.DoesNotExist:
                        pass  # Skip items that don't exist
                    except Exception as e:
                        raise e
            
            # Recalculate sale totals after updating items
            instance.calculate_totals()
        
        # Update the sale instance with other fields
        return super().update(instance, validated_data)

class SaleCreateSerializer(serializers.ModelSerializer):
    items = SaleItemCreateSerializer(many=True)
    packaging_items = SalePackagingCreateSerializer(many=True, required=False)
    sale_type = serializers.ChoiceField(choices=[('sale', 'Sale'), ('return', 'Return')], default='sale')
    
    class Meta:
        model = Sale
        fields = [
            'sale_type', 'original_sale', 'customer_name', 'customer_phone', 'customer_email', 'payment_method',
            'discount_amount', 'paid_amount', 'notes', 'items', 'packaging_items'
        ]
    
    def validate_original_sale(self, value):
        """Validate original_sale field"""
        # Only validate if we have a value and we're creating a return
        if value:
            # Check if this is a return by looking at the sale_type in the data
            sale_type = self.initial_data.get('sale_type', 'sale')
            if sale_type == 'return':
                # For returns, ensure the original sale exists and is completed
                if value.status != 'completed':
                    raise serializers.ValidationError("Can only create returns for completed sales")
        return value
    
    def validate_paid_amount(self, value):
        """Validate paid_amount field"""
        if value is None:
            value = 0
        if value < 0:
            raise serializers.ValidationError("Paid amount cannot be negative")
        return value
    
    def validate_customer_name(self, value):
        """Validate customer_name field"""
        # Customer name is required for partial payments, but we can't validate this here
        # because we don't have the total amount yet. This validation will be done in the create method.
        return value
    
    def create(self, validated_data):
        from products.models import Product, Unit
        from .models import SaleItem, SalePackaging
        
        items_data = validated_data.pop('items')
        packaging_items_data = validated_data.pop('packaging_items', [])
        sale = Sale.objects.create(**validated_data)
        
        # Generate sale number based on sale type
        if sale.sale_type == 'return':
            sale.sale_number = f"RET-{sale.id:06d}"
        else:
            sale.sale_number = f"SALE-{sale.id:06d}"
        sale.save()
        
        # Create sale items and calculate subtotal, cost, and tax
        subtotal = Decimal('0.00')
        total_cost = Decimal('0.00')
        total_tax = Decimal('0.00')
        
        for item_data in items_data:
            # Convert product ID to Product object for the ForeignKey
            product_id = item_data.pop('product')
            product = Product.objects.get(id=product_id)
            
            # Handle original_sale_item for returns
            original_sale_item = None
            if 'original_sale_item' in item_data and item_data['original_sale_item']:
                original_sale_item = SaleItem.objects.get(id=item_data.pop('original_sale_item'))
            elif 'original_sale_item' in item_data:
                # Remove the field if it's None or empty
                item_data.pop('original_sale_item')
            
            # Ensure unit_price is set from product if not provided
            if 'unit_price' not in item_data or not item_data['unit_price']:
                if original_sale_item:
                    item_data['unit_price'] = original_sale_item.unit_price
                else:
                    item_data['unit_price'] = product.price
            
            # Convert unit ID to Unit object for the ForeignKey
            unit_id = item_data.pop('unit')
            unit = Unit.objects.get(id=unit_id)
            
            item = SaleItem.objects.create(sale=sale, product=product, unit=unit, original_sale_item=original_sale_item, **item_data)
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
        
        # Create packaging items
        packaging_total = Decimal('0.00')
        for packaging_data in packaging_items_data:
            # Convert product ID to Product object for the ForeignKey
            product_id = packaging_data.pop('product')
            product = Product.objects.get(id=product_id)
            
            # Convert unit ID to Unit object for the ForeignKey
            unit_id = packaging_data.pop('unit')
            try:
                unit = Unit.objects.get(id=unit_id)
            except Unit.DoesNotExist:
                # Fallback to piece unit if the specified unit doesn't exist
                unit = Unit.objects.get(symbol='pc', is_base_unit=True)
            
            # Ensure unit_price is set from product if not provided
            if 'unit_price' not in packaging_data or not packaging_data['unit_price']:
                packaging_data['unit_price'] = product.packaging_price or Decimal('0.00')
            
            # Set customer info from sale if not provided
            if not packaging_data.get('customer_name'):
                packaging_data['customer_name'] = sale.customer_name
            if not packaging_data.get('customer_phone'):
                packaging_data['customer_phone'] = sale.customer_phone
            
            packaging = SalePackaging.objects.create(sale=sale, product=product, unit=unit, **packaging_data)
            packaging_total += packaging.total_price
        
        # Calculate totals (tax-inclusive pricing)
        sale.subtotal = subtotal  # This is the total amount including tax
        sale.cost_amount = total_cost  # This is the cost excluding tax
        sale.tax_amount = total_tax  # This is the tax portion of the total
        sale.packaging_total = packaging_total  # Total packaging amount
        # Sales total should only include product amounts, not packaging
        sale.total_amount = sale.subtotal - sale.discount_amount  # Total after discount excluding packaging
        
        # Calculate payment amounts (only for product sales, not packaging)
        sale.remaining_amount = sale.total_amount - sale.paid_amount
        
        # Update payment status based on product sales only
        if sale.paid_amount >= sale.total_amount:
            sale.payment_status = 'paid'
        elif sale.paid_amount > 0:
            sale.payment_status = 'partial'
        else:
            sale.payment_status = 'pending'
        
        # Validate customer name for partial payments
        if sale.payment_status == 'partial' and (not sale.customer_name or not sale.customer_name.strip()):
            sale.delete()  # Clean up the created sale
            raise serializers.ValidationError("Customer name is required for partial payments")
        
        sale.save()
        
        # Handle stock movements based on sale type
        if sale.sale_type == 'return':
            # For returns, immediately restore stock
            from products.models import StockMovement
            for item in sale.items.all():
                StockMovement.objects.create(
                    product=item.product,
                    movement_type='return',
                    quantity=item.quantity,
                    unit=item.product.base_unit,
                    reference_number=sale.sale_number,
                    notes=f'Return sale {sale.sale_number}',
                    created_by=sale.sold_by
                )
        else:
            # For regular sales, stock deduction is handled in the complete_sale endpoint
            # This prevents double deduction of stock
            pass
        
        return sale

class SaleListSerializer(serializers.ModelSerializer):
    sold_by_name = serializers.CharField(source='sold_by.username', read_only=True)
    items_count = serializers.SerializerMethodField()
    packaging_count = serializers.SerializerMethodField()
    items = SaleItemSerializer(many=True, read_only=True)
    packaging_items = SalePackagingSerializer(many=True, read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'sale_type', 'customer_name', 'status', 'payment_method',
            'subtotal', 'packaging_total', 'total_amount', 'paid_amount', 'remaining_amount', 'payment_status', 'due_date',
            'sold_by_name', 'items_count', 'packaging_count', 'items', 'packaging_items', 'created_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()
    
    def get_packaging_count(self, obj):
        return obj.packaging_items.count()
