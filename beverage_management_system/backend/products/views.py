from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.http import Http404
from .models import Category, Product, StockMovement, TaxClass, Unit, UnitConversion, ProductUnit
from .serializers import (
    CategorySerializer, ProductSerializer, ProductListSerializer, 
    StockMovementSerializer, TaxClassSerializer, UnitSerializer, UnitConversionSerializer, ProductUnitSerializer
)
from .utils import get_unit_conversion_factor

class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
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
        if self.request.method == 'GET':
            return ProductListSerializer
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
                from .utils import get_unit_conversion_factor
                conversion_factor = get_unit_conversion_factor(product.base_unit.id, unit.id)
                
                if conversion_factor:
                    # Calculate available quantity in this unit
                    # For pack units (e.g., 18-Pack = 18 pieces), conversion_factor is usually > 1
                    # We want to know how many packs we can make from available pieces
                    available_quantity = int(product.stock_quantity / conversion_factor)
                    
                    # Calculate price for this unit
                    unit_price = float(product.price) * conversion_factor
                    
                    available_units.append({
                        'id': unit.id,
                        'name': unit.name,
                        'symbol': unit.symbol,
                        'price': unit_price,
                        'is_base_unit': False,
                        'conversion_factor': conversion_factor,
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
        available_quantity = int(product.stock_quantity / conversion.conversion_factor)
        
        available_units.append({
            'id': conversion.to_unit.id,
            'name': conversion.to_unit.name,
            'symbol': conversion.to_unit.symbol,
            'price': float(product.price * conversion.conversion_factor),
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
            available_quantity = int(product.stock_quantity / conversion.conversion_factor)
            
            available_units.append({
                'id': conversion.from_unit.id,
                'name': conversion.from_unit.name,
                'symbol': conversion.from_unit.symbol,
                'price': float(product.price * conversion.conversion_factor),
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
