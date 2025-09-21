from decimal import Decimal
from .models import Unit, UnitConversion


def convert_price_between_units(price, from_unit_id, to_unit_id):
    """
    Convert price between units based on conversion factors.
    
    NEW SYSTEM: Base units are ALWAYS the destination (to_unit).
    
    Args:
        price: The price to convert
        from_unit_id: ID of the unit the price is currently in
        to_unit_id: ID of the unit to convert the price to
    
    Returns:
        Converted price or original price if no conversion found
    """
    if from_unit_id == to_unit_id:
        return price
    
    try:
        from_unit = Unit.objects.get(id=from_unit_id)
        to_unit = Unit.objects.get(id=to_unit_id)
    except Unit.DoesNotExist:
        return price
    
    # Use the new price conversion factor function
    conversion_factor = get_price_conversion_factor(from_unit_id, to_unit_id)
    return price * conversion_factor


def get_unit_conversion_factor(from_unit_id, to_unit_id):
    """
    Get the conversion factor between two units.
    
    NEW SYSTEM: Base units are ALWAYS the destination (to_unit).
    Example: 10dL → 1L (where L is base unit)
    
    Args:
        from_unit_id: ID of the source unit
        to_unit_id: ID of the target unit (should be base unit)
    
    Returns:
        Conversion factor or 1 if no conversion found
    """
    if from_unit_id == to_unit_id:
        return Decimal('1')
    
    try:
        from_unit = Unit.objects.get(id=from_unit_id)
        to_unit = Unit.objects.get(id=to_unit_id)
    except Unit.DoesNotExist:
        return Decimal('1')
    
    # Check if to_unit is a base unit
    if not to_unit.is_base_unit:
        print(f"Warning: to_unit {to_unit.name} is not a base unit. Converting to base unit first.")
        # Find the base unit for this to_unit
        base_conversion = UnitConversion.objects.filter(
            from_unit=to_unit,
            to_unit__is_base_unit=True,
            is_active=True
        ).first()
        
        if base_conversion:
            # Convert: from_unit -> base_unit, then base_unit -> to_unit
            from_to_base = get_unit_conversion_factor(from_unit_id, base_conversion.to_unit.id)
            base_to_target = Decimal('1') / base_conversion.conversion_factor
            return from_to_base * base_to_target
        else:
            return Decimal('1')
    
    # Direct conversion from non-base unit to base unit
    conversion = UnitConversion.objects.filter(
        from_unit=from_unit,
        to_unit=to_unit,
        is_active=True
    ).first()
    
    if conversion:
        # If 10dL = 1L, then factor is 10 (multiply dL by 10 to get L equivalent)
        return conversion.conversion_factor
    
    # Try reverse conversion (base unit -> non-base unit)
    reverse_conversion = UnitConversion.objects.filter(
        from_unit=to_unit,
        to_unit=from_unit,
        is_active=True
    ).first()
    
    if reverse_conversion:
        # If 1L = 10dL, then 1dL = 1/10 L
        factor = Decimal('1') / reverse_conversion.conversion_factor
        return factor
    
    return Decimal('1')


def get_price_conversion_factor(from_unit_id, to_unit_id):
    """
    Get the conversion factor for price calculation between two units.
    
    NEW SYSTEM: Base units are ALWAYS the destination (to_unit).
    For pricing: if we have base unit price, multiply by conversion factor to get larger unit price
    
    Args:
        from_unit_id: ID of the source unit (usually base unit)
        to_unit_id: ID of the target unit (usually larger unit)
    
    Returns:
        Conversion factor for price calculation
    """
    if from_unit_id == to_unit_id:
        return Decimal('1')
    
    try:
        from_unit = Unit.objects.get(id=from_unit_id)
        to_unit = Unit.objects.get(id=to_unit_id)
    except Unit.DoesNotExist:
        return Decimal('1')
    
    # If converting from base unit to larger unit (e.g., L to 10L bottle)
    if from_unit.is_base_unit and not to_unit.is_base_unit:
        # Find conversion: to_unit -> from_unit (e.g., 10L bottle -> 1L)
        conversion = UnitConversion.objects.filter(
            from_unit=to_unit,
            to_unit=from_unit,
            is_active=True
        ).first()
        
        if conversion:
            # If 10L bottle = 1L, then price factor is 10 (multiply L price by 10)
            return conversion.conversion_factor
    
    # If converting from larger unit to base unit (e.g., 10L bottle to L)
    elif not from_unit.is_base_unit and to_unit.is_base_unit:
        # Find conversion: from_unit -> to_unit (e.g., 10L bottle -> 1L)
        conversion = UnitConversion.objects.filter(
            from_unit=from_unit,
            to_unit=to_unit,
            is_active=True
        ).first()
        
        if conversion:
            # If 10L bottle = 1L, then price factor is 1/10 (divide bottle price by 10)
            return Decimal('1') / conversion.conversion_factor
    
    # If both are non-base units, convert through base unit
    elif not from_unit.is_base_unit and not to_unit.is_base_unit:
        # Find base unit for from_unit
        from_base_conv = UnitConversion.objects.filter(
            from_unit=from_unit,
            to_unit__is_base_unit=True,
            is_active=True
        ).first()
        
        # Find base unit for to_unit
        to_base_conv = UnitConversion.objects.filter(
            from_unit=to_unit,
            to_unit__is_base_unit=True,
            is_active=True
        ).first()
        
        if from_base_conv and to_base_conv and from_base_conv.to_unit.id == to_base_conv.to_unit.id:
            # Both convert to same base unit
            # Price factor = (from_unit_to_base_factor) * (1/to_unit_to_base_factor)
            from_factor = Decimal('1') / from_base_conv.conversion_factor  # from_unit to base
            to_factor = to_base_conv.conversion_factor  # to_unit to base (inverse for price)
            return from_factor * to_factor
    
    return Decimal('1')


def calculate_unit_price(product_price, product_base_unit_id, selected_unit_id):
    """
    Calculate the price for a specific unit based on the product's base unit price.
    
    Args:
        product_price: The product's price in its base unit
        product_base_unit_id: The product's base unit ID
        selected_unit_id: The unit to calculate price for
    
    Returns:
        Price for the selected unit
    """
    if not product_base_unit_id or not selected_unit_id:
        return product_price
    
    conversion_factor = get_price_conversion_factor(product_base_unit_id, selected_unit_id)
    return float(product_price) * float(conversion_factor)
