import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import './PointOfSale.css';

const PointOfSale = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products/?is_active=true');
      setProducts(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load products');
      console.error('Products error:', err);
    } finally {
      setLoading(false);
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
    return calculateSubtotal() * 0.18; // 18% tax
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
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>${parseFloat(item.unit_price).toFixed(2)} each</p>
                  </div>
                  <div className="item-controls">
                    <Button
                      size="small"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="quantity">{item.quantity}</span>
                    <Button
                      size="small"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock_quantity}
                    >
                      +
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => removeFromCart(item.id)}
                    >
                      ×
                    </Button>
                  </div>
                  <div className="item-total">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (18%):</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
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
