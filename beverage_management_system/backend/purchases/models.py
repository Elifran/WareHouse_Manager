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
    quantity_ordered = models.FloatField(validators=[MinValueValidator(0.001)], help_text="Quantity ordered in base unit")
    unit = models.ForeignKey('products.Unit', on_delete=models.PROTECT, null=True, blank=True, help_text="Unit for this order item (for display purposes)")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Cost per unit in the unit used")
    tax_class = models.ForeignKey(TaxClass, on_delete=models.SET_NULL, null=True, blank=True)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_ordered} units"
    
    def get_quantity_in_unit(self, unit=None):
        """Get quantity in a specific unit (defaults to the unit used in this order item)"""
        if unit is None:
            unit = self.unit or self.product.base_unit
        
        if unit == self.product.base_unit:
            return self.quantity_ordered
        
        # Convert from base unit to the requested unit
        from products.models import UnitConversion
        try:
            conversion = UnitConversion.objects.get(
                from_unit=self.product.base_unit,
                to_unit=unit,
                is_active=True
            )
            # For quantities: base * factor = display (e.g., 10.75 pieces * 1 = 10.75 pieces, but 10.75 pieces * 12 = 129 pieces for 12-pack)
            # Wait, this is wrong. If 1 12-pack = 12 pieces, then to convert from pieces to 12-packs, we divide by 12
            # So: base / factor = display (e.g., 10.75 pieces / 12 = 0.896 12-packs)
            return self.quantity_ordered / float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.product.base_unit,
                    is_active=True
                )
                # If 1 12-pack = 12 pieces, then to convert from pieces to 12-packs, we divide by 12
                # So: base / factor = display
                return self.quantity_ordered / float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return self.quantity_ordered
    
    def save(self, *args, **kwargs):
        # Calculate line total and tax amount based on the display unit quantity
        display_quantity = self.get_quantity_in_unit(self.unit or self.product.base_unit)
        self.line_total = Decimal(str(display_quantity)) * Decimal(str(self.unit_cost))
        if self.tax_class and self.tax_class.is_active:
            self.tax_amount = self.line_total * (self.tax_class.tax_rate / 100)
        else:
            self.tax_amount = Decimal('0.00')
        super().save(*args, **kwargs)
        # Update purchase order totals
        self.purchase_order.calculate_totals()
    
    class Meta:
        unique_together = ['purchase_order', 'product', 'unit']


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
            
            # Update stock and cost price for each delivered item
            for item in self.items.all():
                if item.quantity_received > 0:
                    # Create stock movement
                    from products.models import StockMovement
                    StockMovement.objects.create(
                        product=item.product,
                        movement_type='in',
                        quantity=item.quantity_received,  # Already in base unit
                        unit=item.product.base_unit,  # Use base unit since quantity is in base unit
                        reference_number=f"DEL-{self.delivery_number}",
                        notes=f"Delivery from {self.purchase_order.supplier.name}",
                        created_by=user
                    )
                    
                    # Update product cost price based on the unit used
                    self._update_product_cost_price(item, user)
    
    def _update_product_cost_price(self, delivery_item, user):
        """Update product cost price based on the unit used in delivery"""
        from products.utils import get_unit_conversion_factor
        from decimal import Decimal
        
        product = delivery_item.product
        delivery_unit = delivery_item.unit or product.base_unit
        unit_cost = delivery_item.unit_cost
        
        # If the delivery unit is the same as the product's base unit, use the cost directly
        if delivery_unit.id == product.base_unit.id:
            new_cost_price = unit_cost
        else:
            # Convert the unit cost to base unit cost
            # Get conversion factor from delivery unit to base unit
            conversion_factor = get_unit_conversion_factor(delivery_unit.id, product.base_unit.id)
            
            if conversion_factor:
                # If 1 delivery unit = X base units, then cost per base unit = unit_cost / X
                new_cost_price = unit_cost / conversion_factor
            else:
                # If no conversion factor found, use the unit cost as is
                new_cost_price = unit_cost
        
        # Update the product's cost price
        product.cost_price = new_cost_price
        product.save()
        
        # Create a stock movement to track the cost price update
        from products.models import StockMovement
        StockMovement.objects.create(
            product=product,
            movement_type='cost_update',
            quantity=0,  # No quantity change, just cost update
            unit=product.base_unit,
            reference_number=f"DEL-{self.delivery_number}",
            notes=f"Cost price updated to {new_cost_price} MGA per {product.base_unit.name} (from {unit_cost} MGA per {delivery_unit.name})",
            created_by=user
        )
    
    class Meta:
        ordering = ['-created_at']


class DeliveryItem(models.Model):
    """Model for individual items in a delivery"""
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='items')
    purchase_order_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_received = models.FloatField(default=0, validators=[MinValueValidator(0)], help_text="Quantity received in base unit")
    unit = models.ForeignKey('products.Unit', on_delete=models.PROTECT, null=True, blank=True, help_text="Unit for this delivery item (for display purposes)")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], help_text="Cost per unit in the unit used")
    tax_class = models.ForeignKey(TaxClass, on_delete=models.SET_NULL, null=True, blank=True)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    condition_notes = models.TextField(blank=True, help_text="Notes about item condition")
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_received} received"
    
    def get_quantity_in_unit(self, unit=None):
        """Get quantity in a specific unit (defaults to the unit used in this delivery item)"""
        if unit is None:
            unit = self.unit or self.product.base_unit
        
        if unit == self.product.base_unit:
            return self.quantity_received
        
        # Convert from base unit to the requested unit
        from products.models import UnitConversion
        try:
            conversion = UnitConversion.objects.get(
                from_unit=self.product.base_unit,
                to_unit=unit,
                is_active=True
            )
            # For quantities: base / factor = display (e.g., 10.75 pieces / 12 = 0.896 12-packs)
            return self.quantity_received / float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=unit,
                    to_unit=self.product.base_unit,
                    is_active=True
                )
                # For quantities: base / factor = display
                return self.quantity_received / float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return self.quantity_received
    
    def save(self, *args, **kwargs):
        # Calculate line total and tax amount based on the display unit quantity
        display_quantity = self.get_quantity_in_unit(self.unit or self.product.base_unit)
        self.line_total = Decimal(str(display_quantity)) * Decimal(str(self.unit_cost))
        if self.tax_class and self.tax_class.is_active:
            self.tax_amount = self.line_total * (self.tax_class.tax_rate / 100)
        else:
            self.tax_amount = Decimal('0.00')
        super().save(*args, **kwargs)
        # Update delivery totals
        self.delivery.calculate_totals()
    
    class Meta:
        unique_together = ['delivery', 'purchase_order_item']