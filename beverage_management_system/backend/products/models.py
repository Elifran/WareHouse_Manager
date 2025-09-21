from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_sellable = models.BooleanField(default=True, help_text="Whether products in this category can be sold at POS")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

class TaxClass(models.Model):
    name = models.CharField(max_length=50, unique=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.tax_rate}%)"

    class Meta:
        verbose_name_plural = "Tax Classes"
        ordering = ['name']

class Unit(models.Model):
    """Base unit model for product units"""
    name = models.CharField(max_length=50, unique=True)
    symbol = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    is_base_unit = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.symbol})"

    class Meta:
        ordering = ['name']

class UnitConversion(models.Model):
    """Conversion rates between units"""
    from_unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='conversions_from')
    to_unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='conversions_to')
    conversion_factor = models.DecimalField(max_digits=10, decimal_places=4, validators=[MinValueValidator(Decimal('0.0001'))])
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"1 {self.from_unit.symbol} = {self.conversion_factor} {self.to_unit.symbol}"

    class Meta:
        unique_together = ['from_unit', 'to_unit']
        ordering = ['from_unit__name', 'to_unit__name']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.from_unit == self.to_unit:
            raise ValidationError("From unit and to unit cannot be the same")

class ProductUnit(models.Model):
    """Model to link products with their compatible units"""
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='compatible_units')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    is_default = models.BooleanField(default=False, help_text="Default unit for this product")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} - {self.unit.name}"

    class Meta:
        unique_together = ['product', 'unit']
        ordering = ['product__name', 'unit__name']

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    tax_class = models.ForeignKey(TaxClass, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    sku = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Standard retail price")
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Wholesale price (optional)")
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    stock_quantity = models.PositiveIntegerField(default=0)
    min_stock_level = models.PositiveIntegerField(default=10)
    max_stock_level = models.PositiveIntegerField(default=1000)
    unit = models.CharField(max_length=20, default='piece')
    base_unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name='base_products', null=True, blank=True, help_text="The smallest unit for this product")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def profit_margin(self):
        if self.price and self.cost_price:
            return ((self.price - self.cost_price) / self.price) * 100 if self.price > 0 else Decimal('0.00')
        return Decimal('0.00')

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.min_stock_level

    @property
    def is_out_of_stock(self):
        return self.stock_quantity == 0

    class Meta:
        ordering = ['name']

    def get_stock_in_unit(self, unit):
        """Get stock quantity in a specific unit"""
        if unit == self.base_unit:
            return self.stock_quantity
        
        # Find conversion from base unit to requested unit
        try:
            conversion = UnitConversion.objects.get(
                from_unit=self.base_unit,
                to_unit=unit,
                is_active=True
            )
            return self.stock_quantity / conversion.conversion_factor
        except UnitConversion.DoesNotExist:
            # Try reverse conversion
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.base_unit,
                    is_active=True
                )
                return self.stock_quantity * conversion.conversion_factor
            except UnitConversion.DoesNotExist:
                return None

    def convert_quantity(self, quantity, from_unit, to_unit):
        """Convert quantity from one unit to another"""
        if from_unit == to_unit:
            return quantity
        
        # Direct conversion
        try:
            conversion = UnitConversion.objects.get(
                from_unit=from_unit,
                to_unit=to_unit,
                is_active=True
            )
            return quantity * conversion.conversion_factor
        except UnitConversion.DoesNotExist:
            # Try reverse conversion
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=to_unit,
                    to_unit=from_unit,
                    is_active=True
                )
                return quantity / conversion.conversion_factor
            except UnitConversion.DoesNotExist:
                return None

    def get_available_units(self):
        """Get all units available for this product"""
        units = [self.base_unit]
        
        # Add units that can be converted from base unit
        conversions_from = UnitConversion.objects.filter(
            from_unit=self.base_unit,
            is_active=True
        ).select_related('to_unit')
        
        for conversion in conversions_from:
            units.append(conversion.to_unit)
        
        # Add units that can be converted to base unit
        conversions_to = UnitConversion.objects.filter(
            to_unit=self.base_unit,
            is_active=True
        ).select_related('from_unit')
        
        for conversion in conversions_to:
            if conversion.from_unit not in units:
                units.append(conversion.from_unit)
        
        return units

class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Stock Adjustment'),
        ('cost_update', 'Cost Price Update'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.PositiveIntegerField()
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name='stock_movements', null=True, blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} - {self.movement_type} {self.quantity} {self.unit.symbol if self.unit else 'units'}"

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Update product stock quantity
        if self.movement_type == 'in':
            # Convert to base unit and add to stock
            if self.unit and self.product.base_unit:
                base_quantity = self.product.convert_quantity(
                    self.quantity, 
                    self.unit, 
                    self.product.base_unit
                )
                if base_quantity is not None:
                    self.product.stock_quantity += int(base_quantity)
                    self.product.save(update_fields=['stock_quantity'])
            else:
                # Fallback to direct addition if no unit conversion
                self.product.stock_quantity += self.quantity
                self.product.save(update_fields=['stock_quantity'])
        elif self.movement_type == 'out':
            # Convert to base unit and subtract from stock
            if self.unit and self.product.base_unit:
                base_quantity = self.product.convert_quantity(
                    self.quantity, 
                    self.unit, 
                    self.product.base_unit
                )
                if base_quantity is not None:
                    self.product.stock_quantity = max(0, self.product.stock_quantity - int(base_quantity))
                    self.product.save(update_fields=['stock_quantity'])
            else:
                # Fallback to direct subtraction if no unit conversion
                self.product.stock_quantity = max(0, self.product.stock_quantity - self.quantity)
                self.product.save(update_fields=['stock_quantity'])
        elif self.movement_type == 'cost_update':
            # Cost update movements don't change stock quantity, just track the cost change
            # The actual cost price update is handled in the delivery confirmation
            pass