from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from products.models import Product, TaxClass


class Supplier(models.Model):
    """Model for managing suppliers/fournisseurs"""
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    tax_number = models.CharField(max_length=50, blank=True)
    payment_terms = models.CharField(max_length=100, blank=True, help_text="e.g., Net 30, COD")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']


class PurchaseOrder(models.Model):
    """Model for purchase orders (commands from suppliers)"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent to Supplier'),
        ('confirmed', 'Confirmed by Supplier'),
        ('partially_delivered', 'Partially Delivered'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('archived', 'Archived'),
    ]
    
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    order_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    order_date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"PO-{self.order_number} - {self.supplier.name}"
    
    def calculate_totals(self):
        """Calculate subtotal, tax, and total amounts"""
        self.subtotal = sum(item.line_total for item in self.items.all())
        self.tax_amount = sum(item.tax_amount for item in self.items.all())
        self.total_amount = self.subtotal + self.tax_amount
        self.save()
    
    class Meta:
        ordering = ['-created_at']


class PurchaseOrderItem(models.Model):
    """Model for individual items in a purchase order"""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_ordered = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit = models.ForeignKey('products.Unit', on_delete=models.PROTECT, null=True, blank=True, help_text="Unit for this order item")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    tax_class = models.ForeignKey(TaxClass, on_delete=models.SET_NULL, null=True, blank=True)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_ordered} units"
    
    def save(self, *args, **kwargs):
        # Calculate line total and tax amount
        self.line_total = self.quantity_ordered * self.unit_cost
        if self.tax_class and self.tax_class.is_active:
            self.tax_amount = self.line_total * (self.tax_class.tax_rate / 100)
        else:
            self.tax_amount = Decimal('0.00')
        super().save(*args, **kwargs)
        # Update purchase order totals
        self.purchase_order.calculate_totals()
    
    class Meta:
        unique_together = ['purchase_order', 'product']


class Delivery(models.Model):
    """Model for deliveries (actual received goods)"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('received', 'Received'),
        ('verified', 'Verified'),
        ('completed', 'Completed'),
    ]
    
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='deliveries')
    delivery_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivery_date = models.DateTimeField(auto_now_add=True)
    received_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    received_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"DEL-{self.delivery_number} - {self.purchase_order.order_number}"
    
    def calculate_totals(self):
        """Calculate subtotal, tax, and total amounts"""
        self.subtotal = sum(item.line_total for item in self.items.all())
        self.tax_amount = sum(item.tax_amount for item in self.items.all())
        self.total_amount = self.subtotal + self.tax_amount
        self.save()
    
    def confirm_delivery(self, user):
        """Confirm delivery and update stock"""
        if self.status != 'completed':
            self.status = 'completed'
            self.received_date = timezone.now()
            self.received_by = user
            self.save()
            
            # Update stock for each delivered item
            for item in self.items.all():
                if item.quantity_received > 0:
                    # Create stock movement
                    from products.models import StockMovement
                    StockMovement.objects.create(
                        product=item.product,
                        movement_type='in',
                        quantity=item.quantity_received,
                        unit=item.unit or item.product.base_unit,
                        reference_number=f"DEL-{self.delivery_number}",
                        notes=f"Delivery from {self.purchase_order.supplier.name}",
                        created_by=user
                    )
    
    class Meta:
        ordering = ['-created_at']


class DeliveryItem(models.Model):
    """Model for individual items in a delivery"""
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='items')
    purchase_order_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_received = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    unit = models.ForeignKey('products.Unit', on_delete=models.PROTECT, null=True, blank=True, help_text="Unit for this delivery item")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    tax_class = models.ForeignKey(TaxClass, on_delete=models.SET_NULL, null=True, blank=True)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    condition_notes = models.TextField(blank=True, help_text="Notes about item condition")
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_received} received"
    
    def save(self, *args, **kwargs):
        # Calculate line total and tax amount
        self.line_total = self.quantity_received * self.unit_cost
        if self.tax_class and self.tax_class.is_active:
            self.tax_amount = self.line_total * (self.tax_class.tax_rate / 100)
        else:
            self.tax_amount = Decimal('0.00')
        super().save(*args, **kwargs)
        # Update delivery totals
        self.delivery.calculate_totals()
    
    class Meta:
        unique_together = ['delivery', 'purchase_order_item']