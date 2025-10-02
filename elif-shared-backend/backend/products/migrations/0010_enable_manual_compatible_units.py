# Generated migration to enable manual compatible units selection

from django.db import migrations
from decimal import Decimal

def enable_manual_compatible_units(apps, schema_editor):
    """
    Clear all compatible units except base units to enable manual selection.
    Keep only the base unit for each product as the default compatible unit.
    """
    Product = apps.get_model('products', 'Product')
    ProductUnit = apps.get_model('products', 'ProductUnit')
    Unit = apps.get_model('products', 'Unit')

    print("Enabling manual compatible units selection...")

    products = Product.objects.all()
    print(f"Processing {products.count()} products...")

    for product in products:
        print(f"Processing product: {product.name}")
        
        # Get the product's base unit
        if not product.base_unit:
            print(f"  WARNING: Product {product.name} has no base unit!")
            continue
            
        base_unit = product.base_unit
        print(f"  Base unit: {base_unit.name}")
        
        # Clear ALL existing compatible units
        existing_units = ProductUnit.objects.filter(product=product)
        deleted_count = existing_units.count()
        existing_units.delete()
        print(f"  Deleted {deleted_count} existing compatible units")
        
        # Add ONLY the base unit as compatible and default (non-removable)
        ProductUnit.objects.create(
            product=product,
            unit=base_unit,
            is_default=True,
            is_active=True
        )
        print(f"  Added base unit {base_unit.name} as default (non-removable)")

    print("Manual compatible units selection enabled!")

def reverse_enable_manual_compatible_units(apps, schema_editor):
    """
    This migration cannot be easily reversed as we're clearing data.
    """
    print("Warning: This migration cannot be reversed as it clears compatible units data.")

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_restore_compatible_units'),
    ]

    operations = [
        migrations.RunPython(
            enable_manual_compatible_units,
            reverse_enable_manual_compatible_units
        ),
    ]
