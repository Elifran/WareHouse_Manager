from django.contrib import admin
from .models import Category, TaxClass, Unit, UnitConversion, Product, StockMovement

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(TaxClass)
class TaxClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'tax_rate', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'symbol', 'is_base_unit', 'is_active', 'created_at']
    list_filter = ['is_base_unit', 'is_active']
    search_fields = ['name', 'symbol', 'description']
    ordering = ['name']

@admin.register(UnitConversion)
class UnitConversionAdmin(admin.ModelAdmin):
    list_display = ['from_unit', 'to_unit', 'conversion_factor', 'is_active', 'created_at']
    list_filter = ['is_active', 'from_unit', 'to_unit']
    search_fields = ['from_unit__name', 'to_unit__name', 'description']
    ordering = ['from_unit__name', 'to_unit__name']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'unit', 'base_unit', 'price', 'cost_price', 'stock_quantity', 'is_active']
    list_filter = ['category', 'tax_class', 'unit', 'base_unit', 'is_active']
    search_fields = ['name', 'sku', 'description']
    ordering = ['name']
    fieldsets = (
        (None, {
            'fields': ('name', 'sku', 'description', 'category', 'is_active')
        }),
        ('Pricing', {
            'fields': ('price', 'cost_price', 'tax_class')
        }),
        ('Units & Stock', {
            'fields': ('unit', 'base_unit', 'stock_quantity', 'min_stock_level', 'max_stock_level')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'unit', 'reference_number', 'created_by', 'created_at']
    list_filter = ['movement_type', 'unit', 'created_at']
    search_fields = ['product__name', 'product__sku', 'reference_number', 'notes']
    ordering = ['-created_at']
    fieldsets = (
        (None, {
            'fields': ('product', 'movement_type', 'quantity', 'unit')
        }),
        ('Reference', {
            'fields': ('reference_number', 'notes')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at']
