import React, { useState } from 'react';
import Button from './Button';
import PrintButton from './PrintButton';
import './DeliveryModal.css';

const DeliveryModal = ({ purchaseOrder, action = 'create', onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    notes: '',
    items: (purchaseOrder?.items || []).map(item => ({
      purchase_order_item_id: item.id,
      product_id: item.product.id,
      quantity_received: item.quantity_ordered,
      unit_id: item.unit?.id || item.unit || '',
      unit_cost: item.unit_cost,
      tax_class_id: item.tax_class?.id || '',
      condition_notes: ''
    }))
  });
  const [loading, setLoading] = useState(false);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that at least one item has quantity > 0
    const hasItems = formData.items.some(item => item.quantity_received > 0);
    if (!hasItems) {
      alert('Please specify quantities for at least one item');
      return;
    }

    setLoading(true);
    try {
      // Convert data types to ensure proper API format
      const deliveryData = {
        purchase_order_id: parseInt(purchaseOrder.id),
        notes: formData.notes,
        items: formData.items.filter(item => item.quantity_received > 0).map(item => ({
          ...item,
          purchase_order_item_id: parseInt(item.purchase_order_item_id),
          product_id: parseInt(item.product_id),
          quantity_received: parseInt(item.quantity_received),
          unit_id: item.unit_id ? parseInt(item.unit_id) : null,
          unit_cost: parseFloat(item.unit_cost),
          tax_class_id: item.tax_class_id ? parseInt(item.tax_class_id) : null
        }))
      };
      await onSubmit(deliveryData);
    } catch (error) {
      console.error('Error submitting delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item) => {
    const quantity = parseFloat(item.quantity_received) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    return quantity * unitCost;
  };

  const calculateTaxAmount = (item) => {
    const lineTotal = calculateItemTotal(item);
    const taxClass = purchaseOrder.items.find(poItem => poItem.id === item.purchase_order_item_id)?.tax_class;
    if (taxClass) {
      return lineTotal * (taxClass.tax_rate / 100);
    }
    return 0;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const taxAmount = formData.items.reduce((sum, item) => sum + calculateTaxAmount(item), 0);
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const totals = calculateTotals();


  return (
    <div className="modal-overlay">
      <div className="modal-content delivery-modal">
        <div className="modal-header">
          <h2>
            {action === 'create_and_archive' ? 'Create Delivery & Archive Order' : 'Create Delivery'}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="delivery-info">
          <div className="info-row">
            <span className="label">Purchase Order:</span>
            <span className="value">{purchaseOrder.order_number}</span>
          </div>
          <div className="info-row">
            <span className="label">Supplier:</span>
            <span className="value">{purchaseOrder.supplier.name}</span>
          </div>
          <div className="info-row">
            <span className="label">Order Date:</span>
            <span className="value">{new Date(purchaseOrder.order_date).toLocaleDateString()}</span>
          </div>
        </div>

        {action === 'create_and_archive' && (
          <div className="warning-message">
            <strong>ℹ️ Information:</strong> This action will create a delivery and then archive the purchase order. The order will be preserved but marked as archived.
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="notes">Delivery Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Notes about this delivery..."
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Received Items</h3>
            <p className="section-description">
              Quantities are pre-filled with ordered amounts. Modify as needed based on what was actually received.
            </p>

            <div className="items-list">
              {formData.items.map((item, index) => {
                const originalItem = purchaseOrder.items.find(poItem => poItem.id === item.purchase_order_item_id);
                return (
                  <div key={index} className="item-row">
                    <div className="item-product">
                      <label>Product</label>
                      <div className="product-info">
                        <div className="product-name">{originalItem.product.name}</div>
                        <div className="product-sku">SKU: {originalItem.product.sku}</div>
                        <div className="ordered-quantity">
                          Ordered: {originalItem.quantity_ordered} units
                        </div>
                      </div>
                    </div>
                    <div className="item-quantity">
                      <label>Quantity Received *</label>
                      <input
                        type="number"
                        min="0"
                        max={originalItem.quantity_ordered}
                        value={item.quantity_received}
                        onChange={(e) => handleItemChange(index, 'quantity_received', e.target.value)}
                        placeholder={`Max: ${originalItem.quantity_ordered}`}
                        required
                      />
                    </div>
                    <div className="item-unit">
                      <label>Unit</label>
                      <select
                        value={item.unit_id}
                        onChange={(e) => {
                          const unitId = e.target.value;
                          handleItemChange(index, 'unit_id', unitId);
                          
                          // Auto-set unit cost based on selected unit's price
                          if (unitId) {
                            const selectedUnit = originalItem.product?.compatible_units?.find(u => {
                              const unit = u.unit || u;
                              const unitIdFromData = unit?.id || unit;
                              return unitIdFromData === parseInt(unitId);
                            });
                            if (selectedUnit) {
                              // Calculate unit price based on conversion factor
                              let unitPrice = originalItem.product?.price || 0;
                              
                              // If this is not the base unit, calculate converted price
                              const unit = selectedUnit.unit || selectedUnit;
                              const isBaseUnit = unit?.is_base_unit || selectedUnit.unit_is_base;
                              
                              if (!isBaseUnit) {
                                // Find conversion factor from base unit to this unit
                                const stockInfo = originalItem.product?.stock_in_units?.find(s => s.unit_id === parseInt(unitId));
                                if (stockInfo) {
                                  // Use the conversion factor from stock_in_units if available
                                  const baseQuantity = originalItem.product.stock_quantity || 1;
                                  const convertedQuantity = stockInfo.quantity || 1;
                                  const conversionFactor = baseQuantity / convertedQuantity;
                                  unitPrice = parseFloat(originalItem.product.price) * conversionFactor;
                                } else {
                                  // Fallback: try to find conversion in available_units
                                  const availableUnit = originalItem.product?.available_units?.find(au => au.id === parseInt(unitId));
                                  if (availableUnit?.conversion_factor) {
                                    unitPrice = parseFloat(originalItem.product.price) * availableUnit.conversion_factor;
                                  }
                                }
                              }
                              
                              handleItemChange(index, 'unit_cost', parseFloat(unitPrice).toFixed(2));
                            }
                          }
                        }}
                      >
                        <option value="">Select unit</option>
                        {(() => {
                          if (!originalItem.product?.compatible_units || originalItem.product.compatible_units.length === 0) {
                            return <option value="">No compatible units available</option>;
                          }
                          
                          return originalItem.product.compatible_units.map(compatibleUnit => {
                            // Handle both ProductUnit structure (with nested unit) and direct unit structure
                            const unit = compatibleUnit.unit || compatibleUnit;
                            const unitId = unit?.id || unit; // unit might be just an ID
                            const unitName = unit?.name || compatibleUnit.unit_name;
                            const unitSymbol = unit?.symbol || compatibleUnit.unit_symbol;
                            
                            // If unit is just an ID, use the direct fields from compatibleUnit
                            if (!unitName || !unitSymbol) {
                              console.warn('Invalid unit data:', compatibleUnit);
                              return null;
                            }
                            
                            // Calculate unit price based on conversion factor
                            let unitPrice = originalItem.product?.price || 0;
                            
                            // If this is not the base unit, calculate converted price
                            if (!compatibleUnit.unit_is_base) {
                              // Find conversion factor from base unit to this unit
                              const stockInfo = originalItem.product?.stock_in_units?.find(s => s.unit_id === unitId);
                              if (stockInfo) {
                                // Use the conversion factor from stock_in_units if available
                                const baseQuantity = originalItem.product.stock_quantity || 1;
                                const convertedQuantity = stockInfo.quantity || 1;
                                const conversionFactor = baseQuantity / convertedQuantity;
                                unitPrice = parseFloat(originalItem.product.price) * conversionFactor;
                              } else {
                                // Fallback: try to find conversion in available_units
                                const availableUnit = originalItem.product?.available_units?.find(au => au.id === unitId);
                                if (availableUnit?.conversion_factor) {
                                  unitPrice = parseFloat(originalItem.product.price) * availableUnit.conversion_factor;
                                }
                              }
                            }
                            
                            return (
                              <option key={unitId} value={unitId}>
                                {unitName} ({unitSymbol}) - {parseFloat(unitPrice).toFixed(2)} MGA
                              </option>
                            );
                          }).filter(Boolean);
                        })()}
                      </select>
                    </div>
                    <div className="item-cost">
                      <label>Unit Cost *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                        required
                      />
                    </div>
                    <div className="item-total">
                      <label>Line Total</label>
                      <div className="total-display">
                        {calculateItemTotal(item).toFixed(2)} MGA
                        {originalItem.tax_class && (
                          <span className="tax-amount">
                            + {calculateTaxAmount(item).toFixed(2)} MGA tax
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="item-condition">
                      <label>Condition Notes</label>
                      <textarea
                        value={item.condition_notes}
                        onChange={(e) => handleItemChange(index, 'condition_notes', e.target.value)}
                        rows="2"
                        placeholder="Notes about item condition..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {formData.items.some(item => item.quantity_received > 0) && (
            <div className="totals-section">
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>{totals.subtotal.toFixed(2)} MGA</span>
              </div>
              <div className="totals-row">
                <span>Tax Amount:</span>
                <span>{totals.taxAmount.toFixed(2)} MGA</span>
              </div>
              <div className="totals-row total-row">
                <span>Total Amount:</span>
                <span>{totals.total.toFixed(2)} MGA</span>
              </div>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <div className="footer-left">
            <PrintButton
              data={{
                ...purchaseOrder,
                items: formData.items.map(item => ({
                  ...item,
                  product_name: purchaseOrder?.items?.find(poItem => poItem.id === item.purchase_order_item_id)?.product?.name,
                  product_sku: purchaseOrder?.items?.find(poItem => poItem.id === item.purchase_order_item_id)?.product?.sku,
                  unit_name: purchaseOrder?.items?.find(poItem => poItem.id === item.purchase_order_item_id)?.unit?.name,
                  ordered_quantity: purchaseOrder?.items?.find(poItem => poItem.id === item.purchase_order_item_id)?.quantity_ordered,
                  delivered_quantity: item.quantity_received,
                  status: item.quantity_received > 0 ? 'Delivered' : 'Pending'
                }))
              }}
              title="Delivery Receipt"
              type="delivery"
              printText="Print Receipt"
              validateText="Validate & Print"
              showValidateOption={true}
              onValidate={handleSubmit}
              disabled={!formData.items.some(item => item.quantity_received > 0)}
            />
          </div>
          <div className="footer-right">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={action === 'create_and_archive' ? 'primary' : 'primary'}
              onClick={handleSubmit}
              disabled={loading || !formData.items.some(item => item.quantity_received > 0)}
            >
              {loading 
                ? (action === 'create_and_archive' ? 'Creating & Archiving...' : 'Creating...') 
                : (action === 'create_and_archive' ? 'Create Delivery & Archive Order' : 'Create Delivery')
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;
