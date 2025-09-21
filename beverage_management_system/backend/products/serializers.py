from rest_framework import serializers
from .models import Category, Product, StockMovement, TaxClass

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

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    tax_class_name = serializers.CharField(source='tax_class.name', read_only=True)
    tax_rate = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    is_low_stock = serializers.SerializerMethodField()
    is_out_of_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'tax_class', 'tax_class_name', 'tax_rate',
            'sku', 'price', 'cost_price', 'stock_quantity', 'min_stock_level', 
            'max_stock_level', 'unit', 'is_active', 'profit_margin', 
            'is_low_stock', 'is_out_of_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_low_stock(self, obj):
        return obj.is_low_stock
    
    def get_is_out_of_stock(self, obj):
        return obj.is_out_of_stock
    
    def validate_sku(self, value):
        if self.instance and self.instance.sku == value:
            return value
        if Product.objects.filter(sku=value).exists():
            raise serializers.ValidationError("A product with this SKU already exists.")
        return value

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'movement_type', 'quantity', 
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
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category_name', 'tax_class', 'tax_class_name', 'tax_rate', 'sku', 'price', 'stock_quantity', 
            'unit', 'is_active', 'is_low_stock', 'is_out_of_stock'
        ]
    
    def get_is_low_stock(self, obj):
        return obj.is_low_stock
    
    def get_is_out_of_stock(self, obj):
        return obj.is_out_of_stock
