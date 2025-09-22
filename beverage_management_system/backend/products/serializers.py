from rest_framework import serializers
from django.db import models
from .models import Category, Product, StockMovement, TaxClass, Unit, UnitConversion, ProductUnit

class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_sellable', 'products_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()

class TaxClassSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxClass
        fields = ['id', 'name', 'description', 'tax_rate', 'is_active', 'products_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()
    
    def validate_tax_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Tax rate must be between 0 and 100 percent.")
        return value

class UnitSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Unit
        fields = ['id', 'name', 'symbol', 'description', 'is_base_unit', 'is_active', 'products_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_products_count(self, obj):
        # Count products that use this unit through ProductUnit relationship
        from .models import ProductUnit
        return ProductUnit.objects.filter(
            unit=obj,
            product__is_active=True,
            is_active=True
        ).count()

class HierarchicalUnitSerializer(serializers.ModelSerializer):
    """Serializer for units with hierarchical relationships"""
    parent_units = serializers.SerializerMethodField()
    child_units = serializers.SerializerMethodField()
    
    class Meta:
        model = Unit
        fields = ['id', 'name', 'symbol', 'description', 'is_base_unit', 'is_active', 'parent_units', 'child_units']
    
    def get_parent_units(self, obj):
        """Get units that can be converted to this unit (larger units)"""
        parent_conversions = UnitConversion.objects.filter(to_unit=obj, is_active=True)
        return [{
            'id': conv.from_unit.id,
            'name': conv.from_unit.name,
            'symbol': conv.from_unit.symbol,
            'conversion_factor': conv.conversion_factor
        } for conv in parent_conversions]
    
    def get_child_units(self, obj):
        """Get units that this unit can be converted to (smaller units)"""
        child_conversions = UnitConversion.objects.filter(from_unit=obj, is_active=True)
        return [{
            'id': conv.to_unit.id,
            'name': conv.to_unit.name,
            'symbol': conv.to_unit.symbol,
            'conversion_factor': conv.conversion_factor
        } for conv in child_conversions]

class UnitConversionSerializer(serializers.ModelSerializer):
    from_unit_name = serializers.CharField(source='from_unit.name', read_only=True)
    from_unit_symbol = serializers.CharField(source='from_unit.symbol', read_only=True)
    to_unit_name = serializers.CharField(source='to_unit.name', read_only=True)
    to_unit_symbol = serializers.CharField(source='to_unit.symbol', read_only=True)
    
    class Meta:
        model = UnitConversion
        fields = [
            'id', 'from_unit', 'from_unit_name', 'from_unit_symbol', 
            'to_unit', 'to_unit_name', 'to_unit_symbol', 
            'conversion_factor', 'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_conversion_factor(self, value):
        if value <= 0:
            raise serializers.ValidationError("Conversion factor must be greater than 0.")
        return value
    
    def validate(self, data):
        from_unit = data['from_unit']
        to_unit = data['to_unit']
        
        if from_unit == to_unit:
            raise serializers.ValidationError("From unit and to unit cannot be the same.")
        
        # Check that at least one unit is a base unit
        if not from_unit.is_base_unit and not to_unit.is_base_unit:
            raise serializers.ValidationError("At least one of the units must be a base unit.")
        
        # Check that non-base units have only one conversion from base unit
        # If from_unit is not a base unit, check if it already has a conversion from a base unit
        if not from_unit.is_base_unit:
            existing_base_conversion = UnitConversion.objects.filter(
                to_unit=from_unit,
                from_unit__is_base_unit=True,
                is_active=True
            ).exclude(id=self.instance.id if self.instance else None)
            
            if existing_base_conversion.exists():
                raise serializers.ValidationError(f"{from_unit.name} already has a conversion from a base unit.")
        
        # If to_unit is not a base unit, check if it already has a conversion from a base unit
        if not to_unit.is_base_unit:
            existing_base_conversion = UnitConversion.objects.filter(
                to_unit=to_unit,
                from_unit__is_base_unit=True,
                is_active=True
            ).exclude(id=self.instance.id if self.instance else None)
            
            if existing_base_conversion.exists():
                raise serializers.ValidationError(f"{to_unit.name} already has a conversion from a base unit.")
        
        return data

class ProductUnitSerializer(serializers.ModelSerializer):
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True)
    unit_is_base = serializers.BooleanField(source='unit.is_base_unit', read_only=True)
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), write_only=True)
    unit_detail = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProductUnit
        fields = ['id', 'unit', 'unit_detail', 'unit_name', 'unit_symbol', 'unit_is_base', 'is_default', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_unit_detail(self, obj):
        """Return unit as a nested object"""
        return {
            'id': obj.unit.id,
            'name': obj.unit.name,
            'symbol': obj.unit.symbol,
            'is_base_unit': obj.unit.is_base_unit
        }
    
    def to_representation(self, instance):
        """Override to_representation to include unit details"""
        data = super().to_representation(instance)
        # Add unit as a nested object for frontend compatibility
        data['unit'] = self.get_unit_detail(instance)
        return data
    
    
    def create(self, validated_data):
        # Automatically set the product from the context
        product = self.context.get('product')
        if product:
            validated_data['product'] = product
        return super().create(validated_data)
    
    def validate(self, data):
        product = self.context.get('product')
        if not product:
            raise serializers.ValidationError("Product context is required.")
        
        # Check if this unit is already associated with the product
        unit = data.get('unit')
        if unit:
            existing_product_unit = ProductUnit.objects.filter(
                product=product,
                unit=unit
            ).exclude(id=self.instance.id if self.instance else None)
            
            if existing_product_unit.exists():
                # Get the unit name for the error message
                try:
                    from .models import Unit
                    unit_obj = Unit.objects.get(id=unit)
                    unit_name = unit_obj.name
                except Unit.DoesNotExist:
                    unit_name = f"Unit ID {unit}"
                raise serializers.ValidationError(f"Unit '{unit_name}' is already associated with this product.")
        
        # Ensure only one default unit per product
        if data.get('is_default', False):
            existing_default = ProductUnit.objects.filter(
                product=product, 
                is_default=True, 
                is_active=True
            ).exclude(id=self.instance.id if self.instance else None)
            if existing_default.exists():
                # If this is an update operation and we're setting a new default,
                # we need to clear the old default first
                if self.instance:
                    # This will be handled in the update method
                    pass
                else:
                    raise serializers.ValidationError("Only one unit can be set as default per product.")
        
        return data
    
    def update(self, instance, validated_data):
        # If we're setting this unit as default, first clear any existing default
        if validated_data.get('is_default', False):
            product = instance.product
            # Clear existing default units for this product
            ProductUnit.objects.filter(
                product=product,
                is_default=True,
                is_active=True
            ).exclude(id=instance.id).update(is_default=False)
        
        return super().update(instance, validated_data)

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    tax_class_name = serializers.CharField(source='tax_class.name', read_only=True)
    tax_rate = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    is_low_stock = serializers.SerializerMethodField()
    is_out_of_stock = serializers.SerializerMethodField()
    base_unit_name = serializers.CharField(source='base_unit.name', read_only=True)
    base_unit_symbol = serializers.CharField(source='base_unit.symbol', read_only=True)
    available_units = serializers.SerializerMethodField()
    compatible_units = ProductUnitSerializer(many=True, read_only=True)
    stock_in_units = serializers.SerializerMethodField()
    
    # Display fields - these show values in the default unit for reading, but accept input for writing
    price = serializers.FloatField()
    wholesale_price = serializers.FloatField(allow_null=True, required=False)
    cost_price = serializers.FloatField()
    stock_quantity = serializers.FloatField()
    min_stock_level = serializers.FloatField()
    max_stock_level = serializers.FloatField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'tax_class', 'tax_class_name', 'tax_rate',
            'sku', 'price', 'wholesale_price', 'cost_price', 'stock_quantity', 'min_stock_level', 
            'max_stock_level', 'unit', 'base_unit', 'base_unit_name', 'base_unit_symbol', 
            'available_units', 'compatible_units', 'stock_in_units', 'is_active', 'profit_margin', 
            'is_low_stock', 'is_out_of_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_low_stock(self, obj):
        return obj.is_low_stock
    
    def get_is_out_of_stock(self, obj):
        return obj.is_out_of_stock
    
    def get_available_units(self, obj):
        """Get all available units for this product with pricing information"""
        if not obj.base_unit:
            return []
        
        units = []
        
        # Get all compatible units
        for compatible_unit in obj.compatible_units.all():
            unit = compatible_unit.unit
            unit_price = obj.get_price_in_unit(unit)
            unit_cost = obj.get_cost_price_in_unit(unit)
            
            units.append({
                'id': unit.id,
                'name': unit.name,
                'symbol': unit.symbol,
                'price': float(unit_price) if unit_price else 0,
                'cost_price': float(unit_cost) if unit_cost else 0,
                'is_base_unit': unit == obj.base_unit,
                'is_default': compatible_unit.is_default,
                'conversion_factor': self._get_conversion_factor(obj, unit)
            })
        
        return units
    
    def _get_conversion_factor(self, obj, unit):
        """Get conversion factor from base unit to the given unit for display purposes"""
        if unit == obj.base_unit:
            return 1.0
        
        try:
            # Try direct conversion from base unit to target unit
            conversion = UnitConversion.objects.get(
                from_unit=obj.base_unit,
                to_unit=unit,
                is_active=True
            )
            # For display purposes, we want to show how many base units are in the target unit
            return float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            try:
                # Try reverse conversion (this is the common case)
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=obj.base_unit,
                    is_active=True
                )
                # If 1 pack = 12 pieces, then the conversion factor should be 12
                # This means 1 pack contains 12 pieces
                return float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return 1.0
    
    def get_stock_in_units(self, obj):
        """Get stock quantity in all compatible units for this product"""
        if not obj.base_unit:
            return []
        
        from .utils import get_unit_conversion_factor
        
        stock_data = []
        
        # Get all compatible units for this product
        compatible_units = obj.compatible_units.filter(is_active=True).select_related('unit')
        
        for product_unit in compatible_units:
            unit = product_unit.unit
            
            if unit.id == obj.base_unit.id:
                # Base unit - stock is already in this unit
                quantity = obj.stock_quantity
            else:
                # Convert from base unit to this unit
                conversion_factor = get_unit_conversion_factor(obj.base_unit.id, unit.id)
                if conversion_factor:
                    quantity = float(obj.stock_quantity) / float(conversion_factor)
                else:
                    quantity = 0
            
            stock_data.append({
                'unit_id': unit.id,
                'unit_name': unit.name,
                'unit_symbol': unit.symbol,
                'quantity': round(quantity, 2),
                'is_default': product_unit.is_default,
                'is_base_unit': unit.is_base_unit
            })
        
        return stock_data
    
    def create(self, validated_data):
        """Create product and set unit field based on base_unit"""
        product = super().create(validated_data)
        if product.base_unit:
            product.unit = product.base_unit.symbol
            product.save(update_fields=['unit'])
            
            # Automatically create a ProductUnit record for the base unit and set it as default
            from .models import ProductUnit
            ProductUnit.objects.get_or_create(
                product=product,
                unit=product.base_unit,
                defaults={
                    'is_default': True,
                    'is_active': True
                }
            )
        return product
    
    def update(self, instance, validated_data):
        """Update product and convert display unit values back to base unit"""
        # Get the default unit for this product
        default_unit = instance.get_default_unit()
        conversion_factor = 1.0
        
        # Calculate conversion factor from default unit to base unit
        if default_unit != instance.base_unit:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=default_unit,
                    to_unit=instance.base_unit,
                    is_active=True
                )
                conversion_factor = float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                # Try reverse conversion
                try:
                    conversion = UnitConversion.objects.get(
                        from_unit=instance.base_unit,
                        to_unit=default_unit,
                        is_active=True
                    )
                    conversion_factor = 1.0 / float(conversion.conversion_factor)
                except UnitConversion.DoesNotExist:
                    conversion_factor = 1.0
        
        # Convert display unit values to base unit values
        if 'price' in validated_data:
            validated_data['price'] = float(validated_data['price']) / conversion_factor
        if 'wholesale_price' in validated_data and validated_data['wholesale_price'] is not None:
            validated_data['wholesale_price'] = float(validated_data['wholesale_price']) / conversion_factor
        if 'cost_price' in validated_data:
            validated_data['cost_price'] = float(validated_data['cost_price']) / conversion_factor
        if 'stock_quantity' in validated_data:
            validated_data['stock_quantity'] = float(validated_data['stock_quantity']) * conversion_factor
        if 'min_stock_level' in validated_data:
            validated_data['min_stock_level'] = float(validated_data['min_stock_level']) * conversion_factor
        if 'max_stock_level' in validated_data:
            validated_data['max_stock_level'] = float(validated_data['max_stock_level']) * conversion_factor
        
        product = super().update(instance, validated_data)
        if product.base_unit:
            product.unit = product.base_unit.symbol
            product.save(update_fields=['unit'])
        return product
    
    def to_representation(self, instance):
        """Convert base unit values to display unit values for reading"""
        data = super().to_representation(instance)
        
        # Convert base unit values to display unit values
        default_unit = instance.get_default_unit()
        if default_unit != instance.base_unit:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=default_unit,
                    to_unit=instance.base_unit,
                    is_active=True
                )
                conversion_factor = float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                try:
                    conversion = UnitConversion.objects.get(
                        from_unit=instance.base_unit,
                        to_unit=default_unit,
                        is_active=True
                    )
                    conversion_factor = float(conversion.conversion_factor)
                except UnitConversion.DoesNotExist:
                    conversion_factor = 1.0
            
            # Convert values to display unit
            data['price'] = float(instance.price) * conversion_factor
            data['cost_price'] = float(instance.cost_price) * conversion_factor
            data['stock_quantity'] = float(instance.stock_quantity) / conversion_factor
            data['min_stock_level'] = float(instance.min_stock_level) / conversion_factor if instance.min_stock_level > 0 else 0
            data['max_stock_level'] = float(instance.max_stock_level) / conversion_factor if instance.max_stock_level > 0 else 0
            if instance.wholesale_price:
                data['wholesale_price'] = float(instance.wholesale_price) * conversion_factor
        else:
            # Already in base unit, just convert to float
            data['price'] = float(instance.price)
            data['cost_price'] = float(instance.cost_price)
            data['stock_quantity'] = float(instance.stock_quantity)
            data['min_stock_level'] = float(instance.min_stock_level)
            data['max_stock_level'] = float(instance.max_stock_level)
            if instance.wholesale_price:
                data['wholesale_price'] = float(instance.wholesale_price)
        
        return data
    
    def validate_sku(self, value):
        if self.instance and self.instance.sku == value:
            return value
        if Product.objects.filter(sku=value).exists():
            raise serializers.ValidationError("A product with this SKU already exists.")
        return value

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'movement_type', 'quantity', 'unit', 'unit_name', 'unit_symbol',
            'reference_number', 'notes', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity cannot be zero.")
        return value

