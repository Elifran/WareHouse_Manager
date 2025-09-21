import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import PrintButton, { generatePrintContent } from '../components/PrintButton';
import './PointOfSale.css';

const PointOfSale = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [stockAvailability, setStockAvailability] = useState({});
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [tempQuantity, setTempQuantity] = useState('');
  const [selectedUnits, setSelectedUnits] = useState({}); // Track selected unit for each product

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    // Fetch stock availability for ALL products in bulk to improve performance
    if (products.length > 0) {
      fetchBulkStockAvailability();
    }
    
    // Set default selected units (default unit first, then base unit) for products with multiple compatible units
    const defaultUnits = {};
    products.forEach(product => {
      if (product.compatible_units && product.compatible_units.length > 1) {
        
        // First try to find the default unit (is_default: true)
        let selectedUnit = product.compatible_units.find(u => u.is_default);
        
        // If no default unit, fall back to base unit (is_base_unit: true)
        if (!selectedUnit) {
          selectedUnit = product.compatible_units.find(u => u.unit.is_base_unit);
        }
        
        // If still no unit found, use the first one
        if (!selectedUnit) {
          selectedUnit = product.compatible_units[0];
        }
        
        if (selectedUnit) {
          defaultUnits[product.id] = selectedUnit.unit;
        }
      }
    });
    setSelectedUnits(defaultUnits);
  }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBulkStockAvailability = async () => {
    try {
      const productIds = products.map(product => product.id);
      const response = await api.post('/products/bulk-stock-availability/', {
        product_ids: productIds
      });
      
      // Convert the response to the format expected by the existing code
      const stockData = {};
      Object.values(response.data).forEach(productStock => {
        stockData[productStock.product_id] = productStock.available_units;
      });
      
      
      
      setStockAvailability(stockData);
    } catch (err) {
      console.error('Bulk stock availability error:', err);
      // Fallback to individual calls if bulk fails
      products.forEach(product => {
        fetchStockAvailability(product.id);
      });
    }
  };

  const refreshStockAvailability = () => {
    // Use bulk fetch for better performance
    if (products.length > 0) {
      fetchBulkStockAvailability();
    }
  };


  const getUpdatedStockAvailability = (productId) => {
    // Get the base stock availability for this product
    const baseStockInfo = stockAvailability[productId];
    if (!baseStockInfo) {
      return null;
    }

    // Calculate total pieces already in cart for this product (convert all units to pieces)
    const totalPiecesInCart = cart
      .filter(item => item.id === productId)
      .reduce((total, item) => {
        // Find the unit info to get conversion factor
        const unitInfo = baseStockInfo.find(u => u.id === item.unit_id);
        if (unitInfo && unitInfo.conversion_factor) {
          // Convert to pieces: if 1 carton = 20 pieces, then quantity * 20
          return total + (item.quantity * unitInfo.conversion_factor);
        } else if (unitInfo && unitInfo.is_base_unit) {
          // If it's the base unit (pieces), no conversion needed
          return total + item.quantity;
        }
        return total;
      }, 0);

    // Calculate remaining pieces in base stock
    const baseUnit = baseStockInfo.find(u => u.is_base_unit);
    const totalBaseStock = baseUnit ? baseUnit.available_quantity : 0;
    const remainingPieces = Math.max(0, totalBaseStock - totalPiecesInCart);


    // Update each unit's available quantity based on remaining pieces
    return baseStockInfo.map(unit => {
      let availableQuantity = 0;
      let isAvailable = false;

      if (unit.is_base_unit) {
        // For base unit (pieces), use remaining pieces directly
        availableQuantity = remainingPieces;
        isAvailable = remainingPieces > 0;
      } else if (unit.conversion_factor) {
        // For other units, calculate how many can be made from remaining pieces
        // If 1 carton = 20 pieces, then remainingPieces / 20 = available cartons
        availableQuantity = Math.floor(remainingPieces / unit.conversion_factor);
        isAvailable = availableQuantity > 0;
      }

      return {
        ...unit,
        available_quantity: availableQuantity,
        is_available: isAvailable
      };
    });
  };

  const fetchProducts = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Always filter for active products
      params.append('is_active', 'true');
      
      // Add filters to params
      if (filterParams.category) params.append('category', filterParams.category);
      if (filterParams.search) params.append('search', filterParams.search);
      
      const url = `/products/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      const newProducts = response.data.results || response.data;
      
      setProducts(newProducts);
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

  const fetchStockAvailability = async (productId) => {
    try {
      const response = await api.get(`/products/${productId}/stock-availability/`);
      setStockAvailability(prev => ({
        ...prev,
        [productId]: response.data.available_units
      }));
    } catch (err) {
      console.error('Stock availability error:', err);
    }
  };

  const addToCart = (product, selectedUnit = null) => {
    
    // Use the first compatible unit if none selected
    const unit = selectedUnit || (product.compatible_units && product.compatible_units[0]) || { id: product.base_unit, name: 'Piece', symbol: 'piece' };
    
    // Check if stock availability data is loaded
    if (!stockAvailability[product.id]) {
      setError('Loading stock information... Please try again.');
      return;
    }
    
    // Check updated stock availability for the selected unit
    const updatedStockInfo = getUpdatedStockAvailability(product.id);
    const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
    
    
    if (!unitStockInfo) {
      setError(`Unit ${unit.name} not found in stock information`);
      return;
    }
    
    if (!unitStockInfo.is_available) {
      setError(`${unit.name} is out of stock`);
      return;
    }
    
    // Check if there's enough stock for the selected unit
    if (unitStockInfo.available_quantity <= 0) {
      setError(`No ${unit.name} stock left`);
      return;
    }
    
    const existingItem = cart.find(item => item.id === product.id && item.unit_id === unit.id);
    if (existingItem) {
      // Check if adding 1 more would exceed available quantity
      if (existingItem.quantity + 1 > unitStockInfo.available_quantity) {
        setError(`Not enough ${unit.name} available. Only ${unitStockInfo.available_quantity} left.`);
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id && item.unit_id === unit.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Check if adding 1 would exceed available quantity
      if (1 > unitStockInfo.available_quantity) {
        setError(`Not enough ${unit.name} available. Only ${unitStockInfo.available_quantity} left.`);
        return;
      }
      const newCartItem = {
        ...product,
        quantity: 1,
        unit_id: unit.id,
        unit_name: unit.name,
        unit_symbol: unit.symbol,
        unit_price: unit.price || product.price
      };
      setCart([...cart, newCartItem]);
    }
    setError('');
  };

  const updateQuantity = (productId, unitId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId)));
    } else {
      // Check updated stock availability for the selected unit
      const updatedStockInfo = getUpdatedStockAvailability(productId);
      const unitStockInfo = updatedStockInfo?.find(u => u.id === unitId);
      
      if (!unitStockInfo || !unitStockInfo.is_available) {
        setError(`Unit is out of stock`);
        return;
      }
      
      // For updateQuantity, we need to consider the current cart quantity
      const currentCartQuantity = cart
        .filter(item => item.id === productId && item.unit_id === unitId)
        .reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate how much we can add (available + what's already in cart)
      const maxAllowed = unitStockInfo.available_quantity + currentCartQuantity;
      
      if (quantity > maxAllowed) {
        setError(`Not enough stock available. Max: ${maxAllowed}`);
        return;
      }
      
      setCart(cart.map(item =>
        item.id === productId && item.unit_id === unitId
          ? { ...item, quantity }
          : item
      ));
      setError('');
    }
  };

  const removeFromCart = (productId, unitId) => {
    setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId)));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    let totalTax = 0;
    cart.forEach(item => {
      if (item.tax_rate && item.tax_rate > 0) {
        // For tax-inclusive pricing: tax = (price × tax_rate) / (100 + tax_rate)
        const itemTax = (item.quantity * item.unit_price * item.tax_rate) / (100 + item.tax_rate);
        totalTax += itemTax;
      }
    });
    return totalTax;
  };

  const calculateCost = () => {
    let totalCost = 0;
    cart.forEach(item => {
      if (item.tax_rate && item.tax_rate > 0) {
        // For tax-inclusive pricing: cost = (price × 100) / (100 + tax_rate)
        const itemCost = (item.quantity * item.unit_price * 100) / (100 + item.tax_rate);
        totalCost += itemCost;
      } else {
        // No tax, full price is cost
        totalCost += item.quantity * item.unit_price;
      }
    });
    return totalCost;
  };


  const autoPrintReceipt = async (saleNumber, saleData) => {
    try {
      // Create print content for the completed sale
      const printData = {
        sale_number: saleNumber,
        customer_name: customerInfo.name || 'Walk-in Customer',
        customer_phone: customerInfo.phone || '',
        customer_email: customerInfo.email || '',
        user_name: user?.username || 'Unknown User',
        user_id: user?.id || 'unknown',
        created_at: new Date().toISOString(),
        print_timestamp: new Date().toISOString(),
        print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'completed',
        total_amount: calculateSubtotal(),
        items: cart.map(item => ({
          product_name: item.name,
          product_sku: item.sku,
          quantity: item.quantity,
          unit_name: item.unit?.name || 'piece',
          unit_price: item.price,
          total_price: item.price * item.quantity
        }))
      };

      // Generate print content using the same logic as PrintButton
      const printContent = generatePrintContent(printData, 'Sale Receipt', 'sale');
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        // Close the window after a short delay
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };
      
    } catch (error) {
      console.error('Auto-print error:', error);
      // Don't show error to user as it's not critical
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const saleData = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product: item.id,
          quantity: item.quantity,
          unit: item.unit_id,
          unit_price: item.unit_price
        }))
      };

      // Create the sale
      const response = await api.post('/sales/', saleData);
      const saleId = response.data.id;
      const saleNumber = response.data.sale_number;
      
      try {
        // Complete the sale
        await api.post(`/sales/${saleId}/complete/`);
        
        // Auto-print the receipt after successful sale completion
        await autoPrintReceipt(saleNumber, response.data);
        
        // Clear cart and customer info
        setCart([]);
        setCustomerInfo({ name: '', phone: '', email: '' });
        
        // Wait a moment for the backend to process stock movements
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        // Refresh product data to update stock quantities
        await fetchProducts();
        
        // Wait another moment for stock availability to be updated
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds
        
        // Refresh stock availability for all products
        refreshStockAvailability();
        
        alert(`Sale completed successfully! Sale Number: ${saleNumber}`);
      } catch (completeError) {
        // Sale was created but completion failed
        console.error('Sale completion error:', completeError);
        setError(`Sale created (${saleNumber}) but completion failed: ${completeError.response?.data?.error || completeError.message}`);
        
        // Still clear the cart since the sale was created
        setCart([]);
        setCustomerInfo({ name: '', phone: '', email: '' });
        
        // Wait for backend to process any completed stock movements
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh data
        await fetchProducts();
        await new Promise(resolve => setTimeout(resolve, 500));
        refreshStockAvailability();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create sale');
      console.error('Sale creation error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setError('');
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    fetchProducts(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { category: '', search: '' };
    setFilters(clearedFilters);
    fetchProducts(clearedFilters);
  };

  const handleQuantityClick = (item) => {
    setEditingQuantity(`${item.id}-${item.unit_id}`);
    setTempQuantity(item.quantity.toString());
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and empty string
    if (value === '' || /^\d+$/.test(value)) {
      setTempQuantity(value);
    }
  };

  const handleQuantitySubmit = (item) => {
    const newQuantity = parseInt(tempQuantity);
    
    if (tempQuantity === '' || isNaN(newQuantity) || newQuantity < 0) {
      setError('Please enter a valid quantity');
      setEditingQuantity(null);
      return;
    }
    
    // Check updated stock availability for the selected unit
    const updatedStockInfo = getUpdatedStockAvailability(item.id);
    const unitStockInfo = updatedStockInfo?.find(u => u.id === item.unit_id);
    
    if (!unitStockInfo || !unitStockInfo.is_available) {
      setError(`Unit is out of stock`);
      setEditingQuantity(null);
      return;
    }
    
    // For handleQuantitySubmit, we need to consider the current cart quantity
    const currentCartQuantity = cart
      .filter(cartItem => cartItem.id === item.id && cartItem.unit_id === item.unit_id)
      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
    
    // Calculate how much we can add (available + what's already in cart)
    const maxAllowed = unitStockInfo.available_quantity + currentCartQuantity;
    
    if (newQuantity > maxAllowed) {
      setError(`Not enough stock available. Max: ${maxAllowed}`);
      setEditingQuantity(null);
      return;
    }
    
    if (newQuantity === 0) {
      // Remove item from cart if quantity is 0
      removeFromCart(item.id, item.unit_id);
    } else {
      updateQuantity(item.id, item.unit_id, newQuantity);
    }
    
    setEditingQuantity(null);
    setTempQuantity('');
    setError('');
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const handleQuantityKeyPress = (e, item) => {
    if (e.key === 'Enter') {
      handleQuantitySubmit(item);
    } else if (e.key === 'Escape') {
      handleQuantityCancel();
    }
  };

  const handleUnitSelection = (productId, unitId) => {
    setSelectedUnits(prev => ({
      ...prev,
      [productId]: unitId
    }));
  };

  const handleProductCardClick = (product) => {
    // Don't allow clicking on out-of-stock products
    if (product.stock_quantity <= 0) {
      return;
    }
    
    if (product.compatible_units && product.compatible_units.length > 1) {
      // For multi-unit products, add with the currently selected unit
      const selectedUnitId = selectedUnits[product.id];
      
      if (selectedUnitId) {
        const selectedCompatibleUnit = product.compatible_units.find(u => u.unit === selectedUnitId);
        
        if (selectedCompatibleUnit) {
          // Get the price for this unit from stock availability
          const updatedStockInfo = getUpdatedStockAvailability(product.id);
          const unitStockInfo = updatedStockInfo?.find(u => u.id === selectedCompatibleUnit.unit);
          const unitPrice = unitStockInfo?.price || product.price;
          
          // Convert compatible unit to the format expected by addToCart
          const selectedUnit = {
            id: selectedCompatibleUnit.unit,
            name: selectedCompatibleUnit.unit_name,
            symbol: selectedCompatibleUnit.unit_symbol,
            price: unitPrice
          };
          addToCart(product, selectedUnit);
        }
      }
    } else {
      // For single-unit products, add directly
      addToCart(product);
    }
  };

  if (loading) {
    return (
      <div className="pos">
        <div className="pos-loading">
          <div className="spinner"></div>
          <span>Loading products...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pos">
      <div className="pos-header">
        <h1>Point of Sale</h1>
        <div className="pos-user">
          <span>Cashier: {user?.username}</span>
        </div>
      </div>

      <div className="pos-content">
        {/* Product Grid */}
        <div className="pos-products">
          <h2>Products</h2>
          
          {/* Filters */}
          <div className="pos-filters">
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
                Clear
              </Button>
            </div>
          </div>

          <div className="products-info">
            <p className="products-count">
              {products.length} product{products.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="products-grid">
            {products.map(product => (
              <div
                key={product.id}
                className={`product-card ${product.stock_quantity <= 0 ? 'out-of-stock' : ''} clickable`}
                onClick={() => handleProductCardClick(product)}
              >
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-sku">{product.sku}</p>
                  <p className="product-price">
                    ${parseFloat(product.price).toFixed(2)}
                    {product.compatible_units && product.compatible_units.length > 1 && 
                      ` (base unit: ${product.compatible_units.find(u => u.unit.is_base_unit)?.unit.symbol || 'piece'})`
                    }
                  </p>
                  <p className="product-stock">
                    Stock: {product.stock_quantity} {product.unit}
                    {stockAvailability[product.id] && product.compatible_units && product.compatible_units.length > 1 && (
                      <span className="stock-details">
                        {(() => {
                          const updatedStockInfo = getUpdatedStockAvailability(product.id);
                          return product.compatible_units.map(compatibleUnit => {
                            const unitStockInfo = updatedStockInfo?.find(u => u.id === compatibleUnit.unit);
                            if (!unitStockInfo) return null;
                            
                            // Use unit info from stock availability if available, otherwise fallback to compatible unit
                            const unitName = unitStockInfo?.name || compatibleUnit.unit.name;
                            
                            return (
                              <span key={compatibleUnit.unit} className={`unit-stock ${unitStockInfo.is_available ? 'available' : 'unavailable'}`}>
                                {unitName}: {unitStockInfo.available_quantity}
                              </span>
                            );
                          }).filter(Boolean);
                        })()}
                      </span>
                    )}
                  </p>
                  
                  {/* Unit Selection - Only show for products with multiple compatible units */}
                  {product.compatible_units && product.compatible_units.length > 1 && (
                    <div className="unit-selection">
                      <label>Unit:</label>
                      <select 
                        className="unit-select"
                        value={selectedUnits[product.id] || ''}
                        onChange={(e) => {
                          const unitId = parseInt(e.target.value);
                          handleUnitSelection(product.id, unitId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Select Unit</option>
                        {product.compatible_units.map((compatibleUnit, index) => {
                          // Use updated stock availability that considers cart contents
                          const updatedStockInfo = getUpdatedStockAvailability(product.id);
                          const unitStockInfo = updatedStockInfo?.find(u => u.id === compatibleUnit.unit);
                          const isAvailable = unitStockInfo ? unitStockInfo.is_available : false;
                          const availableQty = unitStockInfo ? unitStockInfo.available_quantity : 0;
                          
                          // Use unit info from stock availability if available, otherwise fallback to compatible unit
                          const unitName = unitStockInfo?.name || compatibleUnit.unit.name;
                          const unitSymbol = unitStockInfo?.symbol || compatibleUnit.unit.symbol;
                          
                          
                          return (
                            <option 
                              key={compatibleUnit.unit} 
                              value={compatibleUnit.unit}
                              disabled={!isAvailable}
                            >
                              {unitName} ({unitSymbol}) - ${unitStockInfo?.price?.toFixed(2) || 'N/A'} 
                              {!isAvailable ? ' - OUT OF STOCK' : 
                               ` - ${availableQty} available`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  
                  {/* Add to Cart Button - Only show for single unit products */}
                  {(!product.compatible_units || product.compatible_units.length <= 1) && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => addToCart(product)}
                      disabled={(() => {
                        // Check if any unit has available stock
                        if (!stockAvailability[product.id]) {
                          return true; // Disable if stock data not loaded
                        }
                        
                        // For single unit products, check base stock
                        return product.stock_quantity <= 0;
                      })()}
                      className="add-to-cart-btn"
                    >
                      {(() => {
                        if (!stockAvailability[product.id]) {
                          return 'Loading...';
                        }
                        
                        return product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart';
                      })()}
                    </Button>
                  )}
                  
                  {/* For products with multiple units, show instruction */}
                  {product.available_units && product.available_units.length > 1 && (
                    <div className="unit-instruction">
                      <p>Click card or select unit to add to cart</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart and Checkout */}
        <div className="pos-cart">
          <div className="cart-header">
            <h2>Shopping Cart</h2>
            {cart.length > 0 && (
              <Button variant="outline" size="small" onClick={clearCart}>
                Clear Cart
              </Button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="empty-cart">Cart is empty</p>
            ) : (
              <>
                <div className="cart-table-header">
                  <div className="header-product">Product</div>
                  <div className="header-unit">Unit</div>
                  <div className="header-price">Price</div>
                  <div className="header-quantity">Qty</div>
                  <div className="header-total">Total</div>
                  <div className="header-actions">Actions</div>
                </div>
                {cart.map(item => (
                  <div key={`${item.id}-${item.unit_id}`} className="cart-item">
                    <div className="item-product">
                      <h4>{item.name}</h4>
                      <p className="item-sku">SKU: {item.sku}</p>
                    </div>
                    <div className="item-unit">
                      {item.unit_symbol || 'piece'}
                    </div>
                    <div className="item-price">
                      ${parseFloat(item.unit_price).toFixed(2)}
                    </div>
                    <div className="item-quantity">
                      <div className="quantity-controls">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.unit_id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        {editingQuantity === `${item.id}-${item.unit_id}` ? (
                          <div className="quantity-edit">
                            <input
                              type="number"
                              value={tempQuantity}
                              onChange={handleQuantityChange}
                              onKeyPress={(e) => handleQuantityKeyPress(e, item)}
                              onBlur={() => handleQuantitySubmit(item)}
                              className="quantity-input"
                              min="0"
                              max={item.stock_quantity}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span 
                            className="quantity clickable"
                            onClick={() => handleQuantityClick(item)}
                            title="Click to edit quantity"
                          >
                            {item.quantity}
                          </span>
                        )}
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.unit_id, item.quantity + 1)}
                          disabled={(() => {
                            const updatedStockInfo = getUpdatedStockAvailability(item.id);
                            const unitStockInfo = updatedStockInfo?.find(u => u.id === item.unit_id);
                            const currentCartQuantity = cart
                              .filter(cartItem => cartItem.id === item.id && cartItem.unit_id === item.unit_id)
                              .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
                            const maxAllowed = (unitStockInfo?.available_quantity || 0) + currentCartQuantity;
                            return item.quantity >= maxAllowed;
                          })()}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="item-total">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                    <div className="item-actions">
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => removeFromCart(item.id, item.unit_id)}
                        title="Remove item"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Total Amount:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row cost-breakdown">
                  <span>Cost (excl. tax):</span>
                  <span>${calculateCost().toFixed(2)}</span>
                </div>
                <div className="summary-row tax-breakdown">
                  <span>Tax included:</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="customer-info">
                <h3>Customer Information</h3>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Customer Name (Optional)"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="payment-section">
                <h3>Payment Method</h3>
                <div className="payment-methods">
                  {['cash', 'card', 'mobile_money', 'bank_transfer'].map(method => (
                    <label key={method} className="payment-method">
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      <span>{method.replace('_', ' ').toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="checkout-actions">
                <PrintButton
                  data={{
                    sale_number: `TEMP-${Date.now()}`,
                    customer_name: customerInfo.name || 'Walk-in Customer',
                    customer_phone: customerInfo.phone || '',
                    customer_email: customerInfo.email || '',
                    user_name: user?.username || 'Unknown User',
                    user_id: user?.id || 'unknown',
                    created_at: new Date().toISOString(),
                    print_timestamp: new Date().toISOString(),
                    print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    status: 'pending',
                    total_amount: calculateSubtotal(),
                    items: cart.map(item => ({
                      product_name: item.name,
                      product_sku: item.sku,
                      quantity: item.quantity,
                      unit_name: item.unit?.name || 'piece',
                      unit_price: item.price,
                      total_price: item.price * item.quantity
                    }))
                  }}
                  title="Sale Receipt"
                  type="sale"
                  printText="Print Receipt"
                  validateText="Validate Sale"
                  showValidateOption={true}
                  onValidate={handleCheckout}
                  disabled={cart.length === 0}
                  className="print-receipt-btn"
                />
                <Button
                  onClick={handleCheckout}
                  loading={processing}
                  className="validate-button"
                  size="large"
                  variant="primary"
                >
                  Validate Sale
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointOfSale;
