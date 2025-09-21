import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Button from '../components/Button';
import './Inventory.css';

const Inventory = () => {
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
    is_active: true
  });
  const [allUnits, setAllUnits] = useState([]);
  const [allTaxClasses, setAllTaxClasses] = useState([]);
  const [compatibleUnits, setCompatibleUnits] = useState([]);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [availableUnits, setAvailableUnits] = useState([]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/products/');
      setProducts(response.data.results || response.data);
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
      const response = await api.get('/products/categories/');
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // Fetch units
  const fetchUnits = useCallback(async () => {
    try {
      let allUnitsData = [];
      let nextUrl = '/products/units/';
      
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
      
      setAllUnits(allUnitsData);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  }, []);

  // Fetch tax classes
  const fetchTaxClasses = useCallback(async () => {
    try {
      const response = await api.get('/products/tax-classes/');
      setAllTaxClasses(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching tax classes:', err);
    }
  }, []);

  // Fetch compatible units for a product
  const fetchCompatibleUnits = useCallback(async (productId) => {
    try {
      const response = await api.get(`/products/${productId}/compatible-units/`);
      setCompatibleUnits(response.data.compatible_units || []);
    } catch (err) {
      console.error('Error fetching compatible units:', err);
      setCompatibleUnits([]);
    }
  }, []);

  // Fetch available units for a product based on unit conversions
  const fetchAvailableUnits = useCallback(async (productId) => {
    try {
      const response = await api.get(`/products/${productId}/available-units/`);
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

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      name: '',
      sku: '',
      description: '',
      category: '',
      base_unit: '',
      price: '',
      cost_price: '',
      stock_quantity: '',
      min_stock_level: '',
      max_stock_level: '',
      tax_class: '',
      is_active: true
    });
    setCompatibleUnits([]);
    setShowProductModal(true);
  };

  const handleEditProduct = async (product) => {
    setEditingProduct(product);
    // Store original product data for conversion calculations
    setOriginalProductData({
      price: product.price,
      wholesale_price: product.wholesale_price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity,
      base_unit: product.base_unit
    });
    
    // Set initial form data with base unit values
    setProductFormData({
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      category: product.category || '',
      base_unit: product.base_unit || '',
      price: product.price || '',
      wholesale_price: product.wholesale_price || '',
      cost_price: product.cost_price || '',
      stock_quantity: product.stock_quantity || '',
      min_stock_level: product.min_stock_level || '',
      max_stock_level: product.max_stock_level || '',
      tax_class: product.tax_class || '',
      is_active: product.is_active !== false
    });
    
    if (product.id) {
      // Fetch compatible units first
      await fetchCompatibleUnits(product.id);
      await fetchAvailableUnits(product.id);
      
      // Get the compatible units data directly from the API
      try {
        const response = await api.get(`/products/${product.id}/compatible-units/`);
        const compatibleUnitsData = response.data.compatible_units || [];
        
        // Find the default unit and convert values if needed
        const defaultUnit = compatibleUnitsData.find(cu => cu.is_default);
        if (defaultUnit && defaultUnit.unit !== product.base_unit) {
          setCurrentDisplayUnit(defaultUnit.unit);
          setProductFormData(prev => ({
            ...prev,
            // All values are already in the correct unit (default unit), don't convert them
            price: product.price,
            wholesale_price: product.wholesale_price,
            cost_price: product.cost_price,
            stock_quantity: product.stock_quantity,
            min_stock_level: product.min_stock_level,
            max_stock_level: product.max_stock_level
          }));
        } else {
          // No default unit or default unit is the same as base unit
          setCurrentDisplayUnit(product.base_unit);
        }
      } catch (err) {
        console.error('Error fetching compatible units for conversion:', err);
        setCurrentDisplayUnit(product.base_unit);
      }
    }
    setShowProductModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...productFormData,
        price: parseFloat(productFormData.price) || 0,
        wholesale_price: productFormData.wholesale_price ? parseFloat(productFormData.wholesale_price) : null,
        cost_price: parseFloat(productFormData.cost_price) || 0,
        stock_quantity: parseInt(productFormData.stock_quantity) || 0,
        min_stock_level: parseInt(productFormData.min_stock_level) || 0,
        max_stock_level: parseInt(productFormData.max_stock_level) || 0,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}/`, data);
      } else {
        await api.post('/products/', data);
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
        await api.delete(`/products/${productId}/`);
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
      await api.post(`/products/${editingProduct.id}/units/`, {
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
      await api.delete(`/products/${editingProduct.id}/units/${productUnitId}/`);
      fetchCompatibleUnits(editingProduct.id);
      fetchAvailableUnits(editingProduct.id);
      } catch (err) {
        console.error('Error removing compatible unit:', err);
      }
    }
  };

  const setDefaultUnit = async (productUnitId) => {
    if (!editingProduct || !originalProductData) return;
    
    try {
      // First, get the unit details to calculate conversion
      const compatibleUnit = compatibleUnits.find(cu => cu.id === productUnitId);
      if (!compatibleUnit) return;

      // Update the default unit via API
      await api.patch(`/products/${editingProduct.id}/units/${productUnitId}/`, {
        is_default: true
      });

      // Get the new display unit
      const newDisplayUnitId = compatibleUnit.unit || compatibleUnit.unit_id;
      const currentDisplayUnitId = currentDisplayUnit;
      
      // If we're changing to the same unit, no conversion needed
      if (currentDisplayUnitId === newDisplayUnitId) {
        // Just refresh the compatible units
        fetchCompatibleUnits(editingProduct.id);
        fetchAvailableUnits(editingProduct.id);
        return;
      }
      
      // Calculate conversion factors from current display unit to new display unit
      const priceConversionFactor = await getPriceConversionFactor(currentDisplayUnitId, newDisplayUnitId);
      const quantityConversionFactor = await getQuantityConversionFactor(currentDisplayUnitId, newDisplayUnitId);
      
      // Update form data with converted values
      setProductFormData(prev => ({
        ...prev,
        // base_unit NEVER changes - it's the product's fundamental unit
        price: (parseFloat(prev.price) * priceConversionFactor).toFixed(2),
        wholesale_price: prev.wholesale_price ? (parseFloat(prev.wholesale_price) * priceConversionFactor).toFixed(2) : '',
        cost_price: (parseFloat(prev.cost_price) * priceConversionFactor).toFixed(2),
        stock_quantity: Math.round(parseFloat(prev.stock_quantity) * quantityConversionFactor),
        min_stock_level: Math.round(parseFloat(prev.min_stock_level || 0) * quantityConversionFactor),
        max_stock_level: Math.round(parseFloat(prev.max_stock_level || 0) * quantityConversionFactor)
      }));

      // Update current display unit
      setCurrentDisplayUnit(newDisplayUnitId);

      // Refresh compatible units
      fetchCompatibleUnits(editingProduct.id);
      fetchAvailableUnits(editingProduct.id);
      
    } catch (err) {
      console.error('Error setting default unit:', err);
    }
  };

  const getPriceConversionFactor = async (fromUnitId, toUnitId) => {
    try {
      // Use the price conversion factor API
      const response = await api.get(`/products/price-conversion-factor/?from_unit_id=${fromUnitId}&to_unit_id=${toUnitId}`);
      return parseFloat(response.data.conversion_factor);
    } catch (err) {
      console.error('Error getting price conversion factor:', err);
      return 1;
    }
  };

  const getQuantityConversionFactor = async (fromUnitId, toUnitId) => {
    try {
      // Use the quantity conversion factor API
      const response = await api.get(`/products/quantity-conversion-factor/?from_unit_id=${fromUnitId}&to_unit_id=${toUnitId}`);
      return parseFloat(response.data.conversion_factor);
    } catch (err) {
      console.error('Error getting quantity conversion factor:', err);
      return 1;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === parseInt(selectedCategory);
    const matchesStock = stockFilter === 'all' || 
      (stockFilter === 'low' && product.stock_quantity <= product.min_stock_level) ||
      (stockFilter === 'out' && product.stock_quantity === 0);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

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
        <h1>Inventory Management</h1>
        <Button onClick={handleAddProduct}>Add Product</Button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="inventory-filters">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
          <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select 
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="filter-select"
          >
          <option value="all">All Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              // Find the default unit from compatible units
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
                  <td>{product.price ? `MGA ${parseFloat(product.price).toFixed(2)}` : 'N/A'}</td>
                  <td>{product.stock_quantity || 0}</td>
                <td>
                  <span className={`status ${product.is_active ? 'active' : 'inactive'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
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
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showProductModal && (
    <div className="modal-overlay">
      <div className="modal inventory-modal">
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
          <div className="form-row">
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
          </div>

          <div className="form-row">
            <div className="form-group">
                  <label htmlFor="category">Category *</label>
              <select
                    id="category"
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
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
                    {allUnits.filter(unit => unit.is_base_unit).map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-row">
            <div className="form-group">
                  <label htmlFor="tax_class">Tax Class</label>
              <select
                    id="tax_class"
                    value={productFormData.tax_class}
                    onChange={(e) => setProductFormData({ ...productFormData, tax_class: e.target.value })}
                  >
                    <option value="">No Tax</option>
                    {allTaxClasses.map(taxClass => (
                  <option key={taxClass.id} value={taxClass.id}>
                    {taxClass.name} ({taxClass.tax_rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
                  <label htmlFor="price">Price (MGA) *</label>
              <input
                type="number"
                    id="price"
                    value={productFormData.price}
                    onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                    required
                    min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="wholesale_price">Wholesale Price (MGA)</label>
              <input
                type="number"
                id="wholesale_price"
                value={productFormData.wholesale_price || ''}
                onChange={(e) => setProductFormData({ ...productFormData, wholesale_price: e.target.value })}
                min="0"
                step="0.01"
                placeholder="Optional"
              />
            </div>

            <div className="form-group">
                  <label htmlFor="cost_price">Cost Price (MGA)</label>
              <input
                type="number"
                    id="cost_price"
                    value={productFormData.cost_price}
                    onChange={(e) => setProductFormData({ ...productFormData, cost_price: e.target.value })}
                    min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
                  <label htmlFor="stock_quantity">Stock Quantity</label>
              <input
                type="number"
                    id="stock_quantity"
                    value={productFormData.stock_quantity}
                    onChange={(e) => setProductFormData({ ...productFormData, stock_quantity: e.target.value })}
                    min="0"
              />
            </div>

            <div className="form-group">
                  <label htmlFor="min_stock_level">Min Stock Level</label>
              <input
                type="number"
                    id="min_stock_level"
                    value={productFormData.min_stock_level}
                    onChange={(e) => setProductFormData({ ...productFormData, min_stock_level: e.target.value })}
                    min="0"
                  />
          </div>

          <div className="form-group">
                  <label htmlFor="max_stock_level">Max Stock Level</label>
            <input
              type="number"
                    id="max_stock_level"
                    value={productFormData.max_stock_level}
                    onChange={(e) => setProductFormData({ ...productFormData, max_stock_level: e.target.value })}
                    min="0"
                  />
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
                      + Add Compatible Unit
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
                                Set as Default
                              </Button>
                              {editingProduct && (compatibleUnit.unit || compatibleUnit.unit_id) !== editingProduct.base_unit && (
                                <Button 
                                  type="button"
                                  variant="danger" 
                                  size="small"
                                  onClick={() => removeCompatibleUnit(compatibleUnit.id)}
                                >
                                  Remove
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
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