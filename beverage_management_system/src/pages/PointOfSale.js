import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
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
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [tempQuantity, setTempQuantity] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

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
      setProducts(response.data.results || response.data);
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

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      setError('Product is out of stock');
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        setError('Not enough stock available');
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        ...product,
        quantity: 1,
        unit_price: product.price
      }]);
    }
    setError('');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
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

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
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
          unit_price: item.unit_price
        }))
      };

      const response = await api.post('/sales/', saleData);
      
      // Complete the sale
      await api.post(`/sales/${response.data.id}/complete/`);
      
      // Clear cart and customer info
      setCart([]);
      setCustomerInfo({ name: '', phone: '', email: '' });
      
      alert(`Sale completed successfully! Sale Number: ${response.data.sale_number}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process sale');
      console.error('Checkout error:', err);
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
    setEditingQuantity(item.id);
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
    
    if (newQuantity > item.stock_quantity) {
      setError(`Not enough stock available. Max: ${item.stock_quantity}`);
      setEditingQuantity(null);
      return;
    }
    
    if (newQuantity === 0) {
      // Remove item from cart if quantity is 0
      removeFromCart(item.id);
    } else {
      updateQuantity(item.id, newQuantity);
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
                className={`product-card ${product.stock_quantity <= 0 ? 'out-of-stock' : ''}`}
                onClick={() => addToCart(product)}
              >
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-sku">{product.sku}</p>
                  <p className="product-price">${parseFloat(product.price).toFixed(2)}</p>
                  <p className="product-stock">
                    Stock: {product.stock_quantity} {product.unit}
                  </p>
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
                  <div className="header-price">Price</div>
                  <div className="header-quantity">Qty</div>
                  <div className="header-total">Total</div>
                  <div className="header-actions">Actions</div>
                </div>
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="item-product">
                      <h4>{item.name}</h4>
                      <p className="item-sku">SKU: {item.sku}</p>
                    </div>
                    <div className="item-price">
                      ${parseFloat(item.unit_price).toFixed(2)}
                    </div>
                    <div className="item-quantity">
                      <div className="quantity-controls">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        {editingQuantity === item.id ? (
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
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock_quantity}
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
                        onClick={() => removeFromCart(item.id)}
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

              <Button
                onClick={handleCheckout}
                loading={processing}
                className="checkout-button"
                size="large"
              >
                Complete Sale
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointOfSale;
