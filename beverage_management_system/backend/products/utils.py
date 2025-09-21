from decimal import Decimal
from .models import Unit, UnitConversion


def convert_price_between_units(price, from_unit_id, to_unit_id):
    """
    Convert price between units based on conversion factors.
    
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
    
    # Try direct conversion from_unit -> to_unit
    conversion = UnitConversion.objects.filter(
        from_unit=from_unit,
        to_unit=to_unit,
        is_active=True
    ).first()
    
    if conversion:
        # If converting to a larger unit, divide by conversion factor
        # If converting to a smaller unit, multiply by conversion factor
        return price / conversion.conversion_factor
    
    # Try reverse conversion to_unit -> from_unit
    reverse_conversion = UnitConversion.objects.filter(
        from_unit=to_unit,
        to_unit=from_unit,
        is_active=True
    ).first()
    
    if reverse_conversion:
        # If converting from a larger unit, multiply by conversion factor
        # If converting from a smaller unit, divide by conversion factor
        return price * reverse_conversion.conversion_factor
    
    return price


def get_unit_conversion_factor(from_unit_id, to_unit_id):
    """
    Get the conversion factor between two units.
    
    Args:
        from_unit_id: ID of the source unit
        to_unit_id: ID of the target unit
    
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
    
    # Try direct conversion (from_unit -> to_unit)
    conversion = UnitConversion.objects.filter(
        from_unit=from_unit,
        to_unit=to_unit,
        is_active=True
    ).first()
    
    if conversion:
        # If 1 from_unit = X to_units, then factor is X
        return conversion.conversion_factor
    
    # Try reverse conversion (to_unit -> from_unit)
    reverse_conversion = UnitConversion.objects.filter(
        from_unit=to_unit,
        to_unit=from_unit,
        is_active=True
    ).first()
    
    if reverse_conversion:
        # If 1 to_unit = X from_units, then 1 from_unit = 1/X to_units
        factor = Decimal('1') / reverse_conversion.conversion_factor
        return factor
    
    return Decimal('1')


def get_price_conversion_factor(from_unit_id, to_unit_id):
    """
    Get the conversion factor for price calculation between two units.
    This is different from quantity conversion - for prices, we need the factor to multiply.
    
    Args:
        from_unit_id: ID of the source unit
        to_unit_id: ID of the target unit
    
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
    
    # Try direct conversion (from_unit -> to_unit)
    conversion = UnitConversion.objects.filter(
        from_unit=from_unit,
        to_unit=to_unit,
        is_active=True
    ).first()
    
    if conversion:
        # If 1 from_unit = X to_units, then price factor is X
        return conversion.conversion_factor
    
    # Try reverse conversion (to_unit -> from_unit)
    reverse_conversion = UnitConversion.objects.filter(
        from_unit=to_unit,
        to_unit=from_unit,
        is_active=True
    ).first()
    
    if reverse_conversion:
        # If 1 to_unit = X from_units, then price factor is X (not 1/X)
        return reverse_conversion.conversion_factor
    
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
