import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Button from '../components/Button';
import './Inventory.css';

const Inventory = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [originalProductData, setOriginalProductData] = useState(null);
  const [currentDisplayUnit, setCurrentDisplayUnit] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    base_unit: '',
    price: '',
    wholesale_price: '',
    cost_price: '',
    stock_quantity: '',
    min_stock_level: '',
    max_stock_level: '',
    tax_class: '',
    has_packaging: false,
    packaging_price: '',
    storage_type: 'STR',
    storage_section: '',
    is_active: true,
    // New standard pricing structure
    standard_price_1: '',
    standard_price_2: '',
    standard_price_3: '',
    standard_price_4: '',
    standard_price_5: ''
  });
  const [allUnits, setAllUnits] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [allTaxClasses, setAllTaxClasses] = useState([]);
  const [compatibleUnits, setCompatibleUnits] = useState([]);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [availableUnits, setAvailableUnits] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalProducts, setTotalProducts] = useState(0);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/products/');
      const data = response.data;
      
      // Handle both paginated and non-paginated responses
      let products = [];
      if (data.results) {
        // Paginated response
        products = data.results;
        let nextUrl = data.next;
        while (nextUrl) {
          const nextResponse = await api.get(nextUrl);
          const nextData = nextResponse.data;
          products = [...products, ...nextData.results];
          nextUrl = nextData.next;
        }
      } else if (Array.isArray(data)) {
        // Direct array response
        products = data;
      } else {
        console.error('Unexpected API response format:', data);
        setError('Unexpected API response format');
        return;
      }
      
      setProducts(products);
      setTotalProducts(products.length);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/api/products/categories/');
      const data = response.data;
      
      // Handle both paginated and non-paginated responses
      let categoriesData = [];
      if (data.results) {
        categoriesData = data.results;
      } else if (Array.isArray(data)) {
        categoriesData = data;
      } else {
        console.error('Unexpected categories API response format:', data);
        return;
      }
      
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // Fetch units
  const fetchUnits = useCallback(async () => {
    try {
      let allUnitsData = [];
      let nextUrl = '/api/products/units/';
      
      while (nextUrl) {
        const response = await api.get(nextUrl);
        const data = response.data;
        
        if (data.results) {
          allUnitsData = [...allUnitsData, ...data.results];
          nextUrl = data.next;
        } else {
          allUnitsData = data;
          nextUrl = null;
        }
      }
      
      const baseUnitsResponse = await api.get('/api/products/base-units/');
      const baseUnitsData = baseUnitsResponse.data.results || baseUnitsResponse.data;
      
      setAllUnits(allUnitsData);
      setBaseUnits(baseUnitsData);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  }, []);

  // Fetch tax classes
  const fetchTaxClasses = useCallback(async () => {
    try {
      const response = await api.get('/api/products/tax-classes/');
      const taxClassesData = response.data.results || response.data;
      setAllTaxClasses(taxClassesData);
    } catch (err) {
      console.error('Error fetching tax classes:', err);
    }
  }, []);

  // Fetch compatible units for a product
  const fetchCompatibleUnits = useCallback(async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}/compatible-units/`);
      setCompatibleUnits(response.data.compatible_units || []);
    } catch (err) {
      console.error('Error fetching compatible units:', err);
      setCompatibleUnits([]);
    }
  }, []);

  // Fetch available units for a product based on unit conversions
  const fetchAvailableUnits = useCallback(async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}/available-units/`);
      setAvailableUnits(response.data.available_units || []);
    } catch (err) {
      console.error('Error fetching available units:', err);
      setAvailableUnits([]);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUnits();
    fetchTaxClasses();
  }, [fetchProducts, fetchCategories, fetchUnits, fetchTaxClasses]);

  // Filter products based on search term, category, and stock filter
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || product.category === parseInt(selectedCategory);
    const matchesStock = stockFilter === 'all' || 
      (stockFilter === 'low' && product.stock_quantity <= product.min_stock_level) ||
      (stockFilter === 'out' && product.stock_quantity === 0);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockFilter]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };

  // Handle filter changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleStockFilterChange = (e) => {
    setStockFilter(e.target.value);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      name: '',
      sku: '',
      description: '',
      category: '',
      base_unit: '',
      price: '',
      wholesale_price: '',
      cost_price: '',
      stock_quantity: '',
      min_stock_level: '',
      max_stock_level: '',
      tax_class: '',
      has_packaging: false,
      packaging_price: '',
      storage_type: 'STR',
      storage_section: '',
      is_active: true,
      // New standard pricing structure
      standard_price_1: '',
      standard_price_2: '',
      standard_price_3: '',
      standard_price_4: '',
      standard_price_5: ''
    });
    setCompatibleUnits([]);
    setShowProductModal(true);
  };

  const handleEditProduct = async (product) => {
    try {
      const response = await api.get(`/api/products/${product.id}/`);
      const freshProduct = response.data;
      
      setEditingProduct(freshProduct);
      setOriginalProductData({
        price: freshProduct.price,
        wholesale_price: freshProduct.wholesale_price,
        cost_price: freshProduct.cost_price,
        stock_quantity: freshProduct.stock_quantity,
        base_unit: freshProduct.base_unit
      });
      
      setProductFormData({
        name: freshProduct.name,
        sku: freshProduct.sku || '',
        description: freshProduct.description || '',
        category: freshProduct.category || '',
        base_unit: freshProduct.base_unit || '',
        price: freshProduct.price || '',
        wholesale_price: freshProduct.wholesale_price || '',
        cost_price: freshProduct.cost_price || '',
        stock_quantity: freshProduct.stock_quantity || '',
        min_stock_level: freshProduct.min_stock_level || '',
        max_stock_level: freshProduct.max_stock_level || '',
        tax_class: freshProduct.tax_class || '',
        has_packaging: freshProduct.has_packaging || false,
        packaging_price: freshProduct.packaging_price || '',
        storage_type: freshProduct.storage_type || 'STR',
        storage_section: freshProduct.storage_section || '',
        is_active: freshProduct.is_active !== false
      });
      
      await fetchCompatibleUnits(freshProduct.id);
      await fetchAvailableUnits(freshProduct.id);
      
      const defaultUnit = freshProduct.compatible_units?.find(cu => cu.is_default);
      if (defaultUnit) {
        setCurrentDisplayUnit(defaultUnit.unit);
      } else {
        setCurrentDisplayUnit(freshProduct.base_unit);
      }
      
      setProductFormData(prev => ({
        ...prev,
        sku: freshProduct.sku,
        price: freshProduct.price,
        wholesale_price: freshProduct.wholesale_price,
        cost_price: freshProduct.cost_price,
        stock_quantity: freshProduct.stock_quantity,
        min_stock_level: freshProduct.min_stock_level,
        max_stock_level: freshProduct.max_stock_level,
        // New standard pricing fields
        standard_price_1: freshProduct.standard_price_1 || '',
        standard_price_2: freshProduct.standard_price_2 || '',
        standard_price_3: freshProduct.standard_price_3 || '',
        standard_price_4: freshProduct.standard_price_4 || '',
        standard_price_5: freshProduct.standard_price_5 || ''
      }));
      
      setShowProductModal(true);
    } catch (err) {
      console.error('Error fetching product data:', err);
      setError('Failed to load product data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...productFormData,
        price: parseFloat(productFormData.price) || 0,
        wholesale_price: productFormData.wholesale_price ? parseFloat(productFormData.wholesale_price) : null,
        cost_price: parseFloat(productFormData.cost_price) || 0,
        stock_quantity: parseFloat(productFormData.stock_quantity) || 0,
        min_stock_level: parseFloat(productFormData.min_stock_level) || 0,
        max_stock_level: parseFloat(productFormData.max_stock_level) || 0,
        // New standard pricing fields
        standard_price_1: parseFloat(productFormData.standard_price_1) || 0,
        standard_price_2: productFormData.standard_price_2 ? parseFloat(productFormData.standard_price_2) : null,
        standard_price_3: productFormData.standard_price_3 ? parseFloat(productFormData.standard_price_3) : null,
        standard_price_4: productFormData.standard_price_4 ? parseFloat(productFormData.standard_price_4) : null,
        standard_price_5: productFormData.standard_price_5 ? parseFloat(productFormData.standard_price_5) : null,
      };

      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}/`, data);
      } else {
        await api.post('/api/products/', data);
      }

      setShowProductModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/api/products/${productId}/`);
        fetchProducts();
      } catch (err) {
        console.error('Error deleting product:', err);
        setError('Failed to delete product');
      }
    }
  };

  const addCompatibleUnit = async () => {
    if (!selectedUnit || !editingProduct) return;

    try {
      await api.post(`/api/products/${editingProduct.id}/units/`, {
        unit: selectedUnit,
        is_default: false
      });
      
      fetchCompatibleUnits(editingProduct.id);
      fetchAvailableUnits(editingProduct.id);
      setSelectedUnit('');
      setShowAddUnitModal(false);
    } catch (err) {
      console.error('Error adding compatible unit:', err);
    }
  };

  const removeCompatibleUnit = async (productUnitId) => {
    if (window.confirm('Are you sure you want to remove this unit?')) {
      try {
      await api.delete(`/api/products/${editingProduct.id}/units/${productUnitId}/`);
      fetchCompatibleUnits(editingProduct.id);
      fetchAvailableUnits(editingProduct.id);
      } catch (err) {
        console.error('Error removing compatible unit:', err);
      }
    }
  };

  const updateUnitSpecificPrice = async (unitId, priceType, value) => {
    try {
      const data = {
        [priceType]: value ? parseFloat(value) : null
      };
      
      await api.patch(`/api/products/${editingProduct.id}/units/${unitId}/`, data);
      
      // Update local state
      setCompatibleUnits(prev => prev.map(unit => 
        unit.id === unitId 
          ? { ...unit, [priceType]: value ? parseFloat(value) : null }
          : unit
      ));
    } catch (err) {
      console.error('Error updating unit-specific price:', err);
      setError('Failed to update unit-specific price');
    }
  };

  const setDefaultUnit = async (productUnitId) => {
    if (!editingProduct || !originalProductData) return;
    
    try {
      const compatibleUnit = compatibleUnits.find(cu => cu.id === productUnitId);
      if (!compatibleUnit) return;

      await api.patch(`/api/products/${editingProduct.id}/units/${productUnitId}/`, {
        is_default: true
      });

      const newDisplayUnitId = compatibleUnit.unit?.id || compatibleUnit.unit_id;
      setCurrentDisplayUnit(newDisplayUnitId);

      const response = await api.get(`/api/products/${editingProduct.id}/`);
      const updatedProduct = response.data;
      
      setProductFormData(prev => ({
        ...prev,
        price: updatedProduct.price,
        wholesale_price: updatedProduct.wholesale_price,
        cost_price: updatedProduct.cost_price,
        stock_quantity: updatedProduct.stock_quantity,
        min_stock_level: updatedProduct.min_stock_level,
        max_stock_level: updatedProduct.max_stock_level
      }));

      fetchCompatibleUnits(editingProduct.id);
      fetchAvailableUnits(editingProduct.id);
      
    } catch (err) {
      console.error('Error setting default unit:', err);
    }
  };

  const getUnitIndicator = () => {
    if (!currentDisplayUnit || !editingProduct || !editingProduct.base_unit) {
      return currentDisplayUnit?.name || currentDisplayUnit || '';
    }
    
    const baseUnitId = editingProduct.base_unit?.id || editingProduct.base_unit;
    const displayUnitId = currentDisplayUnit?.id || currentDisplayUnit;
    
    if (baseUnitId === displayUnitId) {
      return "base unit";
    }
    
    const conversion = editingProduct.available_units?.find(au => au.id === displayUnitId);
    
    if (conversion && conversion.conversion_factor) {
      const factor = parseFloat(conversion.conversion_factor);
      if (factor > 1) {
        return `×${factor}`;
      } else if (factor < 1) {
        return `÷${Math.round(1/factor)}`;
      } else {
        return `×${factor}`;
      }
    }
    
    const unitName = currentDisplayUnit.name;
    const match = unitName.match(/(\d+)-Pack/);
    if (match && match[1]) {
      const factor = parseInt(match[1], 10);
      return `×${factor}`;
    }

    return unitName || '';
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setStockFilter('all');
    setCurrentPage(1);
  };

  // Mobile card view component
  const ProductCard = ({ product }) => {
    const defaultUnit = product.compatible_units?.find(cu => cu.is_default);
    const defaultUnitName = defaultUnit ? 
      `${defaultUnit.unit_name || defaultUnit.unit?.name || 'N/A'} (${defaultUnit.unit_symbol || defaultUnit.unit?.symbol || ''})` : 
      `${product.base_unit_name || product.base_unit?.name || 'N/A'} (${product.base_unit_symbol || product.base_unit?.symbol || ''})`;

    return (
      <div className="product-card">
        <div className="product-card-header">
          <h3 className="product-name">{product.name}</h3>
          <span className={`status ${product.is_active ? 'active' : 'inactive'}`}>
            {product.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="product-card-details">
          <div className="detail-row">
            <span className="label">SKU:</span>
            <span className="value">{product.sku || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Category:</span>
            <span className="value">{product.category_name || product.category?.name || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Unit:</span>
            <span className="value">{defaultUnitName}</span>
          </div>
          <div className="detail-row">
            <span className="label">Price:</span>
            <span className="value price">
              {(() => {
                // Show standard prices list for base unit
                if (product.standard_prices_list && product.standard_prices_list.length > 0) {
                  return `MGA ${product.standard_prices_list.map(p => parseFloat(p).toFixed(2)).join(', ')}`;
                }
                // Fallback to legacy price
                return product.price ? `MGA ${parseFloat(product.price).toFixed(2)}` : 'N/A';
              })()}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Stock:</span>
            <span className="value stock">{product.stock_quantity || 0}</span>
          </div>
          <div className="detail-row">
            <span className="label">Packaging:</span>
            <span className="value">
              {product.has_packaging ? (
                <span className="packaging-info">
                  <span className="packaging-badge">PKG</span>
                  {product.packaging_price && (
                    <span className="packaging-price">MGA {parseFloat(product.packaging_price).toFixed(2)}</span>
                  )}
                </span>
              ) : (
                <span className="no-packaging">No</span>
              )}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Storage:</span>
            <span className="value">
              {product.storage_type ? (
                <span className="storage-info">
                  <span className={`storage-type ${product.storage_type}`}>
                    {product.storage_type === 'STR' ? 'Front' : 'Back'}
                  </span>
                  {product.storage_section && (
                    <span className="storage-section">{product.storage_section}</span>
                  )}
                </span>
              ) : (
                <span className="no-storage">-</span>
              )}
            </span>
          </div>
        </div>
        
        <div className="product-card-actions">
          <Button 
            variant="outline" 
            size="small" 
            onClick={() => handleEditProduct(product)}
            fullWidth={isMobile}
          >
            Edit
          </Button>
          <Button 
            variant="danger" 
            size="small" 
            onClick={() => handleDeleteProduct(product.id)}
            fullWidth={isMobile}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="inventory">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h1>{t('titles.inventory_management')}</h1>
        <Button onClick={handleAddProduct} size={isMobile ? "small" : "medium"}>
          Add Product
        </Button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="inventory-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select 
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select 
            value={stockFilter}
            onChange={handleStockFilterChange}
            className="filter-select"
          >
            <option value="all">All Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {(searchTerm || selectedCategory || stockFilter !== 'all') && (
          <div className="filter-group">
            <Button 
              variant="outline" 
              size="small"
              onClick={handleClearFilters}
              style={{ marginTop: 'auto' }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Products Count */}
      <div className="products-count">
        Showing {currentProducts.length} of {filteredProducts.length} products
        {filteredProducts.length !== totalProducts && ` (filtered from ${totalProducts} total)`}
        {currentPage > 1 && ` - Page ${currentPage} of ${totalPages}`}
      </div>

      {/* Desktop Table View */}
      {!isMobile && (
        <div className="products-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Default Unit</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Packaging</th>
                <th>Storage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentProducts.map(product => {
                const defaultUnit = product.compatible_units?.find(cu => cu.is_default);
                const defaultUnitName = defaultUnit ? 
                  `${defaultUnit.unit_name || defaultUnit.unit?.name || 'N/A'} (${defaultUnit.unit_symbol || defaultUnit.unit?.symbol || ''})` : 
                  `${product.base_unit_name || product.base_unit?.name || 'N/A'} (${product.base_unit_symbol || product.base_unit?.symbol || ''})`;
                
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku || 'N/A'}</td>
                    <td>{product.category_name || product.category?.name || 'N/A'}</td>
                    <td>{defaultUnitName}</td>
                    <td>
                      {(() => {
                        // Show standard prices list for base unit
                        if (product.standard_prices_list && product.standard_prices_list.length > 0) {
                          return `MGA ${product.standard_prices_list.map(p => parseFloat(p).toFixed(2)).join(', ')}`;
                        }
                        // Fallback to legacy price
                        return product.price ? `MGA ${parseFloat(product.price).toFixed(2)}` : 'N/A';
                      })()}
                    </td>
                    <td>{product.stock_quantity || 0}</td>
                    <td>
                      {product.has_packaging === true || product.has_packaging === 'true' || product.has_packaging === 1 ? (
                        <span className="packaging-info">
                          <span className="packaging-badge">PKG</span>
                          {product.packaging_price && product.packaging_price > 0 && (
                            <span className="packaging-price">MGA {parseFloat(product.packaging_price).toFixed(2)}</span>
                          )}
                        </span>
                      ) : (
                        <span className="no-packaging">No</span>
                      )}
                    </td>
                    <td>
                      <span className="storage-info">
                        {product.storage_type && product.storage_type !== '' ? (
                          <>
                            <span className={`storage-type ${product.storage_type}`}>
                              {product.storage_type === 'STR' ? 'Front Storage' : 
                               product.storage_type === 'SSO' ? 'Back Storage' : 
                               product.storage_type}
                            </span>
                            {product.storage_section && product.storage_section !== '' && (
                              <span className="storage-section">{product.storage_section}</span>
                            )}
                          </>
                        ) : (
                          <span className="no-storage">-</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`status ${product.is_active ? 'active' : 'inactive'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Button 
                          variant="outline" 
                          size="small" 
                          onClick={() => handleEditProduct(product)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="danger" 
                          size="small" 
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {isMobile && (
        <div className="products-grid">
          {currentProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {currentProducts.length === 0 && !loading && (
        <div className="no-products">
          <p>No products found{searchTerm || selectedCategory || stockFilter !== 'all' ? ' matching your filters' : ''}.</p>
          {(searchTerm || selectedCategory || stockFilter !== 'all') && (
            <Button 
              variant="outline" 
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Page {currentPage} of {totalPages} - {filteredProducts.length} products
            {filteredProducts.length !== totalProducts && ' (filtered)'}
          </div>
          
          <div className="pagination-controls">
            <Button
              variant="outline"
              size="small"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="pagination-numbers">
              {getPageNumbers().map(pageNumber => (
                <button
                  key={pageNumber}
                  className={`pagination-number ${pageNumber === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              
              {totalPages > getPageNumbers()[getPageNumbers().length - 1] && (
                <span className="pagination-ellipsis">...</span>
              )}
            </div>
            
            <Button
              variant="outline"
              size="small"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className={`modal inventory-modal ${isMobile ? 'mobile-modal' : ''}`}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowProductModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className={`form-layout ${isMobile ? 'mobile' : 'desktop'}`}>
                <div className="form-group">
                  <label htmlFor="name">Product Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    required
                  />
                </div>
                    
                <div className="form-group">
                  <label htmlFor="sku">SKU *</label>
                  <input
                    type="text"
                    id="sku"
                    value={productFormData.sku}
                    onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.length > 0 ? categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    )) : <option value="">Loading categories...</option>}
                  </select>
                </div>
                    
                <div className="form-group">
                  <label htmlFor="base_unit">Base Unit *</label>
                  <select
                    id="base_unit"
                    value={productFormData.base_unit}
                    onChange={(e) => setProductFormData({ ...productFormData, base_unit: e.target.value })}
                    required
                  >
                    <option value="">Select Base Unit</option>
                    {baseUnits.length > 0 ? baseUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.symbol})
                      </option>
                    )) : <option value="">Loading base units...</option>}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tax_class">Tax Class</label>
                  <select
                    id="tax_class"
                    value={productFormData.tax_class}
                    onChange={(e) => setProductFormData({ ...productFormData, tax_class: e.target.value })}
                  >
                    <option value="">No Tax</option>
                    {allTaxClasses.length > 0 ? allTaxClasses.map(taxClass => (
                      <option key={taxClass.id} value={taxClass.id}>
                        {taxClass.name} ({taxClass.tax_rate}%)
                      </option>
                    )) : <option value="">Loading tax classes...</option>}
                  </select>
                </div>

                {/* Standard Prices Section */}
                <div className="form-group full-width">
                  <h3>Standard Prices (MGA)</h3>
                  <p className="form-help">Set up to 5 different standard prices for this product. The first price is required.</p>
                </div>

                <div className="form-group">
                  <label htmlFor="standard_price_1">Standard Price 1 *</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="standard_price_1"
                      value={productFormData.standard_price_1}
                      onChange={(e) => setProductFormData({ ...productFormData, standard_price_1: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      placeholder="Required"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="standard_price_2">Standard Price 2</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="standard_price_2"
                      value={productFormData.standard_price_2 || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, standard_price_2: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="standard_price_3">Standard Price 3</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="standard_price_3"
                      value={productFormData.standard_price_3 || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, standard_price_3: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="standard_price_4">Standard Price 4</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="standard_price_4"
                      value={productFormData.standard_price_4 || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, standard_price_4: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="standard_price_5">Standard Price 5</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="standard_price_5"
                      value={productFormData.standard_price_5 || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, standard_price_5: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="wholesale_price">Wholesale Price (MGA)</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="wholesale_price"
                      value={productFormData.wholesale_price || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, wholesale_price: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="cost_price">Cost Price (MGA)</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="cost_price"
                      value={productFormData.cost_price}
                      onChange={(e) => setProductFormData({ ...productFormData, cost_price: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="stock_quantity">Stock Quantity</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="stock_quantity"
                      value={productFormData.stock_quantity}
                      onChange={(e) => setProductFormData({ ...productFormData, stock_quantity: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="min_stock_level">Min Stock Level</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      id="min_stock_level"
                      value={productFormData.min_stock_level}
                      onChange={(e) => setProductFormData({ ...productFormData, min_stock_level: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                    {currentDisplayUnit && (
                      <span className="unit-indicator">{getUnitIndicator()}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="max_stock_level">Max Stock Level</label>
                  <input
                    type="number"
                    id="max_stock_level"
                    value={productFormData.max_stock_level}
                    onChange={(e) => setProductFormData({ ...productFormData, max_stock_level: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Packaging Consignation Section */}
              <div className="form-section">
                <h3>Packaging Consignation</h3>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={productFormData.has_packaging}
                      onChange={(e) => setProductFormData({ ...productFormData, has_packaging: e.target.checked })}
                    />
                    <span className="checkmark"></span>
                    This product has packaging consignation (e.g., bottle deposit)
                  </label>
                </div>
                
                {productFormData.has_packaging && (
                  <div className="form-group">
                    <label htmlFor="packaging_price">Packaging Price (MGA)</label>
                    <input
                      type="number"
                      id="packaging_price"
                      value={productFormData.packaging_price}
                      onChange={(e) => setProductFormData({ ...productFormData, packaging_price: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="e.g., 500 for bottle deposit"
                    />
                  </div>
                )}
              </div>

              {/* Storage Section */}
              <div className="form-section">
                <h3>Storage Location</h3>
                <div className={`form-layout ${isMobile ? 'mobile' : 'desktop'}`}>
                  <div className="form-group">
                    <label htmlFor="storage_type">Storage Type</label>
                    <select
                      id="storage_type"
                      value={productFormData.storage_type}
                      onChange={(e) => setProductFormData({ ...productFormData, storage_type: e.target.value })}
                    >
                      <option value="STR">Front Storage (STR)</option>
                      <option value="SSO">Back Storage (SSO)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="storage_section">Storage Section Code</label>
                    <input
                      type="text"
                      id="storage_section"
                      value={productFormData.storage_section}
                      onChange={(e) => setProductFormData({ ...productFormData, storage_section: e.target.value.toUpperCase() })}
                      placeholder="e.g., A12, G11, K10, C33"
                      maxLength="10"
                    />
                  </div>
                </div>
              </div>

              {editingProduct && (
                <div className="compatible-units-section">
                  <div className="section-header">
                    <h3>Compatible Units</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="small"
                      onClick={() => setShowAddUnitModal(true)}
                    >
                      + Add Unit
                    </Button>
                  </div>

                  <div className="compatible-units-list">
                    {(compatibleUnits || []).map(compatibleUnit => (
                      <div key={compatibleUnit.id} className="compatible-unit-item">
                        <span className="unit-name">
                          {compatibleUnit.unit_name || compatibleUnit.unit?.name} 
                          ({compatibleUnit.unit_symbol || compatibleUnit.unit?.symbol})
                        </span>
                        <div className="unit-badges">
                          {compatibleUnit.is_default && (
                            <span className="base-badge">DEFAULT</span>
                          )}
                          {editingProduct && (compatibleUnit.unit || compatibleUnit.unit_id) === editingProduct.base_unit && (
                            <span className="base-unit-badge">BASE UNIT</span>
                          )}
                        </div>
                        <div className="unit-actions">
                          {!compatibleUnit.is_default && (
                            <>
                              <Button 
                                type="button"
                                variant="primary" 
                                size="small"
                                onClick={() => setDefaultUnit(compatibleUnit.id)}
                              >
                                Set Default
                              </Button>
                              {editingProduct && (
                                (() => {
                                  const unitId = compatibleUnit.unit?.id || compatibleUnit.unit_id;
                                  const baseUnitId = editingProduct.base_unit?.id || editingProduct.base_unit;
                                  return unitId !== baseUnitId;
                                })() && (
                                  <Button 
                                    type="button"
                                    variant="danger" 
                                    size="small"
                                    onClick={() => removeCompatibleUnit(compatibleUnit.id)}
                                  >
                                    Remove
                                  </Button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unit-Specific Pricing Section */}
              {editingProduct && compatibleUnits.length > 0 && (
                <div className="unit-pricing-section">
                  <div className="section-header">
                    <h3>Unit-Specific Pricing</h3>
                    <p className="form-help">Set specific prices for each compatible unit. These prices are used for wholesale sales only. For standard sales, compatible units use calculated prices from the base unit.</p>
                  </div>

                  <div className="unit-pricing-list">
                    {compatibleUnits.map(compatibleUnit => {
                      // Skip base unit - it's managed by standard prices list and wholesale price
                      if (compatibleUnit.is_default) {
                        return null;
                      }
                      
                      return (
                        <div key={compatibleUnit.id} className="unit-pricing-item">
                          <div className="unit-info">
                            <span className="unit-name">
                              {compatibleUnit.unit_name || compatibleUnit.unit?.name} 
                              ({compatibleUnit.unit_symbol || compatibleUnit.unit?.symbol})
                            </span>
                          </div>
                          
                          <div className="pricing-inputs">
                            <div className="price-input-group">
                              <label>Unit Price (MGA)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Set specific price for this unit"
                                value={compatibleUnit.wholesale_price || ''}
                                onChange={(e) => updateUnitSpecificPrice(compatibleUnit.id, 'wholesale_price', e.target.value)}
                              />
                              <small className="form-help">This price is used for wholesale sales only</small>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={productFormData.is_active}
                    onChange={(e) => setProductFormData({ ...productFormData, is_active: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Active
                </label>
              </div>

              <div className="form-actions">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowProductModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Update' : 'Create'} Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUnitModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add Compatible Unit</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddUnitModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="form-group">
              <label htmlFor="selectedUnit">Select Unit</label>
              <select
                id="selectedUnit"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              >
                <option value="">Select Unit</option>
                {availableUnits
                  .filter(unit => unit.is_active)
                  .filter(unit => !compatibleUnits.some(cu => cu.unit === unit.id))
                  .map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-actions">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddUnitModal(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={addCompatibleUnit}
                disabled={!selectedUnit}
              >
                Add Unit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;