class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    tax_class_name = serializers.CharField(source='tax_class.name', read_only=True)
    tax_rate = serializers.ReadOnlyField()
    is_low_stock = serializers.SerializerMethodField()
    is_out_of_stock = serializers.SerializerMethodField()
    base_unit_name = serializers.CharField(source='base_unit.name', read_only=True)
    base_unit_symbol = serializers.CharField(source='base_unit.symbol', read_only=True)
    available_units = serializers.SerializerMethodField()
    compatible_units = ProductUnitSerializer(many=True, read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    min_stock_level = serializers.SerializerMethodField()
    max_stock_level = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    wholesale_price = serializers.SerializerMethodField()
    cost_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'tax_class', 'tax_class_name', 'tax_rate', 
            'sku', 'price', 'wholesale_price', 'cost_price', 'stock_quantity', 'min_stock_level', 'max_stock_level',
            'unit', 'base_unit', 'base_unit_name', 'base_unit_symbol', 'is_active', 'is_low_stock', 'is_out_of_stock', 
            'available_units', 'compatible_units'
        ]
    
    def get_is_low_stock(self, obj):
        return obj.is_low_stock
    
    def get_is_out_of_stock(self, obj):
        return obj.is_out_of_stock
    
    def get_stock_quantity(self, obj):
        """Get stock quantity in the default unit"""
        return obj.get_display_quantity()
    
    def get_min_stock_level(self, obj):
        """Get min stock level in the default unit"""
        default_unit = obj.get_default_unit()
        if default_unit == obj.base_unit:
            return obj.min_stock_level
        # Convert min stock level from base unit to default unit
        return obj.convert_quantity(obj.min_stock_level, obj.base_unit, default_unit) if obj.min_stock_level > 0 else 0
    
    def get_max_stock_level(self, obj):
        """Get max stock level in the default unit"""
        default_unit = obj.get_default_unit()
        if default_unit == obj.base_unit:
            return obj.max_stock_level
        # Convert max stock level from base unit to default unit
        return obj.convert_quantity(obj.max_stock_level, obj.base_unit, default_unit) if obj.max_stock_level > 0 else 0
    
    def get_price(self, obj):
        """Get price in the default unit"""
        default_unit = obj.get_default_unit()
        return obj.get_price_in_unit(default_unit)
    
    def get_wholesale_price(self, obj):
        """Get wholesale price in the default unit"""
        default_unit = obj.get_default_unit()
        return obj.get_wholesale_price_in_unit(default_unit)
    
    def get_cost_price(self, obj):
        """Get cost price in the default unit"""
        default_unit = obj.get_default_unit()
        return obj.get_cost_price_in_unit(default_unit)
    
    def get_available_units(self, obj):
        """Get all available units for this product with pricing information"""
        if not obj.base_unit:
            return []
        
        from .utils import calculate_unit_price
        
        units = [{
            'id': obj.base_unit.id, 
            'name': obj.base_unit.name, 
            'symbol': obj.base_unit.symbol,
            'price': float(obj.price),
            'is_base_unit': True
        }]
        
        # Add units that can be converted from base unit
        conversions_from = UnitConversion.objects.filter(
            from_unit=obj.base_unit,
            is_active=True
        ).select_related('to_unit')
        
        for conversion in conversions_from:
            unit_price = calculate_unit_price(obj.price, obj.base_unit.id, conversion.to_unit.id)
            units.append({
                'id': conversion.to_unit.id,
                'name': conversion.to_unit.name,
                'symbol': conversion.to_unit.symbol,
                'price': unit_price,
                'is_base_unit': False,
                'conversion_factor': float(conversion.conversion_factor)
            })
        
        # Add units that can be converted to base unit
        conversions_to = UnitConversion.objects.filter(
            to_unit=obj.base_unit,
            is_active=True
        ).select_related('from_unit')
        
        for conversion in conversions_to:
            if not any(unit['id'] == conversion.from_unit.id for unit in units):
                unit_price = calculate_unit_price(obj.price, obj.base_unit.id, conversion.from_unit.id)
                units.append({
                    'id': conversion.from_unit.id,
                    'name': conversion.from_unit.name,
                    'symbol': conversion.from_unit.symbol,
                    'price': unit_price,
                    'is_base_unit': False,
                    'conversion_factor': float(conversion.conversion_factor)
                })
        
        return units
