#!/usr/bin/env python3
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('/home/el-ifran/WareHouse_Manager/beverage_management_system/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'beverage_management_system.settings')
django.setup()

from sales.models import Sale, SaleItem
from products.models import Product, Unit
from decimal import Decimal

def test_sale_update():
    try:
        # Get a sale with multiple items
        sale = Sale.objects.filter(status='pending').first()
        if not sale:
            print("No pending sales found")
            return
            
        print(f"Testing sale {sale.id} with {sale.items.count()} items")
        
        # Test the calculate_totals method
        print("Testing calculate_totals method...")
        sale.calculate_totals()
        print("calculate_totals completed successfully")
        
        # Test updating an item
        item = sale.items.first()
        if item:
            print(f"Testing item update for item {item.id}")
            print(f"Original quantity: {item.quantity}")
            print(f"Original unit_price: {item.unit_price}")
            print(f"Original total_price: {item.total_price}")
            
            # Try to save the item
            item.save()
            print("Item save completed successfully")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sale_update()


