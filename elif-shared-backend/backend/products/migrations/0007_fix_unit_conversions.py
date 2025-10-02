# Generated migration to fix unit conversions
from django.db import migrations
from decimal import Decimal

def fix_unit_conversions(apps, schema_editor):
    """
    Fix unit conversions to ensure proper categorization.
    Remove incorrect conversions and create proper ones.
    """
    Unit = apps.get_model('products', 'Unit')
    UnitConversion = apps.get_model('products', 'UnitConversion')
    
    print("Fixing unit conversions...")
    
    # Delete all existing conversions
    UnitConversion.objects.all().delete()
    print("Deleted all existing conversions")
    
    # Get base units
    base_units = Unit.objects.filter(is_base_unit=True)
    
    # Create proper conversions based on unit types
    conversions_to_create = []
    
    for base_unit in base_units:
        print(f"Processing base unit: {base_unit.name} ({base_unit.symbol})")
        
        if base_unit.symbol.lower() == 'l':
            # Volume conversions - L as base
            volume_units = Unit.objects.filter(
                is_base_unit=False, 
                is_active=True
            ).filter(
                name__icontains='mL'
            )
            
            for unit in volume_units:
                # Extract volume from unit name (e.g., 330mL -> 330)
                import re
                numbers = re.findall(r'\d+', unit.name)
                if numbers:
                    volume = int(numbers[0])
                    conversion = UnitConversion(
                        from_unit=unit,
                        to_unit=base_unit,
                        conversion_factor=Decimal(str(volume)),
                        description=f"{volume}mL = 1L",
                        is_active=True
                    )
                    conversions_to_create.append(conversion)
                    print(f"  Created: {volume} {unit.symbol} → 1 {base_unit.symbol}")
        
        elif base_unit.symbol.lower() == 'kg':
            # Weight conversions - kg as base
            weight_units = Unit.objects.filter(
                is_base_unit=False,
                is_active=True,
                name__icontains='g'
            ).exclude(name__icontains='kg')
            
            for unit in weight_units:
                if 'g' in unit.symbol.lower():
                    # Standard gram conversion
                    conversion = UnitConversion(
                        from_unit=unit,
                        to_unit=base_unit,
                        conversion_factor=Decimal('1000'),
                        description=f"1000g = 1kg",
                        is_active=True
                    )
                    conversions_to_create.append(conversion)
                    print(f"  Created: 1000 {unit.symbol} → 1 {base_unit.symbol}")
                elif 'kg' in unit.name.lower():
                    # Bag conversions (25kg bag, 50kg bag, etc.)
                    import re
                    numbers = re.findall(r'\d+', unit.name)
                    if numbers:
                        weight = int(numbers[0])
                        conversion = UnitConversion(
                            from_unit=unit,
                            to_unit=base_unit,
                            conversion_factor=Decimal(str(weight)),
                            description=f"{weight}kg bag = {weight}kg",
                            is_active=True
                        )
                        conversions_to_create.append(conversion)
                        print(f"  Created: {weight} {unit.symbol} → 1 {base_unit.symbol}")
        
        elif base_unit.symbol.lower() == 'pc':
            # Count conversions - pieces as base
            count_units = Unit.objects.filter(
                is_base_unit=False,
                is_active=True
            ).filter(
                name__icontains='pack'
            )
            
            for unit in count_units:
                # Extract count from unit name
                import re
                numbers = re.findall(r'\d+', unit.name)
                if numbers:
                    count = int(numbers[0])
                    conversion = UnitConversion(
                        from_unit=unit,
                        to_unit=base_unit,
                        conversion_factor=Decimal(str(count)),
                        description=f"{count} {unit.symbol} = {count} pieces",
                        is_active=True
                    )
                    conversions_to_create.append(conversion)
                    print(f"  Created: {count} {unit.symbol} → 1 {base_unit.symbol}")
    
    # Bulk create all conversions
    if conversions_to_create:
        UnitConversion.objects.bulk_create(conversions_to_create)
        print(f"Created {len(conversions_to_create)} corrected conversions")
    else:
        print("No conversions were created")

def reverse_fix_unit_conversions(apps, schema_editor):
    """
    Reverse the unit conversion fix (for rollback).
    """
    UnitConversion = apps.get_model('products', 'UnitConversion')
    UnitConversion.objects.all().delete()
    print("Cleared all unit conversions (rollback)")

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_rewrite_unit_conversions'),
    ]

    operations = [
        migrations.RunPython(fix_unit_conversions, reverse_fix_unit_conversions),
    ]