import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Button from './Button';
import './PackagingManager.css';

const PackagingManager = ({ saleId, onPackagingUpdate, onClose }) => {
  const { t } = useTranslation();
  const [packagingItems, setPackagingItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPackaging, setNewPackaging] = useState({
    product: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    status: 'consignation',
    customer_name: '',
    customer_phone: '',
    notes: ''
  });

  useEffect(() => {
    if (saleId) {
      fetchPackagingData();
    }
  }, [saleId]);

  const fetchPackagingData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/sales/${saleId}/packaging-validation/`);
      setPackagingItems(response.data.packaging_items || []);
      setAvailableProducts(response.data.available_products || []);
    } catch (err) {
      setError('Failed to load packaging data');
      console.error('Error fetching packaging data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPackaging = async () => {
    try {
      setError('');
      setSuccess('');

      if (!newPackaging.product || !newPackaging.quantity || !newPackaging.unit) {
        setError('Please fill in all required fields');
        return;
      }

      const packagingData = {
        packaging_items: [{
          product: parseInt(newPackaging.product),
          quantity: parseFloat(newPackaging.quantity),
          unit: parseInt(newPackaging.unit),
          unit_price: parseFloat(newPackaging.unit_price),
          status: newPackaging.status,
          customer_name: newPackaging.customer_name,
          customer_phone: newPackaging.customer_phone,
          notes: newPackaging.notes
        }]
      };

      await api.post(`/sales/${saleId}/add-packaging/`, packagingData);
      setSuccess('Packaging item added successfully');
      setNewPackaging({
        product: '',
        quantity: 1,
        unit: '',
        unit_price: 0,
        status: 'consignation',
        customer_name: '',
        customer_phone: '',
        notes: ''
      });
      setShowAddForm(false);
      fetchPackagingData();
      if (onPackagingUpdate) {
        onPackagingUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add packaging item');
      console.error('Error adding packaging:', err);
    }
  };

  const handleProductChange = (productId) => {
    const product = availableProducts.find(p => p.id === parseInt(productId));
    if (product) {
      setNewPackaging(prev => ({
        ...prev,
        product: productId,
        unit_price: product.packaging_price || 0
      }));
    }
  };

  const handleStatusChange = (packagingId, newStatus) => {
    setPackagingItems(prev => 
      prev.map(item => 
        item.id === packagingId 
          ? { ...item, status: newStatus }
          : item
      )
    );
  };

  const calculatePackagingTotal = () => {
    return packagingItems.reduce((total, item) => {
      return total + (parseFloat(item.total_price) || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="packaging-manager">
        <div className="loading">Loading packaging data...</div>
      </div>
    );
  }

  return (
    <div className="packaging-manager">
      <div className="packaging-header">
        <h3>Packaging Management</h3>
        <Button onClick={onClose} variant="secondary" size="small">
          Close
        </Button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="packaging-summary">
        <div className="summary-row">
          <span>Packaging Items:</span>
          <span>{packagingItems.length}</span>
        </div>
        <div className="summary-row">
          <span>Packaging Total:</span>
          <span>{calculatePackagingTotal().toFixed(2)} MGA</span>
        </div>
      </div>

      <div className="packaging-actions">
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          variant="primary"
          size="small"
        >
          {showAddForm ? 'Cancel' : 'Add Packaging'}
        </Button>
      </div>

      {showAddForm && (
        <div className="add-packaging-form">
          <h4>Add New Packaging Item</h4>
          <div className="form-group">
            <label>Product *</label>
            <select
              value={newPackaging.product}
              onChange={(e) => handleProductChange(e.target.value)}
              required
            >
              <option value="">Select Product</option>
              {availableProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.packaging_price} MGA
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={newPackaging.quantity}
              onChange={(e) => setNewPackaging(prev => ({ ...prev, quantity: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Unit *</label>
            <select
              value={newPackaging.unit}
              onChange={(e) => setNewPackaging(prev => ({ ...prev, unit: e.target.value }))}
              required
            >
              <option value="">Select Unit</option>
              <option value="1">Piece</option>
            </select>
          </div>

          <div className="form-group">
            <label>Unit Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newPackaging.unit_price}
              onChange={(e) => setNewPackaging(prev => ({ ...prev, unit_price: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={newPackaging.status}
              onChange={(e) => setNewPackaging(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="consignation">Consignation (Paid)</option>
              <option value="exchange">Exchange</option>
              <option value="due">Due (To be returned)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Customer Name</label>
            <input
              type="text"
              value={newPackaging.customer_name}
              onChange={(e) => setNewPackaging(prev => ({ ...prev, customer_name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Customer Phone</label>
            <input
              type="text"
              value={newPackaging.customer_phone}
              onChange={(e) => setNewPackaging(prev => ({ ...prev, customer_phone: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={newPackaging.notes}
              onChange={(e) => setNewPackaging(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
            />
          </div>

          <div className="form-actions">
            <Button onClick={handleAddPackaging} variant="primary">
              Add Packaging
            </Button>
            <Button onClick={() => setShowAddForm(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="packaging-items">
        <h4>Current Packaging Items</h4>
        {packagingItems.length === 0 ? (
          <div className="no-items">No packaging items for this sale</div>
        ) : (
          <div className="packaging-list">
            {packagingItems.map(item => (
              <div key={item.id} className="packaging-item">
                <div className="item-info">
                  <div className="item-name">{item.product_name}</div>
                  <div className="item-details">
                    {item.quantity} {item.unit_name} × {item.unit_price} MGA = {item.total_price} MGA
                  </div>
                  <div className="item-status">
                    Status: 
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    >
                      <option value="consignation">Consignation (Paid)</option>
                      <option value="exchange">Exchange</option>
                      <option value="due">Due (To be returned)</option>
                    </select>
                  </div>
                  {item.customer_name && (
                    <div className="customer-info">
                      Customer: {item.customer_name} {item.customer_phone && `(${item.customer_phone})`}
                    </div>
                  )}
                  {item.notes && (
                    <div className="item-notes">Notes: {item.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PackagingManager;
