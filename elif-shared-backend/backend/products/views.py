from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.http import Http404
from .models import Category, Product, StockMovement, TaxClass, Unit, UnitConversion, ProductUnit
from .serializers import (
    CategorySerializer, ProductSerializer, 
    StockMovementSerializer, TaxClassSerializer, UnitSerializer, UnitConversionSerializer, ProductUnitSerializer
)
from .utils import get_unit_conversion_factor, get_price_conversion_factor

class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_sellable']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.select_related('category', 'base_unit').prefetch_related('compatible_units__unit').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'stock_quantity']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'price', 'stock_quantity', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        return ProductSerializer

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.select_related('category', 'base_unit').prefetch_related('compatible_units__unit').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

class StockMovementListCreateView(generics.ListCreateAPIView):
    queryset = StockMovement.objects.select_related('product', 'created_by').all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'movement_type', 'created_by']
    ordering_fields = ['created_at', 'quantity']
    ordering = ['-created_at']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_products(request):
    """Get products with low stock levels"""
    products = Product.objects.filter(
        is_active=True,
        stock_quantity__lte=models.F('min_stock_level')
    ).select_related('category', 'base_unit').prefetch_related('compatible_units__unit')
    
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def out_of_stock_products(request):
    """Get products that are out of stock"""
    products = Product.objects.filter(
        is_active=True,
        stock_quantity=0
    ).select_related('category', 'base_unit').prefetch_related('compatible_units__unit')
    
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def adjust_stock(request, product_id):
    """Adjust stock quantity for a product"""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    quantity = request.data.get('quantity')
    notes = request.data.get('notes', '')
    
    if quantity is None:
        return Response({'error': 'Quantity is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update product stock
    product.stock_quantity = quantity
    product.save()
    
    # Create stock movement
    movement = StockMovement.objects.create(
        product=product,
        movement_type='adjustment',
        quantity=quantity,
        notes=notes,
        created_by=request.user
    )
    
    serializer = StockMovementSerializer(movement)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

# Tax Class Views
class TaxClassListCreateView(generics.ListCreateAPIView):
    queryset = TaxClass.objects.all()
    serializer_class = TaxClassSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'tax_rate', 'created_at']
    ordering = ['name']
    
    def get_permissions(self):
        """
        Only allow admin and manager roles to manage tax classes
        """
        from rest_framework.permissions import IsAuthenticated
        from .permissions import IsManagerOrAdmin
        
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]

class TaxClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TaxClass.objects.all()
    serializer_class = TaxClassSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Only allow admin and manager roles to manage tax classes
        """
        from rest_framework.permissions import IsAuthenticated
        from .permissions import IsManagerOrAdmin
        
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]

# Unit Views
class UnitListCreateView(generics.ListCreateAPIView):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'symbol', 'description']
    ordering_fields = ['name', 'symbol', 'created_at']
    ordering = ['name']
    
    def get_permissions(self):
        """
        Only allow admin and manager roles to manage units
        """
        from rest_framework.permissions import IsAuthenticated
        from .permissions import IsManagerOrAdmin
        
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]

class UnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Only allow admin and manager roles to manage units
        """
        from rest_framework.permissions import IsAuthenticated
        from .permissions import IsManagerOrAdmin
        
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]

class BaseUnitListView(generics.ListAPIView):
    """View to get only base units for product creation"""
    queryset = Unit.objects.filter(is_base_unit=True, is_active=True)
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['name']

# Unit Conversion Views
class UnitConversionListCreateView(generics.ListCreateAPIView):
    queryset = UnitConversion.objects.all()
    serializer_class = UnitConversionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['from_unit', 'to_unit', 'is_active']
    search_fields = ['from_unit__name', 'to_unit__name', 'description']
    ordering_fields = ['from_unit__name', 'to_unit__name', 'conversion_factor', 'created_at']
    ordering = ['from_unit__name', 'to_unit__name']
    
    def get_permissions(self):
        """
        Only allow admin and manager roles to manage unit conversions
        """
        from rest_framework.permissions import IsAuthenticated
        from .permissions import IsManagerOrAdmin
        
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]

class UnitConversionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = UnitConversion.objects.all()
    serializer_class = UnitConversionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Only allow admin and manager roles to manage unit conversions
        """
        from rest_framework.permissions import IsAuthenticated
        from .permissions import IsManagerOrAdmin
        
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_product_unit_costs(request, product_id):
    """
    Get unit costs for a product in all its compatible units
    """
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not product.base_unit:
        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'unit_costs': []
        })
    
    # Get compatible units for this product
    compatible_units = product.compatible_units.filter(is_active=True)
    
    unit_costs = []
    
    # Add base unit
    unit_costs.append({
        'id': product.base_unit.id,
        'name': product.base_unit.name,
        'symbol': product.base_unit.symbol,
        'is_base_unit': True,
        'is_default': False,  # Will be updated below if it's the default
        'cost_price': float(product.cost_price)
    })
    
    # Add compatible units
    for compatible_unit in compatible_units:
        unit = compatible_unit.unit
        if unit.id == product.base_unit.id:
            # Update the base unit entry to show if it's default
            for uc in unit_costs:
                if uc['id'] == unit.id:
                    uc['is_default'] = compatible_unit.is_default
                    break
            continue
        
        # Calculate cost price for this unit
        cost_in_unit = product.get_cost_price_in_unit(unit)
        
        unit_costs.append({
            'id': unit.id,
            'name': unit.name,
            'symbol': unit.symbol,
            'is_base_unit': False,
            'is_default': compatible_unit.is_default,
            'cost_price': float(cost_in_unit) if cost_in_unit else 0
        })
    
    return Response({
        'product_id': product.id,
        'product_name': product.name,
        'base_unit': {
            'id': product.base_unit.id,
            'name': product.base_unit.name,
            'symbol': product.base_unit.symbol
        },
        'default_unit': {
            'id': product.get_default_unit().id,
            'name': product.get_default_unit().name,
            'symbol': product.get_default_unit().symbol
        },
        'unit_costs': unit_costs
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_stock_availability(request):
    """
    Check stock availability for multiple products at once
    """
    product_ids = request.data.get('product_ids', [])
    
    if not product_ids:
        return Response({'error': 'product_ids is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        products = Product.objects.filter(
            id__in=product_ids,
            is_active=True
        ).select_related('base_unit').prefetch_related('compatible_units__unit')
        
        result = {}
        for product in products:
            if not product.base_unit:
                continue
                
            # Get available units with stock information
            available_units = []
            
            # Add base unit
            available_units.append({
                'id': product.base_unit.id,
                'name': product.base_unit.name,
                'symbol': product.base_unit.symbol,
                'price': float(product.price),
                'is_base_unit': True,
                'conversion_factor': 1.0,
                'available_quantity': product.stock_quantity,
                'is_available': product.stock_quantity > 0
            })
            
            # Add compatible units (only the ones specifically configured for this product)
            for compatible_unit in product.compatible_units.filter(is_active=True):
                unit = compatible_unit.unit
                if unit.id == product.base_unit.id:
                    continue  # Skip base unit as it's already added
                
                # Get conversion factor
                from .utils import get_unit_conversion_factor, get_price_conversion_factor
                quantity_conversion_factor = get_unit_conversion_factor(unit.id, product.base_unit.id)
                # For pricing, we want to convert FROM base unit TO the unit (e.g., Piece -> 12-Pack)
                price_conversion_factor = get_price_conversion_factor(product.base_unit.id, unit.id)
                
                if quantity_conversion_factor:
                    # Calculate available quantity in this unit
                    # For pack units (e.g., 18-Pack = 18 pieces), conversion_factor is usually > 1
                    # We want to know how many packs we can make from available pieces
                    available_quantity = float(product.stock_quantity / float(quantity_conversion_factor))
                    
                    # Calculate price for this unit using the correct price conversion factor
                    # Use the appropriate base price (standard or wholesale)
                    from decimal import Decimal
                    base_price = Decimal(str(product.price))  # Convert to Decimal for consistency
                    unit_price = float(base_price * price_conversion_factor)  # Convert result back to float
                    
                    available_units.append({
                        'id': unit.id,
                        'name': unit.name,
                        'symbol': unit.symbol,
                        'price': unit_price,
                        'is_base_unit': False,
                        'conversion_factor': quantity_conversion_factor,
                        'available_quantity': available_quantity,
                        'is_available': available_quantity > 0
                    })
            
            result[product.id] = {
                'product_id': product.id,
                'product_name': product.name,
                'base_unit': {
                    'id': product.base_unit.id,
                    'name': product.base_unit.name,
                    'symbol': product.base_unit.symbol
                },
                'available_units': available_units
            }
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_stock_availability(request, product_id):
    """
    Check stock availability for a product in different units
    """
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not product.base_unit:
        return Response({'error': 'Product has no base unit defined'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get available units with stock information
    available_units = []
    
    # Add base unit
    available_units.append({
        'id': product.base_unit.id,
        'name': product.base_unit.name,
        'symbol': product.base_unit.symbol,
        'price': float(product.price),
        'is_base_unit': True,
        'available_quantity': product.stock_quantity,
        'is_available': product.stock_quantity > 0
    })
    
    # Add units that can be converted from base unit
    conversions_from = UnitConversion.objects.filter(
        from_unit=product.base_unit,
        is_active=True
    ).select_related('to_unit')
    
    for conversion in conversions_from:
        # Calculate how many of this unit are available
        # If 1 carton = 20 pieces, then available cartons = stock_pieces / 20
        available_quantity = float(product.stock_quantity / float(conversion.conversion_factor))
        
        available_units.append({
            'id': conversion.to_unit.id,
            'name': conversion.to_unit.name,
            'symbol': conversion.to_unit.symbol,
            'price': float(float(product.price) * float(conversion.conversion_factor)),
            'is_base_unit': False,
            'conversion_factor': float(conversion.conversion_factor),
            'available_quantity': available_quantity,
            'is_available': available_quantity > 0
        })
    
    # Add units that can be converted to base unit
    conversions_to = UnitConversion.objects.filter(
        to_unit=product.base_unit,
        is_active=True
    ).select_related('from_unit')
    
    for conversion in conversions_to:
        if not any(unit['id'] == conversion.from_unit.id for unit in available_units):
            # Calculate how many of this unit are available
            # If 1 gony = 50 kg, then available gony = stock_kg / 50
            available_quantity = float(product.stock_quantity / float(conversion.conversion_factor))
            
            available_units.append({
                'id': conversion.from_unit.id,
                'name': conversion.from_unit.name,
                'symbol': conversion.from_unit.symbol,
                'price': float(float(product.price) * float(conversion.conversion_factor)),
                'is_base_unit': False,
                'conversion_factor': float(conversion.conversion_factor),
                'available_quantity': available_quantity,
                'is_available': available_quantity > 0
            })
    
    return Response({
        'product_id': product.id,
        'product_name': product.name,
        'base_stock': product.stock_quantity,
        'base_unit': product.base_unit.symbol,
        'available_units': available_units
    })

class ProductUnitListCreateView(generics.ListCreateAPIView):
    """List and create product units for a specific product"""
    serializer_class = ProductUnitSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        return ProductUnit.objects.filter(product_id=product_id, is_active=True).select_related('unit')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        product_id = self.kwargs.get('product_id')
        try:
            context['product'] = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise Http404("Product not found")
        return context
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'Failed to create product unit: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class ProductUnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific product unit"""
    serializer_class = ProductUnitSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        return ProductUnit.objects.filter(product_id=product_id).select_related('unit')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        product_id = self.kwargs.get('product_id')
        try:
            context['product'] = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            pass
        return context

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_product_compatible_units(request, product_id):
    """Get all compatible units for a specific product"""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    compatible_units = product.compatible_units.filter(is_active=True).select_related('unit')
    serializer = ProductUnitSerializer(compatible_units, many=True)
    
    return Response({
        'product_id': product.id,
        'product_name': product.name,
        'compatible_units': serializer.data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_product_available_units(request, product_id):
    """Get units that can be added as compatible units for a product"""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not product.base_unit:
        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'available_units': []
        })
    
    # Get units that have conversions with the product's base unit
    base_unit = product.base_unit
    
    # Units that can convert TO the base unit
    conversions_to_base = UnitConversion.objects.filter(
        to_unit=base_unit,
        is_active=True
    ).values_list('from_unit', flat=True)
    
    # Units that the base unit can convert TO (reverse conversions)
    conversions_from_base = UnitConversion.objects.filter(
        from_unit=base_unit,
        is_active=True
    ).values_list('to_unit', flat=True)
    
    # Combine both sets and get unique units
    available_unit_ids = set(conversions_to_base) | set(conversions_from_base)
    
    # Exclude the base unit itself
    available_unit_ids.discard(base_unit.id)
    
    # Get the units
    available_units = Unit.objects.filter(
        id__in=available_unit_ids,
        is_active=True
    ).order_by('name')
    
    serializer = UnitSerializer(available_units, many=True)
    
    return Response({
        'product_id': product.id,
        'product_name': product.name,
        'base_unit': {
            'id': base_unit.id,
            'name': base_unit.name,
            'symbol': base_unit.symbol
        },
        'available_units': serializer.data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_price_conversion_factor_api(request):
    """
    Get price conversion factor between two units
    """
    from_unit_id = request.GET.get('from_unit_id')
    to_unit_id = request.GET.get('to_unit_id')
    
    if not from_unit_id or not to_unit_id:
        return Response({
            'error': 'from_unit_id and to_unit_id are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from_unit = Unit.objects.get(id=from_unit_id)
        to_unit = Unit.objects.get(id=to_unit_id)
        
        conversion_factor = get_price_conversion_factor(from_unit_id, to_unit_id)
        
        return Response({
            'from_unit': {
                'id': from_unit.id,
                'name': from_unit.name,
                'symbol': from_unit.symbol
            },
            'to_unit': {
                'id': to_unit.id,
                'name': to_unit.name,
                'symbol': to_unit.symbol
            },
            'conversion_factor': float(conversion_factor)
        })
        
    except Unit.DoesNotExist:
        return Response({
            'error': 'One or both units not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quantity_conversion_factor_api(request):
    """
    Get quantity conversion factor between two units
    """
    from_unit_id = request.GET.get('from_unit_id')
    to_unit_id = request.GET.get('to_unit_id')
    
    if not from_unit_id or not to_unit_id:
        return Response({
            'error': 'from_unit_id and to_unit_id are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from_unit = Unit.objects.get(id=from_unit_id)
        to_unit = Unit.objects.get(id=to_unit_id)
        
        conversion_factor = get_unit_conversion_factor(from_unit_id, to_unit_id)
        
        return Response({
            'from_unit': {
                'id': from_unit.id,
                'name': from_unit.name,
                'symbol': from_unit.symbol
            },
            'to_unit': {
                'id': to_unit.id,
                'name': to_unit.name,
                'symbol': to_unit.symbol
            },
            'conversion_factor': float(conversion_factor)
        })
        
    except Unit.DoesNotExist:
        return Response({
            'error': 'One or both units not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_product_pricing_structure(request, product_id):
    """
    Get the new pricing structure for a product
    """
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get standard prices list
    standard_prices = product.get_standard_prices_list()
    
    # Get available standard prices (for sales app)
    available_standard_prices = product.get_available_standard_prices()
    
    # Get available wholesale prices (for sales app)
    available_wholesale_prices = product.get_available_wholesale_prices()
    
    # Get compatible units with their specific prices
    compatible_units_with_prices = []
    for product_unit in product.compatible_units.filter(is_active=True):
        compatible_units_with_prices.append({
            'id': product_unit.unit.id,
            'name': product_unit.unit.name,
            'symbol': product_unit.unit.symbol,
            'is_default': product_unit.is_default,
            'is_base_unit': product_unit.unit == product.base_unit,
            'standard_price': float(product_unit.standard_price) if product_unit.standard_price else None,
            'wholesale_price': float(product_unit.wholesale_price) if product_unit.wholesale_price else None
        })
    
    return Response({
        'product_id': product.id,
        'product_name': product.name,
        'standard_prices_list': standard_prices,
        'available_standard_prices': available_standard_prices,
        'available_wholesale_prices': available_wholesale_prices,
        'compatible_units_with_prices': compatible_units_with_prices,
        'base_unit': {
            'id': product.base_unit.id if product.base_unit else None,
            'name': product.base_unit.name if product.base_unit else None,
            'symbol': product.base_unit.symbol if product.base_unit else None
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_products_for_sales(request):
    """
    Get products with new pricing structure for sales app
    """
    price_mode = request.GET.get('price_mode', 'standard')  # 'standard' or 'wholesale'
    
    try:
        products = Product.objects.filter(
            is_active=True
        ).select_related('base_unit').prefetch_related('compatible_units__unit')
        
        result = []
        for product in products:
            if not product.base_unit:
                continue
            
            # Get available units based on price mode
            available_units = []
            
            if price_mode == 'standard':
                # For standard mode, show units with standard prices (from standard_prices_list or unit-specific)
                standard_prices = product.get_standard_prices_list()
                
                # Add base unit with standard prices
                if standard_prices:
                    available_units.append({
                        'id': product.base_unit.id,
                        'name': product.base_unit.name,
                        'symbol': product.base_unit.symbol,
                        'is_base_unit': True,
                        'prices': standard_prices,
                        'available_quantity': product.stock_quantity,
                        'is_available': product.stock_quantity > 0
                    })
                
                # Add compatible units with unit-specific standard prices
                for product_unit in product.compatible_units.filter(is_active=True):
                    if product_unit.standard_price:
                        # Calculate available quantity in this unit
                        conversion_factor = get_unit_conversion_factor(product_unit.unit.id, product.base_unit.id)
                        if conversion_factor:
                            available_quantity = float(product.stock_quantity / float(conversion_factor))
                            
                            available_units.append({
                                'id': product_unit.unit.id,
                                'name': product_unit.unit.name,
                                'symbol': product_unit.unit.symbol,
                                'is_base_unit': False,
                                'prices': [float(product_unit.standard_price)],
                                'available_quantity': available_quantity,
                                'is_available': available_quantity > 0
                            })
            
            elif price_mode == 'wholesale':
                # For wholesale mode, show units with wholesale prices
                wholesale_prices = product.get_available_wholesale_prices()
                
                for wholesale_price_info in wholesale_prices:
                    unit = wholesale_price_info['unit']
                    price = wholesale_price_info['price']
                    
                    if unit == product.base_unit:
                        available_quantity = product.stock_quantity
                    else:
                        conversion_factor = get_unit_conversion_factor(unit.id, product.base_unit.id)
                        if conversion_factor:
                            available_quantity = float(product.stock_quantity / float(conversion_factor))
                        else:
                            continue
                    
                    available_units.append({
                        'id': unit.id,
                        'name': unit.name,
                        'symbol': unit.symbol,
                        'is_base_unit': unit == product.base_unit,
                        'prices': [price],
                        'available_quantity': available_quantity,
                        'is_available': available_quantity > 0
                    })
            
            if available_units:  # Only include products that have available units for the selected price mode
                result.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'sku': product.sku,
                    'base_unit': {
                        'id': product.base_unit.id,
                        'name': product.base_unit.name,
                        'symbol': product.base_unit.symbol
                    },
                    'available_units': available_units
                })
        
        return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

