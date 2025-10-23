from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class PackagingTransaction(models.Model):
    """Separate packaging management transactions"""
    TRANSACTION_TYPE_CHOICES = [
        ('consignation', 'Consignation (Paid)'),
        ('exchange', 'Exchange'),
        ('return', 'Return'),
        ('due', 'Due (To be returned)'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    ]
    
    transaction_number = models.CharField(max_length=50, unique=True)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES, default='consignation')
    sale = models.ForeignKey('sales.Sale', on_delete=models.CASCADE, related_name='packaging_transactions', help_text="Related sale")
    customer_name = models.CharField(max_length=200, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    
    # Payment information
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total packaging amount")
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Amount paid for packaging")
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Remaining amount to be paid")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
    ], default='cash')
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='active')
    
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='packaging_transactions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Packaging {self.transaction_number} - {self.total_amount} MGA"
    
    def calculate_totals(self):
        """Calculate and update packaging totals"""
        total_amount = Decimal('0')
        
        for item in self.items.all():
            total_amount += item.total_price
        
        self.total_amount = total_amount
        self.remaining_amount = self.total_amount - self.paid_amount
        
        # Update payment status
        if self.paid_amount >= self.total_amount:
            self.payment_status = 'paid'
        elif self.paid_amount > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'pending'
        
        self.save(update_fields=['total_amount', 'remaining_amount', 'payment_status'])
    
    class Meta:
        ordering = ['-created_at']


class PackagingItem(models.Model):
    """Individual packaging items in a transaction"""
    transaction = models.ForeignKey(PackagingTransaction, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, help_text="Product that has packaging")
    quantity = models.FloatField(validators=[MinValueValidator(0.001)], help_text="Quantity of packaging items")
    unit = models.ForeignKey('products.Unit', on_delete=models.PROTECT, null=True, blank=True, help_text="Unit used for this packaging item")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Packaging price per unit")
    total_price = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Total packaging price")
    notes = models.TextField(blank=True, help_text="Additional notes about this packaging item")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.product.name} packaging x {self.quantity} = {self.total_price} MGA"
    
    def save(self, *args, **kwargs):
        from decimal import Decimal, ROUND_HALF_UP
        # Calculate total price
        if self.unit_price:
            unit_price_decimal = Decimal(str(self.unit_price))
            quantity_decimal = Decimal(str(self.quantity))
            calculated_total = quantity_decimal * unit_price_decimal
            self.total_price = calculated_total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        super().save(*args, **kwargs)
    
    class Meta:
        unique_together = ['transaction', 'product', 'unit']
        ordering = ['created_at']


class PackagingPayment(models.Model):
    """Payments for packaging transactions"""
    transaction = models.ForeignKey(PackagingTransaction, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    payment_method = models.CharField(max_length=20, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
    ])
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Payment {self.amount} MGA - {self.payment_method}"
    
    class Meta:
        ordering = ['-created_at']

