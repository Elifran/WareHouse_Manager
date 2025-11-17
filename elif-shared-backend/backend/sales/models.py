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
    
    SALE_TYPE_CHOICES = [
        ('sale', 'Sale'),
        ('return', 'Return'),
    ]
    
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    sale_number = models.CharField(max_length=50, unique=True)
    sale_type = models.CharField(max_length=10, choices=SALE_TYPE_CHOICES, default='sale', help_text="Type of transaction: sale or return")
    original_sale = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='returns', help_text="Original sale for returns")
    customer_name = models.CharField(max_length=200, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Cost excluding tax
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    packaging_total = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total packaging consignation amount")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Amount paid by customer")
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Remaining amount to be paid")
    payment_status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('partial', 'Partial'), ('paid', 'Paid')], default='pending', help_text="Payment status")
    due_date = models.DateField(null=True, blank=True, help_text="Due date for partial payments")
    notes = models.TextField(blank=True)
    sold_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='sales')
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='created_sales')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Sale {self.sale_number} - {self.total_amount}"
    
    def calculate_totals(self):
        """Calculate and update sale totals based on items and packaging"""
        subtotal = Decimal('0')
        cost_amount = Decimal('0')
        packaging_total = Decimal('0')
        
        for item in self.items.all():
            subtotal += item.total_price
            cost_amount += item.total_cost
        
        # Calculate packaging total
        for packaging in self.packaging_items.all():
            packaging_total += packaging.total_price
        
        self.subtotal = subtotal
        self.cost_amount = cost_amount
        self.packaging_total = packaging_total
        # Sales total should only include product amounts, not packaging
        self.total_amount = subtotal + self.tax_amount - self.discount_amount
        
        # Calculate remaining amount (only for product sales, not packaging)
        self.remaining_amount = self.total_amount - self.paid_amount
        
        # Update payment status based on product sales only
        if self.paid_amount >= self.total_amount:
            self.payment_status = 'paid'
            self.due_date = None  # No due date for fully paid sales
        elif self.paid_amount > 0:
            self.payment_status = 'partial'
            # Set due date to 30 days from now if not already set
            if not self.due_date:
                from datetime import date, timedelta
                self.due_date = date.today() + timedelta(days=30)
        else:
            self.payment_status = 'pending'
            self.due_date = None  # No due date for pending sales
        
        self.save(update_fields=['subtotal', 'cost_amount', 'packaging_total', 'total_amount', 'remaining_amount', 'payment_status', 'due_date'])
    
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
    total_price = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text="Total cost at time of sale (frozen for historical accuracy)")
    price_mode = models.CharField(max_length=20, choices=PRICE_MODE_CHOICES, default='standard', help_text="Price mode used for this sale item")
    original_sale_item = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='return_items', help_text="Original sale item for returns")
    
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
        from decimal import Decimal, ROUND_HALF_UP
        # Calculate total price and cost based on the display unit quantity
        # We need to use the display quantity, not the base quantity
        if self.unit_price:
            # Convert unit_price to Decimal to ensure consistent arithmetic
            unit_price_decimal = Decimal(str(self.unit_price))
            
            # Get the display quantity (quantity in the unit used for this sale item)
            if self.unit and self.unit != self.product.base_unit:
                # Convert from base unit to display unit
                display_quantity = self.get_quantity_in_unit(self.unit)
            else:
                # Already in base unit or no unit specified
                display_quantity = self.quantity
            
            quantity_decimal = Decimal(str(display_quantity))
            calculated_total = quantity_decimal * unit_price_decimal
            # Round to 2 decimal places to match the field constraints
            self.total_price = calculated_total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
        if self.unit_cost:
            # Convert unit_cost to Decimal to ensure consistent arithmetic
            unit_cost_decimal = Decimal(str(self.unit_cost))
            
            # Get the display quantity for cost calculation too
            if self.unit and self.unit != self.product.base_unit:
                display_quantity = self.get_quantity_in_unit(self.unit)
            else:
                display_quantity = self.quantity
                
            quantity_decimal = Decimal(str(display_quantity))
            calculated_cost = quantity_decimal * unit_cost_decimal
            # Round to 2 decimal places to match the field constraints
            self.total_cost = calculated_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
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

class SalePackaging(models.Model):
    """Packaging consignation items for sales - grouped by packaging type"""
    PACKAGING_STATUS_CHOICES = [
        ('exchange', 'Exchange'),
        ('consignation', 'Consignation (Paid)'),
        ('due', 'Due (To be returned)'),
    ]
    
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='packaging_items')
    packaging = models.ForeignKey('products.Packaging', on_delete=models.PROTECT, null=True, blank=True, help_text="Packaging type (e.g., bottle, can)")
    quantity = models.FloatField(validators=[MinValueValidator(0.001)], help_text="Total quantity of packaging items (aggregated from all products)")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Packaging price per unit (from packaging model)")
    total_price = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Total packaging price")
    status = models.CharField(max_length=20, choices=PACKAGING_STATUS_CHOICES, default='consignation', help_text="Packaging status")
    customer_name = models.CharField(max_length=200, blank=True, help_text="Customer name for due packaging tracking")
    customer_phone = models.CharField(max_length=20, blank=True, help_text="Customer phone for due packaging tracking")
    notes = models.TextField(blank=True, help_text="Additional notes about this packaging item")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Legacy fields for backward compatibility
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True, blank=True, help_text="Legacy field - kept for backward compatibility")
    unit = models.ForeignKey('products.Unit', on_delete=models.SET_NULL, null=True, blank=True, help_text="Legacy field - kept for backward compatibility")
    
    def __str__(self):
        packaging_name = self.packaging.name if self.packaging else (self.product.name if self.product else "Unknown")
        return f"{packaging_name} packaging x {self.quantity} = {self.total_price} ({self.status})"
    
    def save(self, *args, **kwargs):
        from decimal import Decimal, ROUND_HALF_UP
        # Get unit_price from packaging if not set
        if not self.unit_price and self.packaging:
            self.unit_price = self.packaging.price
        # Calculate total price
        if self.unit_price:
            unit_price_decimal = Decimal(str(self.unit_price))
            quantity_decimal = Decimal(str(self.quantity))
            calculated_total = quantity_decimal * unit_price_decimal
            self.total_price = calculated_total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        super().save(*args, **kwargs)
    
    class Meta:
        unique_together = ['sale', 'packaging']  # Changed: now unique by sale and packaging (not product)
        ordering = ['created_at']

class PackagingReturn(models.Model):
    """Track packaging returns and exchanges"""
    RETURN_TYPE_CHOICES = [
        ('return', 'Return for refund'),
        ('exchange', 'Exchange for new packaging'),
    ]
    
    sale_packaging = models.ForeignKey(SalePackaging, on_delete=models.CASCADE, related_name='returns')
    return_type = models.CharField(max_length=20, choices=RETURN_TYPE_CHOICES, default='return')
    quantity_returned = models.FloatField(validators=[MinValueValidator(0.001)], help_text="Quantity of packaging returned")
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Amount refunded for returned packaging")
    notes = models.TextField(blank=True)
    processed_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='packaging_returns')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Return {self.quantity_returned} {self.sale_packaging.product.name} packaging - {self.return_type}"
    
    class Meta:
        ordering = ['-created_at']