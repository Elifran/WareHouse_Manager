def calculate_current_stock(product_id):
    """
    Calculate current stock for a product by summing all stock movements
    """
    from products.models import StockMovement
    from django.db.models import Sum
    
    result = StockMovement.objects.filter(product_id=product_id).aggregate(Sum('quantity_change'))
    return result['quantity_change__sum'] or 0
