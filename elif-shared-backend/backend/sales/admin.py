from django.contrib import admin
from .models import Sale, SaleItem, Payment, SalePackaging, PackagingReturn

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['total_price', 'total_cost']

class SalePackagingInline(admin.TabularInline):
    model = SalePackaging
    extra = 0
    readonly_fields = ['total_price']

class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['sale_number', 'customer_name', 'status', 'payment_method', 'total_amount', 'packaging_total', 'payment_status', 'created_at']
    list_filter = ['status', 'payment_method', 'payment_status', 'sale_type', 'created_at']
    search_fields = ['sale_number', 'customer_name', 'customer_phone']
    readonly_fields = ['sale_number', 'subtotal', 'cost_amount', 'tax_amount', 'packaging_total', 'total_amount', 'created_at', 'updated_at']
    inlines = [SaleItemInline, SalePackagingInline, PaymentInline]
    
    fieldsets = (
        ('Sale Information', {
            'fields': ('sale_number', 'sale_type', 'original_sale', 'status')
        }),
        ('Customer Information', {
            'fields': ('customer_name', 'customer_phone', 'customer_email')
        }),
        ('Payment Information', {
            'fields': ('payment_method', 'payment_status', 'paid_amount', 'remaining_amount', 'due_date')
        }),
        ('Financial Information', {
            'fields': ('subtotal', 'cost_amount', 'tax_amount', 'discount_amount', 'packaging_total', 'total_amount')
        }),
        ('Additional Information', {
            'fields': ('notes', 'sold_by', 'created_at', 'updated_at')
        }),
    )

@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['sale', 'product', 'quantity', 'unit_price', 'total_price', 'price_mode']
    list_filter = ['price_mode', 'sale__status', 'sale__created_at']
    search_fields = ['sale__sale_number', 'product__name', 'product__sku']
    readonly_fields = ['total_price', 'total_cost']

@admin.register(SalePackaging)
class SalePackagingAdmin(admin.ModelAdmin):
    list_display = ['sale', 'product', 'quantity', 'unit_price', 'total_price', 'status', 'customer_name']
    list_filter = ['status', 'sale__status', 'sale__created_at']
    search_fields = ['sale__sale_number', 'product__name', 'product__sku', 'customer_name', 'customer_phone']
    readonly_fields = ['total_price', 'created_at', 'updated_at']

@admin.register(PackagingReturn)
class PackagingReturnAdmin(admin.ModelAdmin):
    list_display = ['sale_packaging', 'return_type', 'quantity_returned', 'refund_amount', 'processed_by', 'created_at']
    list_filter = ['return_type', 'created_at']
    search_fields = ['sale_packaging__sale__sale_number', 'sale_packaging__product__name', 'processed_by__username']
    readonly_fields = ['created_at']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['sale', 'amount', 'payment_method', 'reference_number', 'created_at']
    list_filter = ['payment_method', 'created_at']
    search_fields = ['sale__sale_number', 'reference_number']
    readonly_fields = ['created_at']
