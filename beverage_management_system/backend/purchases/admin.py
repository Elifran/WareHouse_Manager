from django.contrib import admin
from .models import Supplier, PurchaseOrder, PurchaseOrderItem, Delivery, DeliveryItem


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'contact_person', 'email']
    ordering = ['name']


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    fields = ['product', 'quantity_ordered', 'unit_cost', 'tax_class', 'line_total', 'tax_amount']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'supplier', 'status', 'order_date', 'total_amount', 'created_by']
    list_filter = ['status', 'order_date', 'supplier']
    search_fields = ['order_number', 'supplier__name']
    inlines = [PurchaseOrderItemInline]
    readonly_fields = ['subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    ordering = ['-created_at']


class DeliveryItemInline(admin.TabularInline):
    model = DeliveryItem
    extra = 1
    fields = ['purchase_order_item', 'product', 'quantity_received', 'unit_cost', 'tax_class', 'line_total', 'tax_amount', 'condition_notes']


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ['delivery_number', 'purchase_order', 'status', 'delivery_date', 'total_amount', 'received_by']
    list_filter = ['status', 'delivery_date', 'purchase_order__supplier']
    search_fields = ['delivery_number', 'purchase_order__order_number']
    inlines = [DeliveryItemInline]
    readonly_fields = ['subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = ['purchase_order', 'product', 'quantity_ordered', 'unit_cost', 'line_total']
    list_filter = ['purchase_order__supplier', 'product__category']
    search_fields = ['product__name', 'purchase_order__order_number']


@admin.register(DeliveryItem)
class DeliveryItemAdmin(admin.ModelAdmin):
    list_display = ['delivery', 'product', 'quantity_received', 'unit_cost', 'line_total']
    list_filter = ['delivery__purchase_order__supplier', 'product__category']
    search_fields = ['product__name', 'delivery__delivery_number']