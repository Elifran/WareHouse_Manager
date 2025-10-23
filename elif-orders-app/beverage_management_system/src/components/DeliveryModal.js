import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import PrintButton from './PrintButton';
import './DeliveryModal.css';

const DeliveryModal = ({ purchaseOrder, action = 'create', onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    notes: '',
    items: (purchaseOrder?.items || []).map(item => ({
      purchase_order_item_id: item.id,
      product_id: item.product.id,
      quantity_received: item.quantity_display || item.quantity_ordered,
      unit_id: item.unit?.id || item.unit || '',
      unit_cost: item.unit_cost,
      tax_class_id: item.tax_class?.id || '',
      condition_notes: ''
    }))
  });
  const [loading, setLoading] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

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
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    const hasItems = formData.items.some(item => item.quantity_received > 0);
    if (!hasItems) {
      alert(t('modals.please_specify_quantities'));
      return;
    }

    setLoading(true);
    try {
      const deliveryData = {
        purchase_order_id: parseInt(purchaseOrder.id),
        notes: formData.notes,
        items: formData.items.filter(item => item.quantity_received > 0).map(item => ({
          ...item,
          purchase_order_item_id: parseInt(item.purchase_order_item_id),
          product_id: parseInt(item.product_id),
          quantity_received: parseFloat(item.quantity_received),
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
      <div className={`modal-content delivery-modal ${isMobile ? 'mobile-modal' : ''}`}>
        <div className="modal-header">
          <h2>
            {action === 'create_and_archive' ? t('modals.create_delivery_archive') : t('modals.create_delivery')}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="delivery-info">
          <div className="info-row">
            <span className="label">{t('modals.purchase_order')}:</span>
            <span className="value">{purchaseOrder.order_number}</span>
          </div>
          <div className="info-row">
            <span className="label">{t('modals.supplier')}:</span>
            <span className="value">{purchaseOrder.supplier.name}</span>
          </div>
          <div className="info-row">
            <span className="label">{t('modals.order_date')}:</span>
            <span className="value">{new Date(purchaseOrder.order_date).toLocaleDateString()}</span>
          </div>
        </div>

        {action === 'create_and_archive' && (
          <div className="warning-message">
            <strong>ℹ️ Information:</strong> This action will create a delivery and then archive the purchase order. The order will be preserved but marked as archived.
          </div>
        )}

        {/* Main scrollable content area */}
        <form onSubmit={handleSubmit} className="modal-main-content">
          <div className="form-section">
            <div className="form-group full-width">
              <label htmlFor="notes">{t('modals.delivery_notes')}</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder={t('modals.delivery_notes_placeholder')}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>{t('modals.received_items')}</h3>
            <p className="section-description">
              {t('modals.quantities_prefilled_description')}
            </p>

            {/* Scrollable items container */}
            <div className="items-container">
              {formData.items.length === 0 ? (
                <div className="empty-items">
                  <p>{t('modals.no_items_added_yet')}</p>
                </div>
              ) : isMobile ? (
                // Mobile Items List
                <div className="mobile-items-list">
                  {formData.items.map((item, index) => {
                    const originalItem = purchaseOrder.items.find(poItem => poItem.id === item.purchase_order_item_id);
                    return (
                      <div key={index} className="mobile-item-card">
                        <div className="mobile-item-header">
                          <div className="mobile-product-info">
                            <div className="mobile-product-name">{originalItem.product.name}</div>
                            <div className="mobile-product-details">
                              <div className="mobile-product-sku">SKU: {originalItem.product.sku}</div>
                              <div className="mobile-ordered-quantity">
                                {t('modals.ordered')}: {originalItem.quantity_display || originalItem.quantity_ordered} {originalItem.unit?.name || t('modals.units')}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mobile-item-details">
                          <div className="mobile-detail-row">
                            <div className="mobile-field-group">
                              <label>{t('modals.quantity_received')} *</label>
                              <input
                                type="number"
                                min="0"
                                max={originalItem.quantity_display || originalItem.quantity_ordered}
                                value={item.quantity_received}
                                onChange={(e) => handleItemChange(index, 'quantity_received', e.target.value)}
                                placeholder={`Max: ${originalItem.quantity_display || originalItem.quantity_ordered}`}
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="mobile-detail-row">
                            <div className="mobile-field-group">
                              <label>{t('common.unit')}</label>
                              <div className="readonly-field">
                                {(() => {
                                  const unitName = originalItem.unit?.name || t('modals.unknown_unit');
                                  const unitSymbol = originalItem.unit?.symbol || '';
                                  return `${unitName} (${unitSymbol})`;
                                })()}
                              </div>
                            </div>
                            <div className="mobile-field-group">
                              <label>{t('modals.unit_cost')} *</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="mobile-field-group">
                            <label>{t('modals.condition_notes')}</label>
                            <textarea
                              value={item.condition_notes}
                              onChange={(e) => handleItemChange(index, 'condition_notes', e.target.value)}
                              rows="2"
                              placeholder={t('modals.condition_notes_placeholder')}
                            />
                          </div>
                        </div>
                        
                        <div className="mobile-item-totals">
                          <div className="mobile-total-line">
                            <span>{t('modals.line_total')}:</span>
                            <span>{calculateItemTotal(item).toFixed(2)} MGA</span>
                          </div>
                          {originalItem.tax_class && (
                            <div className="mobile-total-line tax-line">
                              <span>{t('modals.tax')}:</span>
                              <span>+ {calculateTaxAmount(item).toFixed(2)} MGA</span>
                            </div>
                          )}
                          <div className="mobile-total-line grand-total">
                            <span>{t('modals.total')}:</span>
                            <span>{(calculateItemTotal(item) + calculateTaxAmount(item)).toFixed(2)} MGA</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Desktop Items Table
                <div className="desktop-items-grid">
                  <div className="items-header">
                    <span>{t('common.name')}</span>
                    <span>{t('modals.quantity_received')}</span>
                    <span>{t('common.unit')}</span>
                    <span>{t('modals.unit_cost')}</span>
                    <span>{t('modals.line_total')}</span>
                    <span>{t('modals.condition_notes')}</span>
                  </div>
                  {formData.items.map((item, index) => {
                    const originalItem = purchaseOrder.items.find(poItem => poItem.id === item.purchase_order_item_id);
                    return (
                      <div key={index} className="item-row">
                        <div className="item-product">
                          <div className="product-info">
                            <div className="product-name">{originalItem.product.name}</div>
                            <div className="product-sku">SKU: {originalItem.product.sku}</div>
                            <div className="ordered-quantity">
                              {t('modals.ordered')}: {originalItem.quantity_display || originalItem.quantity_ordered} {originalItem.unit?.name || t('modals.units')}
                            </div>
                          </div>
                        </div>
                        <div className="item-quantity">
                          <input
                            type="number"
                            min="0"
                            max={originalItem.quantity_display || originalItem.quantity_ordered}
                            value={item.quantity_received}
                            onChange={(e) => handleItemChange(index, 'quantity_received', e.target.value)}
                            placeholder={`Max: ${originalItem.quantity_display || originalItem.quantity_ordered}`}
                            required
                          />
                        </div>
                        <div className="item-unit">
                          <div className="readonly-field">
                            {(() => {
                              const unitName = originalItem.unit?.name || t('modals.unknown_unit');
                              const unitSymbol = originalItem.unit?.symbol || '';
                              return `${unitName} (${unitSymbol})`;
                            })()}
                          </div>
                        </div>
                        <div className="item-cost">
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
                          <div className="total-display">
                            {calculateItemTotal(item).toFixed(2)} MGA
                            {originalItem.tax_class && (
                              <span className="tax-amount">
                                + {calculateTaxAmount(item).toFixed(2)} MGA {t('modals.tax')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="item-condition">
                          <textarea
                            value={item.condition_notes}
                            onChange={(e) => handleItemChange(index, 'condition_notes', e.target.value)}
                            rows="2"
                            placeholder={t('modals.condition_notes_placeholder')}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {formData.items.some(item => item.quantity_received > 0) && (
            <div className="totals-section">
              <div className="totals-grid">
                <div className="totals-row">
                  <span>{t('modals.subtotal')}:</span>
                  <span>{totals.subtotal.toFixed(2)} MGA</span>
                </div>
                <div className="totals-row">
                  <span>{t('modals.tax_amount')}:</span>
                  <span>{totals.taxAmount.toFixed(2)} MGA</span>
                </div>
                <div className="totals-row total-row">
                  <span>{t('modals.total_amount')}:</span>
                  <span>{totals.total.toFixed(2)} MGA</span>
                </div>
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
                  status: item.quantity_received > 0 ? t('modals.delivered') : t('modals.pending')
                }))
              }}
              title={t('titles.delivery_receipt')}
              type="delivery"
              printText={t('buttons.print_receipt')}
              validateText={t('modals.validate_print')}
              showValidateOption={true}
              onValidate={handleSubmit}
              disabled={!formData.items.some(item => item.quantity_received > 0)}
            />
          </div>
          <div className="footer-right">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('modals.cancel')}
            </Button>
            <Button
              type="submit"
              variant={action === 'create_and_archive' ? 'primary' : 'primary'}
              onClick={handleSubmit}
              disabled={loading || !formData.items.some(item => item.quantity_received > 0)}
              className={loading ? 'loading' : ''}
            >
              {loading 
                ? (action === 'create_and_archive' ? t('modals.creating_archiving') : t('modals.creating')) 
                : (action === 'create_and_archive' ? t('modals.create_delivery_archive') : t('modals.create_delivery'))
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;