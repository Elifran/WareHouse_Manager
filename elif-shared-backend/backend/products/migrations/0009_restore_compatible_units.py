# Generated migration to restore compatible units system

from django.db import migrations
from decimal import Decimal

def restore_compatible_units(apps, schema_editor):
    """
    Restore the compatible units system by adding back compatible units
    for products based on their unit conversions.
    """
    Product = apps.get_model('products', 'Product')
    ProductUnit = apps.get_model('products', 'ProductUnit')
    Unit = apps.get_model('products', 'Unit')
    UnitConversion = apps.get_model('products', 'UnitConversion')

    print("Restoring compatible units system...")

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
        
        # Clear existing compatible units
        ProductUnit.objects.filter(product=product).delete()
        
        # Add the base unit as compatible and default
        ProductUnit.objects.create(
            product=product,
            unit=base_unit,
            is_default=True,
            is_active=True
        )
        print(f"  Added base unit {base_unit.name} as default")
        
        # Find units that can convert to the base unit
        conversions_to_base = UnitConversion.objects.filter(
            to_unit=base_unit,
            is_active=True
        )
        
        for conversion in conversions_to_base:
            from_unit = conversion.from_unit
            if from_unit != base_unit:  # Don't add the base unit twice
                ProductUnit.objects.create(
                    product=product,
                    unit=from_unit,
                    is_default=False,
                    is_active=True
                )
                print(f"  Added compatible unit {from_unit.name}")
        
        # Also find units that the base unit can convert to (reverse conversions)
        conversions_from_base = UnitConversion.objects.filter(
            from_unit=base_unit,
            is_active=True
        )
        
        for conversion in conversions_from_base:
            to_unit = conversion.to_unit
            if to_unit != base_unit:  # Don't add the base unit twice
                ProductUnit.objects.create(
                    product=product,
                    unit=to_unit,
                    is_default=False,
                    is_active=True
                )
                print(f"  Added compatible unit {to_unit.name} (reverse)")

    print("Compatible units restoration completed!")

def reverse_restore_compatible_units(apps, schema_editor):
    """
    This migration cannot be easily reversed as we're restoring data.
    """
    print("Warning: This migration cannot be reversed as it restores compatible units data.")

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0008_cleanup_product_units'),
    ]

    operations = [
        migrations.RunPython(
            restore_compatible_units,
            reverse_restore_compatible_units
        ),
    ]
