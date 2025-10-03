from rest_framework import serializers
from .models import Supplier, PurchaseOrder, PurchaseOrderItem, Delivery, DeliveryItem
from products.serializers import ProductSerializer, TaxClassSerializer, UnitSerializer


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tax_class = TaxClassSerializer(read_only=True)
    tax_class_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    quantity_display = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'
        read_only_fields = ['line_total', 'tax_amount', 'purchase_order']
    
    def get_quantity_display(self, obj):
        """Get quantity in the display unit"""
        return obj.get_quantity_in_unit(obj.unit or obj.product.base_unit)
    
    def to_representation(self, instance):
        """Override to show quantity in display unit"""
        data = super().to_representation(instance)
        # Show quantity in the unit used for this order item
        data['quantity_ordered'] = instance.get_quantity_in_unit(instance.unit or instance.product.base_unit)
        return data
    
    def to_internal_value(self, data):
        """Override to convert quantity to base unit for storage"""
        # Convert quantity from display unit to base unit
        if 'quantity_ordered' in data and 'product_id' in data and data.get('unit_id') is not None:
            try:
                from products.models import Unit, Product, UnitConversion
                
                unit = Unit.objects.get(id=data['unit_id'])
                product = Product.objects.get(id=data['product_id'])
                
                if unit != product.base_unit:
                    # Convert from display unit to base unit
                    try:
                        conversion = UnitConversion.objects.get(
                            from_unit=unit,
                            to_unit=product.base_unit,
                            is_active=True
                        )
                        # For stock quantities, multiply when converting to base unit
                        # If 1 12-Pack = 12 Pieces, then 10 12-Packs = 10 × 12 = 120 Pieces
                        data['quantity_ordered'] = float(data['quantity_ordered']) * float(conversion.conversion_factor)
                    except UnitConversion.DoesNotExist:
                        try:
                            conversion = UnitConversion.objects.get(
                                from_unit=product.base_unit,
                                to_unit=unit,
                                is_active=True
                            )
                            # For stock quantities, divide when converting to base unit
                            # If 1 Piece = 1/12 12-Pack, then 10 Pieces = 10 ÷ 12 = 0.83 12-Packs
                            data['quantity_ordered'] = float(data['quantity_ordered']) / float(conversion.conversion_factor)
                        except UnitConversion.DoesNotExist:
                            pass  # Keep original value if no conversion found
            except (Unit.DoesNotExist, Product.DoesNotExist, ValueError):
                pass  # Keep original value if conversion fails
        
        return super().to_internal_value(data)
    
    def validate_product_id(self, value):
        from products.models import Product
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product does not exist")
        return value
    
    def validate_unit_id(self, value):
        if value is not None:
            from products.models import Unit
            try:
                Unit.objects.get(id=value)
            except Unit.DoesNotExist:
                raise serializers.ValidationError("Unit does not exist")
        return value
    
    def validate_tax_class_id(self, value):
        if value is not None:
            from products.models import TaxClass
            try:
                TaxClass.objects.get(id=value)
            except TaxClass.DoesNotExist:
                raise serializers.ValidationError("Tax class does not exist")
        return value


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    supplier_id = serializers.IntegerField(write_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['order_number', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    
    def validate_supplier_id(self, value):
        try:
            Supplier.objects.get(id=value)
        except Supplier.DoesNotExist:
            raise serializers.ValidationError("Supplier does not exist")
        return value


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    supplier_id = serializers.IntegerField()
    items = PurchaseOrderItemSerializer(many=True)
    
    class Meta:
        model = PurchaseOrder
        fields = ['supplier_id', 'expected_delivery_date', 'notes', 'items']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        # Get the user from the context (set by the view)
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        
        # Generate unique order number if not provided
        if 'order_number' not in validated_data:
            from django.utils import timezone
            import uuid
            order_number = f"PO-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
            
            # Ensure the order number is unique
            while PurchaseOrder.objects.filter(order_number=order_number).exists():
                order_number = f"PO-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
            
            validated_data['order_number'] = order_number
        
        purchase_order = PurchaseOrder.objects.create(
            created_by=user,
            **validated_data
        )
        
        for item_data in items_data:
            PurchaseOrderItem.objects.create(purchase_order=purchase_order, **item_data)
        
        return purchase_order


class DeliveryItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    purchase_order_item = PurchaseOrderItemSerializer(read_only=True)
    purchase_order_item_id = serializers.IntegerField(write_only=True)
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tax_class = TaxClassSerializer(read_only=True)
    tax_class_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    quantity_display = serializers.SerializerMethodField()
    
    class Meta:
        model = DeliveryItem
        fields = '__all__'
        read_only_fields = ['line_total', 'tax_amount', 'delivery']
    
    def get_quantity_display(self, obj):
        """Get quantity in the display unit"""
        return obj.get_quantity_in_unit(obj.unit or obj.product.base_unit)
    
    def to_representation(self, instance):
        """Override to show quantity in display unit"""
        data = super().to_representation(instance)
        # Show quantity in the unit used for this delivery item
        data['quantity_received'] = instance.get_quantity_in_unit(instance.unit or instance.product.base_unit)
        return data
    
    def to_internal_value(self, data):
        """Override to convert quantity to base unit for storage"""
        # Convert quantity from display unit to base unit
        if 'quantity_received' in data and 'unit_id' in data and 'product_id' in data:
            try:
                from products.models import Unit, Product, UnitConversion
                
                unit = Unit.objects.get(id=data['unit_id'])
                product = Product.objects.get(id=data['product_id'])
                
                if unit != product.base_unit:
                    # Convert from display unit to base unit
                    try:
                        conversion = UnitConversion.objects.get(
                            from_unit=unit,
                            to_unit=product.base_unit,
                            is_active=True
                        )
                        # For stock quantities, multiply when converting to base unit
                        # If 1 12-Pack = 12 Pieces, then 10 12-Packs = 10 × 12 = 120 Pieces
                        data['quantity_received'] = float(data['quantity_received']) * float(conversion.conversion_factor)
                    except UnitConversion.DoesNotExist:
                        try:
                            conversion = UnitConversion.objects.get(
                                from_unit=product.base_unit,
                                to_unit=unit,
                                is_active=True
                            )
                            # For stock quantities, divide when converting to base unit
                            # If 1 Piece = 1/12 12-Pack, then 10 Pieces = 10 ÷ 12 = 0.83 12-Packs
                            data['quantity_received'] = float(data['quantity_received']) / float(conversion.conversion_factor)
                        except UnitConversion.DoesNotExist:
                            pass  # Keep original value if no conversion found
            except (Unit.DoesNotExist, Product.DoesNotExist, ValueError):
                pass  # Keep original value if conversion fails
        
        return super().to_internal_value(data)
    
    def validate_purchase_order_item_id(self, value):
        try:
            PurchaseOrderItem.objects.get(id=value)
        except PurchaseOrderItem.DoesNotExist:
            raise serializers.ValidationError("Purchase order item does not exist")
        return value
    
    def validate_unit_id(self, value):
        if value is not None:
            from products.models import Unit
            try:
                Unit.objects.get(id=value)
            except Unit.DoesNotExist:
                raise serializers.ValidationError("Unit does not exist")
        return value
    
    def validate_quantity_received(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity received cannot be negative")
        return value


class DeliverySerializer(serializers.ModelSerializer):
    purchase_order = PurchaseOrderSerializer(read_only=True)
    purchase_order_id = serializers.IntegerField(write_only=True)
    items = DeliveryItemSerializer(many=True, read_only=True)
    received_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Delivery
        fields = '__all__'
        read_only_fields = ['delivery_number', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    
    def validate_purchase_order_id(self, value):
        try:
            PurchaseOrder.objects.get(id=value)
        except PurchaseOrder.DoesNotExist:
            raise serializers.ValidationError("Purchase order does not exist")
        return value


class DeliveryCreateSerializer(serializers.ModelSerializer):
    purchase_order_id = serializers.IntegerField()
    items = DeliveryItemSerializer(many=True)
    
    class Meta:
        model = Delivery
        fields = ['purchase_order_id', 'notes', 'items']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        delivery = Delivery.objects.create(**validated_data)
        
        for item_data in items_data:
            DeliveryItem.objects.create(delivery=delivery, **item_data)
        
        return delivery


class DeliveryUpdateSerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True)
    
    class Meta:
        model = Delivery
        fields = ['notes', 'items']
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Update delivery notes
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()
        
        # Update delivery items
        if items_data:
            # Clear existing items and create new ones
            instance.items.all().delete()
            for item_data in items_data:
                DeliveryItem.objects.create(delivery=instance, **item_data)
        
        return instance


class DeliveryConfirmSerializer(serializers.Serializer):
    """Serializer for confirming delivery and updating stock"""
    delivery_id = serializers.IntegerField()
    
    def validate_delivery_id(self, value):
        try:
            delivery = Delivery.objects.get(id=value)
            if delivery.status == 'completed':
                raise serializers.ValidationError("Delivery is already completed")
        except Delivery.DoesNotExist:
            raise serializers.ValidationError("Delivery does not exist")
        return value
