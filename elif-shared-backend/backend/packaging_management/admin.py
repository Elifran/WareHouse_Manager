from django.contrib import admin
from .models import PackagingTransaction, PackagingItem, PackagingPayment


@admin.register(PackagingTransaction)
class PackagingTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_number', 'transaction_type', 'sale', 'customer_name', 'total_amount', 'payment_status', 'status', 'created_at']
    list_filter = ['transaction_type', 'payment_status', 'status', 'created_at']
    search_fields = ['transaction_number', 'customer_name', 'customer_phone', 'sale__sale_number']
    readonly_fields = ['transaction_number', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(PackagingItem)
class PackagingItemAdmin(admin.ModelAdmin):
    list_display = ['transaction', 'product', 'quantity', 'unit', 'unit_price', 'total_price', 'created_at']
    list_filter = ['transaction__transaction_type', 'created_at']
    search_fields = ['transaction__transaction_number', 'product__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(PackagingPayment)
class PackagingPaymentAdmin(admin.ModelAdmin):
    list_display = ['transaction', 'amount', 'payment_method', 'created_by', 'created_at']
    list_filter = ['payment_method', 'created_at']
    search_fields = ['transaction__transaction_number']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
