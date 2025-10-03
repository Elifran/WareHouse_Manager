# Generated migration to rewrite unit conversions
from django.db import migrations
from decimal import Decimal

def rewrite_unit_conversions(apps, schema_editor):
    """
    Rewrite all unit conversions so that base units are ALWAYS the destination (to_unit).
    
    Example:
    - Before: 1L → 10dL (L to dL)
    - After:  10dL → 1L (dL to L, where L is base)
    """
    Unit = apps.get_model('products', 'Unit')
    UnitConversion = apps.get_model('products', 'UnitConversion')
    
    print("Starting unit conversion rewrite...")
    
    # Get all base units
    base_units = Unit.objects.filter(is_base_unit=True)
    print(f"Found {base_units.count()} base units")
    
    # Get all existing conversions
    existing_conversions = UnitConversion.objects.all()
    print(f"Found {existing_conversions.count()} existing conversions")
    
    # Delete all existing conversions
    existing_conversions.delete()
    print("Deleted all existing conversions")
    
    # Create new conversions where base units are always the destination
    conversions_to_create = []
    
    # For each base unit, create conversions from all other units
    for base_unit in base_units:
        print(f"Processing base unit: {base_unit.name} ({base_unit.symbol})")
        
        # Get all non-base units that should convert to this base unit
        other_units = Unit.objects.filter(is_base_unit=False, is_active=True)
        
        for other_unit in other_units:
            # Determine conversion factor based on unit names/symbols
            conversion_factor = None
            
            # Volume conversions (L as base)
            if base_unit.symbol.lower() == 'l' or base_unit.symbol.lower() == 'liter':
                if 'dl' in other_unit.symbol.lower() or 'deciliter' in other_unit.name.lower():
                    conversion_factor = Decimal('10')  # 10dL = 1L
                elif 'ml' in other_unit.symbol.lower() or 'milliliter' in other_unit.name.lower():
                    conversion_factor = Decimal('1000')  # 1000mL = 1L
                elif 'cl' in other_unit.symbol.lower() or 'centiliter' in other_unit.name.lower():
                    conversion_factor = Decimal('100')  # 100cL = 1L
                elif 'liter' in other_unit.name.lower() and other_unit.symbol.lower() != 'l':
                    # Handle cases like "1L Bottle" -> 1L
                    if '1l' in other_unit.name.lower():
                        conversion_factor = Decimal('1')
                    elif '5l' in other_unit.name.lower():
                        conversion_factor = Decimal('5')
                    elif '10l' in other_unit.name.lower():
                        conversion_factor = Decimal('10')
                    elif '20l' in other_unit.name.lower():
                        conversion_factor = Decimal('20')
            
            # Weight conversions (kg as base)
            elif base_unit.symbol.lower() == 'kg' or base_unit.symbol.lower() == 'kilogram':
                if 'g' in other_unit.symbol.lower() and 'kg' not in other_unit.symbol.lower():
                    if other_unit.symbol.lower() == 'g':
                        conversion_factor = Decimal('1000')  # 1000g = 1kg
                    elif '50kg' in other_unit.name.lower():
                        conversion_factor = Decimal('50')  # 50kg bag = 50kg
                    elif '25kg' in other_unit.name.lower():
                        conversion_factor = Decimal('25')  # 25kg bag = 25kg
                    elif '70kg' in other_unit.name.lower():
                        conversion_factor = Decimal('70')  # 70kg bag = 70kg
                elif 'bag' in other_unit.name.lower():
                    if '50kg' in other_unit.name.lower():
                        conversion_factor = Decimal('50')
                    elif '25kg' in other_unit.name.lower():
                        conversion_factor = Decimal('25')
                    elif '70kg' in other_unit.name.lower():
                        conversion_factor = Decimal('70')
            
            # Count conversions (pieces as base)
            elif base_unit.symbol.lower() in ['pc', 'piece', 'pieces']:
                if 'pack' in other_unit.name.lower() or 'pack' in other_unit.symbol.lower():
                    # Extract number from pack name (e.g., "12-Pack" -> 12)
                    import re
                    numbers = re.findall(r'\d+', other_unit.name)
                    if numbers:
                        conversion_factor = Decimal(numbers[0])
                    else:
                        numbers = re.findall(r'\d+', other_unit.symbol)
                        if numbers:
                            conversion_factor = Decimal(numbers[0])
                elif 'carton' in other_unit.name.lower():
                    # Extract number from carton name
                    import re
                    numbers = re.findall(r'\d+', other_unit.name)
                    if numbers:
                        conversion_factor = Decimal(numbers[0])
                elif 'box' in other_unit.name.lower():
                    # Extract number from box name
                    import re
                    numbers = re.findall(r'\d+', other_unit.name)
                    if numbers:
                        conversion_factor = Decimal(numbers[0])
                elif 'bottle' in other_unit.name.lower():
                    # Extract number from bottle name
                    import re
                    numbers = re.findall(r'\d+', other_unit.name)
                    if numbers:
                        conversion_factor = Decimal(numbers[0])
            
            # Create conversion if we found a factor
            if conversion_factor:
                conversion = UnitConversion(
                    from_unit=other_unit,
                    to_unit=base_unit,
                    conversion_factor=conversion_factor,
                    description=f"{conversion_factor} {other_unit.symbol} = 1 {base_unit.symbol}",
                    is_active=True
                )
                conversions_to_create.append(conversion)
                print(f"  Created: {conversion_factor} {other_unit.symbol} → 1 {base_unit.symbol}")
    
    # Bulk create all conversions
    if conversions_to_create:
        UnitConversion.objects.bulk_create(conversions_to_create)
        print(f"Created {len(conversions_to_create)} new conversions")
    else:
        print("No conversions were created")

def reverse_rewrite_unit_conversions(apps, schema_editor):
    """
    Reverse the unit conversion rewrite (for rollback).
    This would need to be implemented if rollback is needed.
    """
    # For now, just clear conversions
    UnitConversion = apps.get_model('products', 'UnitConversion')
    UnitConversion.objects.all().delete()
    print("Cleared all unit conversions (rollback)")

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_productunit'),
    ]

    operations = [
        migrations.RunPython(rewrite_unit_conversions, reverse_rewrite_unit_conversions),
    ]