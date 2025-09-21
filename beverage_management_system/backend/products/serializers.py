from rest_framework import serializers
from django.db import models
from .models import Category, Product, StockMovement, TaxClass, Unit, UnitConversion, ProductUnit

class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'products_count', 'created_at', 'updated_at']
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
    
    class Meta:
        model = ProductUnit
        fields = ['id', 'unit', 'unit_name', 'unit_symbol', 'unit_is_base', 'is_default', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
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
                raise serializers.ValidationError("Only one unit can be set as default per product.")
        
        return data

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
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'tax_class', 'tax_class_name', 'tax_rate',
            'sku', 'price', 'cost_price', 'stock_quantity', 'min_stock_level', 
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
        return product
    
    def update(self, instance, validated_data):
        """Update product and set unit field based on base_unit"""
        product = super().update(instance, validated_data)
        if product.base_unit:
            product.unit = product.base_unit.symbol
            product.save(update_fields=['unit'])
        return product
    
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
    available_units = serializers.SerializerMethodField()
    compatible_units = ProductUnitSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category_name', 'tax_class', 'tax_class_name', 'tax_rate', 'sku', 'price', 'stock_quantity', 
            'unit', 'base_unit', 'is_active', 'is_low_stock', 'is_out_of_stock', 'available_units', 'compatible_units'
        ]
    
    def get_is_low_stock(self, obj):
        return obj.is_low_stock
    
    def get_is_out_of_stock(self, obj):
        return obj.is_out_of_stock
    
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
