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
    
    # New pricing fields for unit-specific prices
    standard_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Standard price for this specific unit")
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Wholesale price for this specific unit")
    
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
    
    # Legacy pricing fields (kept for backward compatibility)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Standard retail price (legacy - use standard_price_1 instead)")
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Wholesale price (optional)")
    
    # New standard pricing structure - multiple price fields
    standard_price_1 = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], default=Decimal('0.01'), help_text="Standard price 1 (required)")
    standard_price_2 = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Standard price 2 (optional)")
    standard_price_3 = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Standard price 3 (optional)")
    standard_price_4 = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Standard price 4 (optional)")
    standard_price_5 = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], null=True, blank=True, help_text="Standard price 5 (optional)")
    
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    stock_quantity = models.FloatField(default=0.0, validators=[MinValueValidator(0.0)])
    min_stock_level = models.FloatField(default=10.0, validators=[MinValueValidator(0.0)])
    max_stock_level = models.FloatField(default=1000.0, validators=[MinValueValidator(0.0)])
    unit = models.CharField(max_length=20, default='piece')
    base_unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name='base_products', null=True, blank=True, help_text="The smallest unit for this product")
    
    # Packaging consignation fields
    has_packaging = models.BooleanField(default=False, help_text="Whether this product has packaging consignation")
    packaging_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], null=True, blank=True, help_text="Packaging consignation price (e.g., bottle deposit)")
    
    # Storage location fields
    storage_section = models.CharField(max_length=10, blank=True, help_text="Storage section code (e.g., A12, G11, K10, C33)")
    storage_type = models.CharField(max_length=3, choices=[('SSO', 'Back Storage'), ('STR', 'Front Storage')], default='STR', help_text="Storage type: SSO for back storage, STR for front storage")
    
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
            return self.stock_quantity / float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            # Try reverse conversion
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.base_unit,
                    is_active=True
                )
                return self.stock_quantity / float(conversion.conversion_factor)
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
            return quantity * float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            # Try reverse conversion
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=to_unit,
                    to_unit=from_unit,
                    is_active=True
                )
                return quantity / float(conversion.conversion_factor)
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

    def get_price_in_unit(self, unit):
        """Get price in a specific unit (converted from base unit)"""
        if unit == self.base_unit:
            return self.price
        
        # Find conversion from base unit to requested unit
        try:
            conversion = UnitConversion.objects.get(
                from_unit=self.base_unit,
                to_unit=unit,
                is_active=True
            )
            return float(self.price) * float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            # Try reverse conversion (this is the common case)
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.base_unit,
                    is_active=True
                )
                # If 1 pack = 24 pieces, then to convert from pieces to packs, multiply by 24
                # Price per piece * pieces per pack = price per pack
                return float(self.price) * float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return None

    def get_wholesale_price_in_unit(self, unit):
        """Get wholesale price in a specific unit (converted from base unit)"""
        if not self.wholesale_price:
            return None
            
        if unit == self.base_unit:
            return self.wholesale_price
        
        # Find conversion from base unit to requested unit
        try:
            conversion = UnitConversion.objects.get(
                from_unit=self.base_unit,
                to_unit=unit,
                is_active=True
            )
            return float(self.wholesale_price) * float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            # Try reverse conversion
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.base_unit,
                    is_active=True
                )
                return float(self.wholesale_price) * float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return None

    def get_cost_price_in_unit(self, unit):
        """Get cost price in a specific unit (converted from base unit)"""
        if unit == self.base_unit:
            return self.cost_price
        
        # Find conversion from base unit to requested unit
        try:
            conversion = UnitConversion.objects.get(
                from_unit=self.base_unit,
                to_unit=unit,
                is_active=True
            )
            return float(self.cost_price) * float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            # Try reverse conversion
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.base_unit,
                    is_active=True
                )
                return float(self.cost_price) * float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return None

    def get_default_unit(self):
        """Get the default unit for this product"""
        try:
            default_product_unit = self.compatible_units.filter(is_default=True).first()
            return default_product_unit.unit if default_product_unit else self.base_unit
        except:
            return self.base_unit

    def get_display_quantity(self, display_unit=None):
        """Get stock quantity in display unit (default unit if not specified)"""
        if display_unit is None:
            display_unit = self.get_default_unit()
        
        return self.get_stock_in_unit(display_unit)

    def get_display_price(self, display_unit=None):
        """Get price in display unit (default unit if not specified)"""
        if display_unit is None:
            display_unit = self.get_default_unit()
        
        return self.get_price_in_unit(display_unit)

    def get_display_wholesale_price(self, display_unit=None):
        """Get wholesale price in display unit (default unit if not specified)"""
        if display_unit is None:
            display_unit = self.get_default_unit()
        
        return self.get_wholesale_price_in_unit(display_unit)

    def get_display_cost_price(self, display_unit=None):
        """Get cost price in display unit (default unit if not specified)"""
        if display_unit is None:
            display_unit = self.get_default_unit()
        
        return self.get_cost_price_in_unit(display_unit)

    def get_standard_prices_list(self):
        """Get list of all non-empty standard prices"""
        prices = []
        if self.standard_price_1:
            prices.append(float(self.standard_price_1))
        if self.standard_price_2:
            prices.append(float(self.standard_price_2))
        if self.standard_price_3:
            prices.append(float(self.standard_price_3))
        if self.standard_price_4:
            prices.append(float(self.standard_price_4))
        if self.standard_price_5:
            prices.append(float(self.standard_price_5))
        return prices

    def get_unit_specific_price(self, unit, price_type='standard'):
        """Get unit-specific price for a given unit and price type"""
        try:
            product_unit = self.compatible_units.get(unit=unit, is_active=True)
            if price_type == 'standard' and product_unit.standard_price:
                return float(product_unit.standard_price)
            elif price_type == 'wholesale' and product_unit.wholesale_price:
                return float(product_unit.wholesale_price)
        except ProductUnit.DoesNotExist:
            pass
        
        # Fallback to calculated price if no unit-specific price
        if price_type == 'standard':
            return self.get_price_in_unit(unit)
        else:
            return self.get_wholesale_price_in_unit(unit)

    def get_available_standard_prices(self):
        """Get all available standard prices for this product"""
        return self.get_standard_prices_list()

    def get_available_wholesale_prices(self):
        """Get all available wholesale prices for this product (including unit-specific)"""
        wholesale_prices = []
        
        # Add main wholesale price if exists
        if self.wholesale_price and self.base_unit:
            wholesale_prices.append({
                'unit': {
                    'id': self.base_unit.id,
                    'name': self.base_unit.name,
                    'symbol': self.base_unit.symbol
                },
                'price': float(self.wholesale_price),
                'is_unit_specific': False
            })
        
        # Add unit-specific wholesale prices
        for product_unit in self.compatible_units.filter(is_active=True):
            if product_unit.wholesale_price:
                wholesale_prices.append({
                    'unit': {
                        'id': product_unit.unit.id,
                        'name': product_unit.unit.name,
                        'symbol': product_unit.unit.symbol
                    },
                    'price': float(product_unit.wholesale_price),
                    'is_unit_specific': True
                })
        
        return wholesale_prices

class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('return', 'Stock Return'),
        ('adjustment', 'Stock Adjustment'),
        ('cost_update', 'Cost Price Update'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.FloatField(validators=[MinValueValidator(0.0)], help_text="Quantity in base unit")
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name='stock_movements', null=True, blank=True, help_text="Unit used for this movement (for display purposes)")
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} - {self.movement_type} {self.quantity} {self.unit.symbol if self.unit else 'units'}"
    
    def get_quantity_in_unit(self, unit=None):
        """Get quantity in a specific unit (defaults to the unit used in this movement)"""
        if unit is None:
            unit = self.unit or self.product.base_unit
        
        if unit == self.product.base_unit:
            return self.quantity
        
        # Convert from base unit to the requested unit
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
        elif self.movement_type == 'return':
            # Return movements add stock back (same as 'in' movements)
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
        elif self.movement_type == 'cost_update':
            # Cost update movements don't change stock quantity, just track the cost change
            # The actual cost price update is handled in the delivery confirmation
            pass