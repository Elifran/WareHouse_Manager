from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

class Sale(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    sale_number = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=200, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Cost excluding tax
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    sold_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='sales')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Sale {self.sale_number} - {self.total_amount}"
    
    class Meta:
        ordering = ['-created_at']

class SaleItem(models.Model):
    PRICE_MODE_CHOICES = [
        ('standard', 'Standard'),
        ('wholesale', 'Wholesale'),
    ]
    
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit = models.ForeignKey('products.Unit', on_delete=models.PROTECT, null=True, blank=True, help_text="Unit used for this sale item")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost per unit at time of sale (frozen for historical accuracy)")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total cost at time of sale (frozen for historical accuracy)")
    price_mode = models.CharField(max_length=20, choices=PRICE_MODE_CHOICES, default='standard', help_text="Price mode used for this sale item")
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity} = {self.total_price}"
    
    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        self.total_cost = self.quantity * self.unit_cost
        super().save(*args, **kwargs)
    
    class Meta:
        unique_together = ['sale', 'product', 'unit', 'price_mode']

class Payment(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    payment_method = models.CharField(max_length=20, choices=Sale.PAYMENT_METHODS)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Payment {self.amount} - {self.payment_method}"