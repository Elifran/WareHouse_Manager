# Generated migration to cleanup product units
from django.db import migrations

def cleanup_product_units(apps, schema_editor):
    """
    Clean up product units by:
    1. Removing duplicate ProductUnit entries
    2. Ensuring each product has its base unit in compatible units
    3. Setting correct default units
    """
    Product = apps.get_model('products', 'Product')
    ProductUnit = apps.get_model('products', 'ProductUnit')
    Unit = apps.get_model('products', 'Unit')
    
    print("Cleaning up product units...")
    
    # Get all products
    products = Product.objects.all()
    total_products = products.count()
    print(f"Processing {total_products} products...")
    
    for product in products:
        print(f"Processing product: {product.name}")
        
        # Get all ProductUnit entries for this product
        product_units = ProductUnit.objects.filter(product=product)
        
        # Group by unit to find duplicates
        unit_groups = {}
        for pu in product_units:
            unit_id = pu.unit.id if pu.unit else None
            if unit_id not in unit_groups:
                unit_groups[unit_id] = []
            unit_groups[unit_id].append(pu)
        
        # Remove duplicates, keeping the one with is_default=True, or the first one
        for unit_id, entries in unit_groups.items():
            if len(entries) > 1:
                print(f"  Found {len(entries)} duplicates for unit ID {unit_id}")
                
                # Sort by is_default (True first), then by id
                entries.sort(key=lambda x: (not x.is_default, x.id))
                
                # Keep the first one, delete the rest
                keep_entry = entries[0]
                delete_entries = entries[1:]
                
                for entry in delete_entries:
                    print(f"    Deleting duplicate ProductUnit ID {entry.id}")
                    entry.delete()
                
                # Ensure the kept entry is marked as default if it was default in any of the duplicates
                if any(entry.is_default for entry in entries):
                    keep_entry.is_default = True
                    keep_entry.save()
                    print(f"    Kept ProductUnit ID {keep_entry.id} as default")
        
        # Ensure the product's base unit is in compatible units
        base_unit = product.base_unit
        if base_unit:
            # Check if base unit is already in compatible units
            base_unit_exists = ProductUnit.objects.filter(
                product=product,
                unit=base_unit
            ).exists()
            
            if not base_unit_exists:
                print(f"  Adding missing base unit {base_unit.name} to compatible units")
                # Add base unit to compatible units
                ProductUnit.objects.create(
                    product=product,
                    unit=base_unit,
                    is_default=True
                )
            else:
                # Ensure base unit is set as default
                base_unit_pu = ProductUnit.objects.filter(
                    product=product,
                    unit=base_unit
                ).first()
                
                if base_unit_pu and not base_unit_pu.is_default:
                    # Set this as default and unset others
                    ProductUnit.objects.filter(product=product).update(is_default=False)
                    base_unit_pu.is_default = True
                    base_unit_pu.save()
                    print(f"  Set base unit {base_unit.name} as default")
    
    print("Product units cleanup completed!")

def reverse_cleanup_product_units(apps, schema_editor):
    """
    Reverse the cleanup (for rollback).
    This is not easily reversible, so we'll just log it.
    """
    print("Cleanup cannot be easily reversed - manual intervention required")

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_fix_unit_conversions'),
    ]

    operations = [
        migrations.RunPython(cleanup_product_units, reverse_cleanup_product_units),
    ]
