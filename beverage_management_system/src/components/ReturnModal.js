import React, { useState, useEffect } from 'react';
import './ReturnModal.css';

const ReturnModal = ({ isOpen, onClose, onSave, sale, saleItems }) => {
  const [returnData, setReturnData] = useState({
    sale_type: 'return',
    original_sale: null,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    notes: '',
    items: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && sale) {
      setReturnData({
        sale_type: 'return',
        original_sale: sale.id,
        customer_name: sale.customer_name || '',
        customer_phone: sale.customer_phone || '',
        customer_email: sale.customer_email || '',
        notes: '',
        items: []
      });
    }
  }, [isOpen, sale]);

  const handleItemChange = (itemId, field, value) => {
    setReturnData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.original_sale_item === itemId 
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  const addItemToReturn = (saleItem) => {
    const existingItem = returnData.items.find(item => item.original_sale_item === saleItem.id);
    if (existingItem) {
      setError('Item already added to return');
      return;
    }

    const newItem = {
      original_sale_item: saleItem.id,
      product: saleItem.product.id,
      quantity: 0,
      unit: saleItem.unit.id,
      unit_price: saleItem.unit_price,
      price_mode: saleItem.price_mode
    };

    setReturnData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItemFromReturn = (itemId) => {
    setReturnData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.original_sale_item !== itemId)
    }));
  };

  const handleSave = async () => {
    if (returnData.items.length === 0) {
      setError('Please add at least one item to return');
      return;
    }

    // Validate quantities
    for (const item of returnData.items) {
      if (item.quantity <= 0) {
        setError('All return quantities must be greater than 0');
        return;
      }
      
      const saleItem = saleItems.find(si => si.id === item.original_sale_item);
      if (item.quantity > saleItem.max_returnable_quantity_display) {
        setError(`Cannot return ${item.quantity} units of ${saleItem.product.name}. Maximum returnable: ${saleItem.max_returnable_quantity_display}`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const returnPayload = {
        original_sale: sale.id,
        customer_name: returnData.customer_name,
        customer_phone: returnData.customer_phone,
        customer_email: returnData.customer_email,
        notes: returnData.notes,
        items: returnData.items
      };

      await onSave(returnPayload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create return');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content return-modal">
        <div className="modal-header">
          <h2>Create Return for Sale {sale?.sale_number}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>Customer Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={returnData.customer_name}
                  onChange={(e) => setReturnData(prev => ({ ...prev, customer_name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Customer Phone</label>
                <input
                  type="text"
                  value={returnData.customer_phone}
                  onChange={(e) => setReturnData(prev => ({ ...prev, customer_phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Customer Email</label>
              <input
                type="email"
                value={returnData.customer_email}
                onChange={(e) => setReturnData(prev => ({ ...prev, customer_email: e.target.value }))}
              />
            </div>
          </div>

          {/* Refund Information Section */}
          {sale && sale.paid_amount > 0 && (
            <div className="form-section refund-info">
              <h3>Refund Information</h3>
              <div className="refund-details">
                <div className="refund-item">
                  <span className="refund-label">Original Sale Amount:</span>
                  <span className="refund-value">${sale.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="refund-item">
                  <span className="refund-label">Amount Paid by Customer:</span>
                  <span className="refund-value highlight">${sale.paid_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="refund-item">
                  <span className="refund-label">Payment Status:</span>
                  <span className="refund-value">{sale.payment_status || 'Unknown'}</span>
                </div>
                {sale.payment_status === 'partial' && (
                  <div className="refund-item">
                    <span className="refund-label">Remaining Amount:</span>
                    <span className="refund-value">${sale.remaining_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                <div className="refund-note">
                  <strong>Note:</strong> The customer should be refunded ${sale.paid_amount?.toFixed(2) || '0.00'} (the amount they actually paid).
                </div>
              </div>
            </div>
          )}

          <div className="form-section">
            <h3>Available Items</h3>
            <div className="items-grid">
              {saleItems?.map(item => (
                <div key={item.id} className="item-card">
                  <div className="item-info">
                    <h4>{item.product.name}</h4>
                    <p>SKU: {item.product.sku}</p>
                    <p>Unit: {item.unit.name} ({item.unit.symbol})</p>
                    <p>Sold: {item.quantity_sold}</p>
                    <p>Max Returnable: {item.max_returnable_quantity_display}</p>
                    <p>Sale Price: ${item.unit_price}</p>
                    <p>Return Price: ${item.return_unit_price}</p>
                  </div>
                  {item.max_returnable_quantity_display > 0 && (
                    <button
                      className="add-item-btn"
                      onClick={() => addItemToReturn(item)}
                      disabled={returnData.items.some(ri => ri.original_sale_item === item.id)}
                    >
                      {returnData.items.some(ri => ri.original_sale_item === item.id) ? 'Added' : 'Add to Return'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Return Items</h3>
            {returnData.items.length === 0 ? (
              <p className="no-items">No items added to return yet</p>
            ) : (
              <div className="return-items">
                {returnData.items.map(item => {
                  const saleItem = saleItems.find(si => si.id === item.original_sale_item);
                  return (
                    <div key={item.original_sale_item} className="return-item">
                      <div className="item-details">
                        <h4>{saleItem?.product.name}</h4>
                        <p>{saleItem?.unit.name} ({saleItem?.unit.symbol})</p>
                        <p>Max: {saleItem?.max_returnable_quantity_display}</p>
                        <p>Return Price: ${saleItem?.return_unit_price}</p>
                      </div>
                      <div className="quantity-controls">
                        <label>Return Quantity:</label>
                        <input
                          type="number"
                          min="0"
                          max={saleItem?.max_returnable_quantity_display}
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.original_sale_item, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                        <div className="return-total">
                          <strong>Total: ${(item.quantity * saleItem?.return_unit_price || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                      <button
                        className="remove-item-btn"
                        onClick={() => removeItemFromReturn(item.original_sale_item)}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={returnData.notes}
                onChange={(e) => setReturnData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                placeholder="Return reason or additional notes..."
              />
            </div>
          </div>

          {returnData.items.length > 0 && (
            <div className="form-section return-summary">
              <h3>Return Summary</h3>
              <div className="summary-total">
                <strong>Total Return Amount: ${returnData.items.reduce((total, item) => {
                  const saleItem = saleItems.find(si => si.id === item.original_sale_item);
                  return total + (item.quantity * (saleItem?.return_unit_price || 0));
                }, 0).toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={loading || returnData.items.length === 0}
          >
            {loading ? 'Creating...' : 'Create Return'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;
