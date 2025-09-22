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
    quantity = models.FloatField(validators=[MinValueValidator(0.001)], help_text="Quantity in base unit")
    unit = models.ForeignKey('products.Unit', on_delete=models.PROTECT, null=True, blank=True, help_text="Unit used for this sale item (for display purposes)")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Price per unit in the unit used")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost per unit in the unit used (frozen for historical accuracy)")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total cost at time of sale (frozen for historical accuracy)")
    price_mode = models.CharField(max_length=20, choices=PRICE_MODE_CHOICES, default='standard', help_text="Price mode used for this sale item")
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity} = {self.total_price}"
    
    def get_quantity_in_unit(self, unit=None):
        """Get quantity in a specific unit (defaults to the unit used in this sale item)"""
        if unit is None:
            unit = self.unit or self.product.base_unit
        
        if unit == self.product.base_unit:
            return self.quantity
        
        # Convert from base unit to the requested unit
        from products.models import UnitConversion
        try:
            conversion = UnitConversion.objects.get(
                from_unit=self.product.base_unit,
                to_unit=unit,
                is_active=True
            )
            # For quantities: base / factor = display (e.g., 10.75 pieces / 12 = 0.896 12-packs)
            return self.quantity / float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.product.base_unit,
                    is_active=True
                )
                # For quantities: base / factor = display
                return self.quantity / float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return self.quantity
    
    def save(self, *args, **kwargs):
        from decimal import Decimal
        # Calculate total price and cost based on the display unit quantity
        display_quantity = self.get_quantity_in_unit(self.unit or self.product.base_unit)
        self.total_price = Decimal(str(display_quantity)) * self.unit_price
        self.total_cost = Decimal(str(display_quantity)) * self.unit_cost
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