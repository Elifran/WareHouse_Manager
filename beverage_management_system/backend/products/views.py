from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Category, Product, StockMovement
from .serializers import (
    CategorySerializer, ProductSerializer, ProductListSerializer, 
    StockMovementSerializer
)

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
    queryset = Product.objects.select_related('category').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'is_low_stock']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'price', 'stock_quantity', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProductListSerializer
        return ProductSerializer

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.select_related('category').all()
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
    ).select_related('category')
    
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def out_of_stock_products(request):
    """Get products that are out of stock"""
    products = Product.objects.filter(
        is_active=True,
        stock_quantity=0
    ).select_related('category')
    
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
