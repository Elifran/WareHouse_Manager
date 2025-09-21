import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Table from '../components/Table';
import Button from '../components/Button';
import PrintButton from '../components/PrintButton';
import './Inventory.css';

const Inventory = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxClasses, setTaxClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    stockStatus: '',
    search: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTaxClasses();
  }, []);

  const fetchProducts = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add filters to params
      if (filterParams.category) params.append('category', filterParams.category);
      if (filterParams.search) params.append('search', filterParams.search);
      if (filterParams.is_active !== undefined) params.append('is_active', filterParams.is_active);
      if (filterParams.stock_quantity !== undefined) params.append('stock_quantity', filterParams.stock_quantity);
      
      const url = `/products/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      let products = response.data.results || response.data;
      
      // Handle low stock filter on frontend since it's a calculated field
      if (filterParams.stockStatus === 'low') {
        products = products.filter(product => product.is_low_stock);
      }
      
      setProducts(products);
    } catch (err) {
      setError('Failed to load products');
      console.error('Products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories/');
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error('Categories error:', err);
    }
  };

  const fetchTaxClasses = async () => {
    try {
      const response = await api.get('/products/tax-classes/');
      setTaxClasses(response.data.results || response.data);
    } catch (err) {
      console.error('Tax classes error:', err);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const handleEditProduct = async (product) => {
    try {
      // Fetch full product details including cost_price and category ID
      const response = await api.get(`/products/${product.id}/`);
      setEditingProduct(response.data);
      setShowAddModal(true);
    } catch (err) {
      setError('Failed to load product details');
      console.error('Product details error:', err);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        await api.delete(`/products/${product.id}/`);
        fetchProducts(filters);
      } catch (err) {
        setError('Failed to delete product');
        console.error('Delete error:', err);
      }
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    // Convert stock status filter to API parameters
    const apiParams = { ...newFilters };
    if (newFilters.stockStatus === 'out') {
      // For out of stock, filter by stock_quantity = 0
      apiParams.stock_quantity = 0;
    }
    
    fetchProducts(apiParams);
  };

  const clearFilters = () => {
    const clearedFilters = { category: '', stockStatus: '', search: '' };
    setFilters(clearedFilters);
    fetchProducts(clearedFilters);
  };

  const columns = [
    {
      key: 'name',
      header: 'Product Name',
      render: (value, row) => (
        <div>
          <div className="product-name">{value}</div>
          <div className="product-sku">{row.sku}</div>
        </div>
      )
    },
    {
      key: 'category_name',
      header: 'Category'
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      render: (value, row) => (
        <div className={`stock-quantity ${row.is_low_stock ? 'low-stock' : ''} ${row.is_out_of_stock ? 'out-of-stock' : ''}`}>
          {/* Base unit stock */}
          <div className="base-stock">
          {value} {row.unit}
          {row.is_low_stock && <span className="stock-warning">Low</span>}
          {row.is_out_of_stock && <span className="stock-warning">Out</span>}
          </div>
          
          {/* Stock in other units */}
          {row.stock_in_units && row.stock_in_units.length > 1 && (
            <div className="stock-in-units">
              {row.stock_in_units
                .filter(stockUnit => !stockUnit.is_base_unit)
                .map(stockUnit => (
                  <div key={stockUnit.unit_id} className="unit-stock">
                    {stockUnit.quantity} {stockUnit.unit_symbol}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )
    },
    {
      key: 'price',
      header: 'Price',
      render: (value) => `$${parseFloat(value).toFixed(2)}`
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <Button
            size="small"
            variant="outline"
            onClick={() => handleEditProduct(row)}
          >
            Edit
          </Button>
          {user?.role === 'admin' && (
            <Button
              size="small"
              variant="danger"
              onClick={() => handleDeleteProduct(row)}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <div className="header-actions">
          <PrintButton
            data={{
              ...products,
              user_name: user?.username || 'Unknown User',
              user_id: user?.id || 'unknown',
              print_timestamp: new Date().toISOString(),
              print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }}
            title="Inventory Report"
            type="inventory"
            printText="Print Inventory"
            className="print-inventory-btn"
          />
        <Button onClick={handleAddProduct}>
          Add Product
        </Button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="inventory-filters">
        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={filters.category} 
            onChange={(e) => handleFilterChange('category', e.target.value)}
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
          <label>Stock Status:</label>
          <select 
            value={filters.stockStatus} 
            onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
          >
            <option value="">All</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Button variant="outline" size="small" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      <Table
        data={products}
        columns={columns}
        loading={loading}
        emptyMessage="No products found"
      />

      {showAddModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          taxClasses={taxClasses}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchProducts(filters);
          }}
        />
      )}
    </div>
  );
};

const ProductModal = ({ product, categories, taxClasses, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || '',
    tax_class: product?.tax_class || '',
    sku: product?.sku || '',
    price: product?.price || '',
    cost_price: product?.cost_price || '',
    stock_quantity: product?.stock_quantity || 0,
    min_stock_level: product?.min_stock_level || 10,
    max_stock_level: product?.max_stock_level || 1000,
    base_unit: product?.base_unit?.id || product?.base_unit || '',
    is_active: product?.is_active ?? true
  });
  const [units, setUnits] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [compatibleUnits, setCompatibleUnits] = useState([]);
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [convertibleUnits, setConvertibleUnits] = useState([]);
  const [selectedDisplayUnit, setSelectedDisplayUnit] = useState(null);
  const [unitConversions, setUnitConversions] = useState([]);
  const [baseValues, setBaseValues] = useState(null); // Store original base unit values

  // Function to get conversion factor between units
  const getConversionFactor = useCallback((fromUnitId, toUnitId) => {
    if (fromUnitId === toUnitId) return 1;
    
    // Look for direct conversion
    let conversion = unitConversions.find(conv => 
      (conv.from_unit === fromUnitId && conv.to_unit === toUnitId)
    );
    
    if (conversion) {
      console.log('Found direct conversion:', conversion);
      return conversion.conversion_factor;
    }
    
    // Look for reverse conversion
    conversion = unitConversions.find(conv => 
      (conv.from_unit === toUnitId && conv.to_unit === fromUnitId)
    );
    
    if (conversion) {
      console.log('Found reverse conversion:', conversion);
      return 1 / conversion.conversion_factor;
    }
    
    console.log('No conversion found between', fromUnitId, 'and', toUnitId);
    console.log('Available conversions:', unitConversions.map(c => `${c.from_unit}->${c.to_unit}: ${c.conversion_factor}`));
    return null;
  }, [unitConversions]);

  // Function to convert quantity from base unit to display unit
  const convertQuantity = useCallback((baseQuantity, baseUnitId, displayUnitId) => {
    const factor = getConversionFactor(baseUnitId, displayUnitId);
    return factor ? baseQuantity / factor : baseQuantity;
  }, [getConversionFactor]);

  // Function to convert price from base unit to display unit
  const convertPrice = useCallback((basePrice, baseUnitId, displayUnitId) => {
    const factor = getConversionFactor(baseUnitId, displayUnitId);
    return factor ? basePrice * factor : basePrice;
  }, [getConversionFactor]);

  // Load base units when component mounts (for product creation/editing)
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        console.log('=== FETCHING UNITS ===');
        
        // Fetch base units
        const baseUnitsResponse = await api.get('/products/base-units/');
        console.log('Base units response:', baseUnitsResponse.data);
        const baseUnits = baseUnitsResponse.data.results || baseUnitsResponse.data;
        setUnits(baseUnits);
        console.log('Setting base units:', baseUnits);
        
        // Fetch ALL units with pagination
        let allUnitsData = [];
        let nextUrl = '/products/units/';
        while (nextUrl) {
          const response = await api.get(nextUrl);
          const data = response.data;
          allUnitsData = allUnitsData.concat(data.results || data);
          nextUrl = data.next;
          console.log('Fetched page, total units so far:', allUnitsData.length);
        }
        
        console.log('All units fetched:', allUnitsData);
        setAllUnits(allUnitsData);
        
        // Handle pagination for conversions
        let allConversions = [];
        nextUrl = '/products/unit-conversions/';
        while (nextUrl) {
          const response = await api.get(nextUrl);
          const data = response.data;
          allConversions = allConversions.concat(data.results || data);
          nextUrl = data.next;
        }
        console.log('Setting unit conversions:', allConversions);
        setUnitConversions(allConversions);
        console.log('=== UNITS LOADED ===');
      } catch (err) {
        console.error('Failed to load units:', err);
      }
    };
    fetchUnits();
  }, []);

  // Load compatible units when editing a product
  useEffect(() => {
    if (product && product.compatible_units) {
      setCompatibleUnits(product.compatible_units);
      
      // Store the original base values
      setBaseValues({
        price: parseFloat(product.price || 0),
        cost_price: parseFloat(product.cost_price || 0),
        stock_quantity: parseFloat(product.stock_quantity || 0),
        min_stock_level: parseFloat(product.min_stock_level || 0),
        max_stock_level: parseFloat(product.max_stock_level || 0)
      });
    } else {
      setCompatibleUnits([]);
      setBaseValues(null);
    }
  }, [product]);

  // Set default display unit when base unit changes or product loads
  useEffect(() => {
    if (formData.base_unit && allUnits.length > 0 && compatibleUnits.length > 0) {
      // Find the default compatible unit
      const defaultCompatibleUnit = compatibleUnits.find(cu => cu.is_default);
      let displayUnit;
      
      if (defaultCompatibleUnit) {
        // Use the default compatible unit
        displayUnit = allUnits.find(unit => unit.id === defaultCompatibleUnit.unit);
        console.log('Setting display unit to default compatible unit:', displayUnit);
      } else {
        // Fallback to base unit
        displayUnit = allUnits.find(unit => unit.id === parseInt(formData.base_unit));
        console.log('Setting display unit to base unit:', displayUnit);
      }
      
      if (displayUnit) {
        setSelectedDisplayUnit(displayUnit);
        
        // Convert values if not using base unit
        if (baseValues && displayUnit.id !== parseInt(formData.base_unit)) {
          const baseUnitId = parseInt(formData.base_unit);
          const displayUnitId = displayUnit.id;
          
          // Convert quantities and prices from base values
          const convertedStock = convertQuantity(
            baseValues.stock_quantity, 
            baseUnitId, 
            displayUnitId
          );
          const convertedMinStock = convertQuantity(
            baseValues.min_stock_level, 
            baseUnitId, 
            displayUnitId
          );
          const convertedMaxStock = convertQuantity(
            baseValues.max_stock_level, 
            baseUnitId, 
            displayUnitId
          );
          
          const convertedPrice = convertPrice(
            baseValues.price, 
            baseUnitId, 
            displayUnitId
          );
          const convertedCostPrice = convertPrice(
            baseValues.cost_price, 
            baseUnitId, 
            displayUnitId
          );
          
          // Update form data with converted values
          setFormData(prev => ({
            ...prev,
            stock_quantity: convertedStock.toFixed(2),
            min_stock_level: convertedMinStock.toFixed(2),
            max_stock_level: convertedMaxStock.toFixed(2),
            price: convertedPrice.toFixed(2),
            cost_price: convertedCostPrice.toFixed(2)
          }));
        }
      }
    }
  }, [formData.base_unit, allUnits, compatibleUnits, baseValues, convertPrice, convertQuantity]);

  // Debug: Monitor formData changes
  useEffect(() => {
    console.log('FormData changed:', formData);
  }, [formData]);

  // Debug: Monitor allUnits changes
  useEffect(() => {
    console.log('AllUnits changed:', allUnits);
  }, [allUnits]);

  // Debug: Monitor units changes
  useEffect(() => {
    console.log('Units changed:', units);
  }, [units]);

  // Fetch convertible units when base unit changes
  useEffect(() => {
    const fetchConvertibleUnits = async () => {
      if (formData.base_unit) {
        try {
          // Use a unified approach for both new and existing products
          // Get all unit conversions and find units that can be converted to/from the base unit
          // Handle pagination to get all conversions
          let allConversions = [];
          let nextUrl = '/products/unit-conversions/';
          
          while (nextUrl) {
            const response = await api.get(nextUrl);
            const data = response.data;
            allConversions = allConversions.concat(data.results || data);
            nextUrl = data.next; // Next page URL
          }
          
          const conversions = allConversions;
          
          const baseUnitId = parseInt(formData.base_unit);
          const convertible = [];
          
          // Find units that have conversions with the base unit
          conversions.forEach(conversion => {
            if (conversion.from_unit === baseUnitId && !convertible.find(u => u.id === conversion.to_unit)) {
              // Find the unit details
              const unit = allUnits.find(u => u.id === conversion.to_unit);
              if (unit) {
                convertible.push({
                  id: unit.id,
                  name: unit.name,
                  symbol: unit.symbol,
                  is_base_unit: unit.is_base_unit
                });
              }
            } else if (conversion.to_unit === baseUnitId && !convertible.find(u => u.id === conversion.from_unit)) {
              // Find the unit details
              const unit = allUnits.find(u => u.id === conversion.from_unit);
              if (unit) {
                convertible.push({
                  id: unit.id,
                  name: unit.name,
                  symbol: unit.symbol,
                  is_base_unit: unit.is_base_unit
                });
              }
            }
          });
          
          setConvertibleUnits(convertible);
        } catch (err) {
          console.error('Failed to fetch convertible units:', err);
          setConvertibleUnits([]);
        }
      } else {
        setConvertibleUnits([]);
      }
    };

    fetchConvertibleUnits();
  }, [formData.base_unit, allUnits]);

  // Update form data when product changes (for editing)
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        tax_class: product.tax_class || '',
        sku: product.sku || '',
        price: product.price || '',
        cost_price: product.cost_price || '',
        stock_quantity: product.stock_quantity || 0,
        min_stock_level: product.min_stock_level || 10,
        max_stock_level: product.max_stock_level || 1000,
        base_unit: product.base_unit?.id || product.base_unit || '',
        is_active: product.is_active ?? true
      });
    }
  }, [product]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  // Function to convert values back to base unit for saving
  const convertToBaseUnit = useCallback((displayValue, displayUnitId, baseUnitId) => {
    const factor = getConversionFactor(displayUnitId, baseUnitId);
    const result = factor ? displayValue / factor : displayValue;
    console.log(`Converting ${displayValue} from unit ${displayUnitId} to unit ${baseUnitId}: factor=${factor}, result=${result}`);
    return result;
  }, [getConversionFactor]);

  // Function to get available units for display (base unit + compatible units)
  const getAvailableDisplayUnits = () => {
    if (!formData.base_unit || allUnits.length === 0) {
      console.log('No base unit or allUnits empty', {
        hasBaseUnit: !!formData.base_unit,
        baseUnit: formData.base_unit,
        allUnitsLength: allUnits.length,
        allUnits: allUnits
      });
      return [];
    }
    
    const baseUnit = allUnits.find(unit => unit.id === parseInt(formData.base_unit));
    if (!baseUnit) {
      console.log('Base unit not found:', formData.base_unit);
      return [];
    }
    
    console.log('Base unit found:', baseUnit);
    console.log('Compatible units:', compatibleUnits);
    console.log('Unit conversions:', unitConversions.length);
    
    const availableUnits = [baseUnit]; // Base unit is always first
    
    // Add compatible units that have conversions
    compatibleUnits.forEach(cu => {
      const unit = allUnits.find(u => u.id === cu.unit);
      if (unit && unit.id !== baseUnit.id) { // Don't add base unit again
        // Check if there's a conversion between base unit and this unit
        const hasConversion = unitConversions.some(conv => 
          (conv.from_unit === baseUnit.id && conv.to_unit === unit.id) ||
          (conv.to_unit === baseUnit.id && conv.from_unit === unit.id)
        );
        if (hasConversion) {
          availableUnits.push(unit);
          console.log('Added compatible unit:', unit);
        } else {
          console.log('No conversion found for unit:', unit);
        }
      }
    });
    
    console.log('Available display units:', availableUnits);
    return availableUnits;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleDisplayUnitChange = (unitId) => {
    const unit = allUnits.find(u => u.id === parseInt(unitId));
    setSelectedDisplayUnit(unit);
    
    console.log('=== DISPLAY UNIT CHANGE ===');
    console.log('Selected unit:', unit);
    console.log('Current formData:', formData);
    
    // Update form data to show converted values
    if (unit && formData.base_unit && baseValues) {
      const baseUnitId = parseInt(formData.base_unit);
      const displayUnitId = unit.id;
      
      console.log('Converting from base unit', baseUnitId, 'to display unit', displayUnitId);
      console.log('Base values:', baseValues);
      
      // Convert quantities from base values
      const convertedStock = convertQuantity(
        baseValues.stock_quantity, 
        baseUnitId, 
        displayUnitId
      );
      const convertedMinStock = convertQuantity(
        baseValues.min_stock_level, 
        baseUnitId, 
        displayUnitId
      );
      const convertedMaxStock = convertQuantity(
        baseValues.max_stock_level, 
        baseUnitId, 
        displayUnitId
      );
      
      // Convert prices from base values
      const convertedPrice = convertPrice(
        baseValues.price, 
        baseUnitId, 
        displayUnitId
      );
      const convertedCostPrice = convertPrice(
        baseValues.cost_price, 
        baseUnitId, 
        displayUnitId
      );
      
      console.log('Converted values:', {
        stock: convertedStock,
        price: convertedPrice,
        minStock: convertedMinStock,
        maxStock: convertedMaxStock
      });
      
      // Update form data with converted values
      const newFormData = {
        ...formData,
        stock_quantity: convertedStock.toFixed(2),
        min_stock_level: convertedMinStock.toFixed(2),
        max_stock_level: convertedMaxStock.toFixed(2),
        price: convertedPrice.toFixed(2),
        cost_price: convertedCostPrice.toFixed(2)
      };
      
      console.log('New formData:', newFormData);
      setFormData(newFormData);
      console.log('=== END DISPLAY UNIT CHANGE ===');
    }
  };

  const addCompatibleUnit = async (unitId) => {
    if (!product) return;
    
    // Check if the unit is already the base unit
    if (parseInt(unitId) === parseInt(formData.base_unit)) {
      alert('Cannot add the base unit as a compatible unit.');
      return;
    }
    
    // Check if the unit is already added
    const alreadyAdded = compatibleUnits.some(cu => cu.unit === parseInt(unitId));
    if (alreadyAdded) {
      alert('This unit is already added as a compatible unit.');
      return;
    }
    
    try {
      const response = await api.post(`/products/${product.id}/units/`, {
        unit: parseInt(unitId),
        is_default: false,
        is_active: true
      });
      
      setCompatibleUnits([...compatibleUnits, response.data]);
      setShowUnitSelector(false);
    } catch (err) {
      console.error('Failed to add compatible unit:', err);
      alert(`Failed to add compatible unit: ${err.response?.data?.detail || err.message}`);
    }
  };

  const removeCompatibleUnit = async (productUnitId) => {
    if (!product) return;
    
    try {
      await api.delete(`/products/${product.id}/units/${productUnitId}/`);
      setCompatibleUnits(compatibleUnits.filter(cu => cu.id !== productUnitId));
    } catch (err) {
      console.error('Failed to remove compatible unit:', err);
    }
  };

  const setDefaultUnit = async (productUnitId) => {
    if (!product) return;
    
    try {
      // First, set all units to non-default
      for (const cu of compatibleUnits) {
        if (cu.is_default) {
          await api.put(`/products/${product.id}/units/${cu.id}/`, {
            ...cu,
            is_default: false
          });
        }
      }
      
      // Then set the selected unit as default
      const unitToUpdate = compatibleUnits.find(cu => cu.id === productUnitId);
      if (unitToUpdate) {
        await api.put(`/products/${product.id}/units/${productUnitId}/`, {
          ...unitToUpdate,
          is_default: true
        });
        
        // Update local state
        setCompatibleUnits(compatibleUnits.map(cu => ({
          ...cu,
          is_default: cu.id === productUnitId
        })));
        
        // Auto-change display unit to the new default unit
        const newDefaultUnit = compatibleUnits.find(cu => cu.id === productUnitId);
        if (newDefaultUnit && allUnits.length > 0) {
          const displayUnit = allUnits.find(u => u.id === newDefaultUnit.unit);
          if (displayUnit) {
            console.log('Auto-changing display unit to new default:', displayUnit);
            setSelectedDisplayUnit(displayUnit);
            
            // Also update the form data to show converted values
            const baseUnitId = parseInt(formData.base_unit);
            const displayUnitId = displayUnit.id;
            
            // Use base values instead of current form values to avoid accumulation
            if (baseValues) {
              // Convert quantities and prices from base values
              const convertedStock = convertQuantity(
                baseValues.stock_quantity, 
                baseUnitId, 
                displayUnitId
              );
              const convertedMinStock = convertQuantity(
                baseValues.min_stock_level, 
                baseUnitId, 
                displayUnitId
              );
              const convertedMaxStock = convertQuantity(
                baseValues.max_stock_level, 
                baseUnitId, 
                displayUnitId
              );
              
              const convertedPrice = convertPrice(
                baseValues.price, 
                baseUnitId, 
                displayUnitId
              );
              const convertedCostPrice = convertPrice(
                baseValues.cost_price, 
                baseUnitId, 
                displayUnitId
              );
            
              // Update form data with converted values
              setFormData(prev => ({
                ...prev,
                stock_quantity: convertedStock.toFixed(2),
                min_stock_level: convertedMinStock.toFixed(2),
                max_stock_level: convertedMaxStock.toFixed(2),
                price: convertedPrice.toFixed(2),
                cost_price: convertedCostPrice.toFixed(2)
              }));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to set default unit:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert values back to base unit if a display unit is selected
      let finalFormData = { ...formData };
      
      if (selectedDisplayUnit && selectedDisplayUnit.id !== parseInt(formData.base_unit)) {
        const baseUnitId = parseInt(formData.base_unit);
        const displayUnitId = selectedDisplayUnit.id;
        
        // Convert back to base unit
        finalFormData = {
          ...formData,
          stock_quantity: Math.round(convertToBaseUnit(
            parseFloat(formData.stock_quantity || 0), 
            displayUnitId, 
            baseUnitId
          )).toString(),
          min_stock_level: Math.round(convertToBaseUnit(
            parseFloat(formData.min_stock_level || 0), 
            displayUnitId, 
            baseUnitId
          )).toString(),
          max_stock_level: Math.round(convertToBaseUnit(
            parseFloat(formData.max_stock_level || 0), 
            displayUnitId, 
            baseUnitId
          )).toString(),
          price: convertToBaseUnit(
            parseFloat(formData.price || 0), 
            displayUnitId, 
            baseUnitId
          ).toString(),
          cost_price: convertToBaseUnit(
            parseFloat(formData.cost_price || 0), 
            displayUnitId, 
            baseUnitId
          ).toString()
        };
      }

      // Prepare data for submission
      const submitData = {
        ...finalFormData,
        base_unit: finalFormData.base_unit ? parseInt(finalFormData.base_unit) : null
      };

      console.log('Submitting data:', submitData);
      console.log('Original form data:', formData);
      console.log('Selected display unit:', selectedDisplayUnit);
      console.log('Base values:', baseValues);

      if (product) {
        await api.put(`/products/${product.id}/`, submitData);
      } else {
        await api.post('/products/', submitData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save product');
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'Add Product'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>SKU *</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
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
              <label>Tax Class</label>
              <select
                name="tax_class"
                value={formData.tax_class}
                onChange={handleChange}
              >
                <option value="">No Tax Class</option>
                {taxClasses.map(taxClass => (
                  <option key={taxClass.id} value={taxClass.id}>
                    {taxClass.name} ({taxClass.tax_rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Base Unit</label>
              <select
                name="base_unit"
                value={formData.base_unit}
                onChange={handleChange}
                required
              >
                <option value="">Select Base Unit</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Display Unit Selector - TEMPORARILY ALWAYS SHOW FOR DEBUGGING */}
            {formData.base_unit && (
              <div className="form-group">
                <label>Display Unit</label>
                <select
                  value={selectedDisplayUnit?.id || ''}
                  onChange={(e) => handleDisplayUnitChange(e.target.value)}
                >
                  {getAvailableDisplayUnits().map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  Select a unit to view quantities and prices in that unit
                </small>
              </div>
            )}
          </div>

          {/* Compatible Units Section - Only show when editing existing product */}
          {product && (
            <div className="form-row">
              <div className="form-group">
                <label>Compatible Units</label>
                <p className="compatible-units-note">
                  Only units that can be converted to/from the base unit can be added as compatible units.
                </p>
                <div className="compatible-units-section">
                  {compatibleUnits.length > 0 ? (
                    <div className="compatible-units-list">
                      {compatibleUnits.map(compatibleUnit => (
                        <div key={compatibleUnit.id} className="compatible-unit-item">
                          <div className="unit-info">
                            <span className="unit-name">
                              {compatibleUnit.unit_name} ({compatibleUnit.unit_symbol})
                            </span>
                            {compatibleUnit.is_default && (
                              <span className="default-badge">Default</span>
                            )}
                          </div>
                          <div className="unit-actions">
                            {!compatibleUnit.is_default && (
                              <Button
                                size="small"
                                variant="outline"
                                onClick={() => setDefaultUnit(compatibleUnit.id)}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="danger"
                              onClick={() => removeCompatibleUnit(compatibleUnit.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-units-message">No compatible units added yet.</p>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUnitSelector(true)}
                    className="add-unit-button"
                    disabled={!formData.base_unit || convertibleUnits.filter(unit => {
                      const isAlreadyAdded = compatibleUnits.some(cu => cu.unit === unit.id);
                      const isBaseUnit = unit.id === parseInt(formData.base_unit);
                      return !isAlreadyAdded && !isBaseUnit;
                    }).length === 0}
                  >
                    + Add Compatible Unit
                    {!formData.base_unit && " (Select base unit first)"}
                    {formData.base_unit && convertibleUnits.filter(unit => {
                      const isAlreadyAdded = compatibleUnits.some(cu => cu.unit === unit.id);
                      const isBaseUnit = unit.id === parseInt(formData.base_unit);
                      return !isAlreadyAdded && !isBaseUnit;
                    }).length === 0 && " (No convertible units)"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Price * {selectedDisplayUnit && selectedDisplayUnit.id !== parseInt(formData.base_unit) && `(per ${selectedDisplayUnit.name})`}</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Cost Price {selectedDisplayUnit && selectedDisplayUnit.id !== parseInt(formData.base_unit) && `(per ${selectedDisplayUnit.name})`}</label>
              <input
                type="number"
                step="0.01"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Stock Quantity {selectedDisplayUnit && selectedDisplayUnit.id !== parseInt(formData.base_unit) && `(${selectedDisplayUnit.name})`}</label>
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Min Stock Level {selectedDisplayUnit && selectedDisplayUnit.id !== parseInt(formData.base_unit) && `(${selectedDisplayUnit.name})`}</label>
              <input
                type="number"
                name="min_stock_level"
                value={formData.min_stock_level}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Max Stock Level {selectedDisplayUnit && selectedDisplayUnit.id !== parseInt(formData.base_unit) && `(${selectedDisplayUnit.name})`}</label>
            <input
              type="number"
              name="max_stock_level"
              value={formData.max_stock_level}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              Active
            </label>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {product ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>

      {/* Unit Selector Modal */}
      {showUnitSelector && (
        <div className="modal-overlay">
          <div className="modal-content unit-selector-modal">
            <div className="modal-header">
              <h3>Add Compatible Unit</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowUnitSelector(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Select a unit to add as compatible for this product:</p>
              <p className="unit-selector-note">
                Only units that can be converted to/from the base unit are shown.
              </p>
              <div className="unit-selector-list">
                {convertibleUnits
                  .filter(unit => {
                    const isAlreadyAdded = compatibleUnits.some(cu => cu.unit === unit.id);
                    const isBaseUnit = unit.id === parseInt(formData.base_unit);
                    return !isAlreadyAdded && !isBaseUnit;
                  })
                  .map(unit => (
                    <div 
                      key={unit.id} 
                      className="unit-selector-item"
                      onClick={() => addCompatibleUnit(unit.id)}
                    >
                      <div className="unit-info">
                        <span className="unit-name">{unit.name}</span>
                        <span className="unit-symbol">({unit.symbol})</span>
                        {unit.is_base_unit && (
                          <span className="base-unit-badge">Base Unit</span>
                        )}
                      </div>
                    </div>
                  ))
                }
                {convertibleUnits.filter(unit => 
                  !compatibleUnits.some(cu => cu.unit === unit.id) && unit.id !== parseInt(formData.base_unit)
                ).length === 0 && (
                  <p className="no-units-available">
                    {formData.base_unit 
                      ? "No convertible units available for the selected base unit." 
                      : "Please select a base unit first."
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowUnitSelector(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
