# Generated manually for converting existing data to base units

from django.db import migrations
from django.db.models import Q


def convert_to_base_units(apps, schema_editor):
    """
    Convert existing data from display units to base units.
    This migration assumes that existing data is stored in display units
    and needs to be converted to base units for consistency.
    """
    SaleItem = apps.get_model('sales', 'SaleItem')
    PurchaseOrderItem = apps.get_model('purchases', 'PurchaseOrderItem')
    DeliveryItem = apps.get_model('purchases', 'DeliveryItem')
    StockMovement = apps.get_model('products', 'StockMovement')
    UnitConversion = apps.get_model('products', 'UnitConversion')
    
    def get_conversion_factor(from_unit, to_unit):
        """Get conversion factor from one unit to another"""
        if from_unit == to_unit:
            return 1.0
        
        try:
            conversion = UnitConversion.objects.get(
                from_unit=from_unit,
                to_unit=to_unit,
                is_active=True
            )
            return float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=to_unit,
                    to_unit=from_unit,
                    is_active=True
                )
                return 1.0 / float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return 1.0
    
    print("Converting SaleItem quantities to base units...")
    sale_items_converted = 0
    for item in SaleItem.objects.all():
        if item.unit and item.unit != item.product.base_unit:
            # Convert from display unit to base unit
            conversion_factor = get_conversion_factor(item.unit, item.product.base_unit)
            if conversion_factor != 1.0:
                # For stock quantities, we divide (if 1 pack = 24 pieces, then 2 packs = 48 pieces)
                item.quantity = item.quantity / conversion_factor
                item.save(update_fields=['quantity'])
                sale_items_converted += 1
    
    print(f"Converted {sale_items_converted} SaleItem records")
    
    print("Converting PurchaseOrderItem quantities to base units...")
    po_items_converted = 0
    for item in PurchaseOrderItem.objects.all():
        if item.unit and item.unit != item.product.base_unit:
            # Convert from display unit to base unit
            conversion_factor = get_conversion_factor(item.unit, item.product.base_unit)
            if conversion_factor != 1.0:
                # For stock quantities, we divide
                item.quantity_ordered = item.quantity_ordered / conversion_factor
                item.save(update_fields=['quantity_ordered'])
                po_items_converted += 1
    
    print(f"Converted {po_items_converted} PurchaseOrderItem records")
    
    print("Converting DeliveryItem quantities to base units...")
    delivery_items_converted = 0
    for item in DeliveryItem.objects.all():
        if item.unit and item.unit != item.product.base_unit:
            # Convert from display unit to base unit
            conversion_factor = get_conversion_factor(item.unit, item.product.base_unit)
            if conversion_factor != 1.0:
                # For stock quantities, we divide
                item.quantity_received = item.quantity_received / conversion_factor
                item.save(update_fields=['quantity_received'])
                delivery_items_converted += 1
    
    print(f"Converted {delivery_items_converted} DeliveryItem records")
    
    print("Converting StockMovement quantities to base units...")
    stock_movements_converted = 0
    for movement in StockMovement.objects.all():
        if movement.unit and movement.unit != movement.product.base_unit:
            # Convert from display unit to base unit
            conversion_factor = get_conversion_factor(movement.unit, movement.product.base_unit)
            if conversion_factor != 1.0:
                # For stock quantities, we divide
                movement.quantity = movement.quantity / conversion_factor
                movement.save(update_fields=['quantity'])
                stock_movements_converted += 1
    
    print(f"Converted {stock_movements_converted} StockMovement records")
    
    print("Data conversion to base units completed!")


def reverse_conversion(apps, schema_editor):
    """
    Reverse the conversion - convert from base units back to display units.
    This is for rolling back the migration if needed.
    """
    SaleItem = apps.get_model('sales', 'SaleItem')
    PurchaseOrderItem = apps.get_model('purchases', 'PurchaseOrderItem')
    DeliveryItem = apps.get_model('purchases', 'DeliveryItem')
    StockMovement = apps.get_model('products', 'StockMovement')
    UnitConversion = apps.get_model('products', 'UnitConversion')
    
    def get_conversion_factor(from_unit, to_unit):
        """Get conversion factor from one unit to another"""
        if from_unit == to_unit:
            return 1.0
        
        try:
            conversion = UnitConversion.objects.get(
                from_unit=from_unit,
                to_unit=to_unit,
                is_active=True
            )
            return float(conversion.conversion_factor)
        except UnitConversion.DoesNotExist:
            try:
                conversion = UnitConversion.objects.get(
                    from_unit=to_unit,
                    to_unit=from_unit,
                    is_active=True
                )
                return 1.0 / float(conversion.conversion_factor)
            except UnitConversion.DoesNotExist:
                return 1.0
    
    print("Reversing SaleItem quantities to display units...")
    for item in SaleItem.objects.all():
        if item.unit and item.unit != item.product.base_unit:
            # Convert from base unit to display unit
            conversion_factor = get_conversion_factor(item.product.base_unit, item.unit)
            if conversion_factor != 1.0:
                item.quantity = item.quantity * conversion_factor
                item.save(update_fields=['quantity'])
    
    print("Reversing PurchaseOrderItem quantities to display units...")
    for item in PurchaseOrderItem.objects.all():
        if item.unit and item.unit != item.product.base_unit:
            # Convert from base unit to display unit
            conversion_factor = get_conversion_factor(item.product.base_unit, item.unit)
            if conversion_factor != 1.0:
                item.quantity_ordered = item.quantity_ordered * conversion_factor
                item.save(update_fields=['quantity_ordered'])
    
    print("Reversing DeliveryItem quantities to display units...")
    for item in DeliveryItem.objects.all():
        if item.unit and item.unit != item.product.base_unit:
            # Convert from base unit to display unit
            conversion_factor = get_conversion_factor(item.product.base_unit, item.unit)
            if conversion_factor != 1.0:
                item.quantity_received = item.quantity_received * conversion_factor
                item.save(update_fields=['quantity_received'])
    
    print("Reversing StockMovement quantities to display units...")
    for movement in StockMovement.objects.all():
        if movement.unit and movement.unit != movement.product.base_unit:
            # Convert from base unit to display unit
            conversion_factor = get_conversion_factor(movement.product.base_unit, movement.unit)
            if conversion_factor != 1.0:
                movement.quantity = movement.quantity * conversion_factor
                movement.save(update_fields=['quantity'])
    
    print("Data conversion reversal completed!")


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0018_auto_20250921_2258'),
        ('sales', '0016_auto_20250921_2258'),
        ('purchases', '0008_auto_20250921_2258'),
    ]

    operations = [
        migrations.RunPython(convert_to_base_units, reverse_conversion),
    ]
