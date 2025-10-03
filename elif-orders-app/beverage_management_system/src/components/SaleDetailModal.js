import React from 'react';
import { useTranslation } from 'react-i18next';
import PrintButton from './PrintButton';
import './SaleDetailModal.css';

const SaleDetailModal = ({ sale, onClose, loading = false }) => {
  const { t } = useTranslation();
  if (!sale && !loading) return null;

  // Handle case where sale data is incomplete
  if (sale && !sale.sale_number) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{t('modals.sale_details')}</h2>
            <button className="modal-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div className="modal-body">
            <div className="error-state">
              <p>Unable to load sale details. The sale data appears to be incomplete.</p>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              {t('modals.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `${parseFloat(amount).toFixed(2)} MGA`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('modals.sale_details')}</h2>
          <div className="header-actions">
            <PrintButton
              data={sale}
              title={t('titles.sale_receipt')}
              type="sale"
              printText={t('buttons.print_receipt')}
              className="print-sale-receipt-btn"
            />
            <button className="modal-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{t('modals.loading_sale_details')}</p>
            </div>
          ) : (
            <>
              {/* Sale Information */}
              <div className="sale-info-section">
            <h3>{t('modals.sale_information')}</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>{t('table_headers.sale_number')}:</label>
                <span className="sale-number">{sale.sale_number}</span>
              </div>
              <div className="info-item">
                <label>{t('common.status')}:</label>
                <span className={`status status-${sale.status}`}>
                  {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                </span>
              </div>
              <div className="info-item">
                <label>{t('common.date')}:</label>
                <span>{formatDate(sale.created_at)}</span>
              </div>
              <div className="info-item">
                <label>{t('table_headers.sold_by')}:</label>
                <span>{sale.sold_by_name || t('app.unknown_user')}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="customer-info-section">
            <h3>{t('modals.customer_information')}</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>{t('common.name')}:</label>
                <span>{sale.customer_name || t('dashboard.walk_in_customer')}</span>
              </div>
              {sale.customer_phone && (
                <div className="info-item">
                  <label>{t('common.phone')}:</label>
                  <span>{sale.customer_phone}</span>
                </div>
              )}
              {sale.customer_email && (
                <div className="info-item">
                  <label>{t('common.email')}:</label>
                  <span>{sale.customer_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sale Items */}
          <div className="items-section">
            <h3>{t('table_headers.items')} ({sale.items?.length || 0})</h3>
            {sale.items && sale.items.length > 0 ? (
              <div className="items-table">
                <div className="table-header">
                  <div className="col-product">{t('common.name')}</div>
                  <div className="col-sku">SKU</div>
                  <div className="col-quantity">{t('common.quantity')}</div>
                  <div className="col-unit">{t('common.unit')}</div>
                  <div className="col-price">{t('common.price')}</div>
                  <div className="col-mode">{t('common.type')}</div>
                  <div className="col-total">{t('common.total')}</div>
                </div>
                {sale.items.map((item, index) => (
                  <div key={index} className="table-row">
                    <div className="col-product">
                      <div className="product-name">{item.product_name}</div>
                    </div>
                    <div className="col-sku">{item.product_sku}</div>
                    <div className="col-quantity">{item.quantity_display || item.quantity}</div>
                    <div className="col-unit">
                      {item.unit_name ? `${item.unit_name} (${item.unit_symbol || ''})` : 'N/A'}
                    </div>
                    <div className="col-price">{formatCurrency(item.unit_price)}</div>
                    <div className="col-mode">
                      <span className={`price-mode-badge ${item.price_mode || 'standard'}`}>
                        {item.price_mode === 'wholesale' ? t('common.wholesale') : t('common.retail')}
                      </span>
                    </div>
                    <div className="col-total">{formatCurrency(item.total_price)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-items">No items found</p>
            )}
          </div>

          {/* Payment Information */}
          <div className="payment-section">
            <h3>{t('modals.payment_summary')}</h3>
            <div className="payment-summary">
              <div className="payment-row">
                <label>{t('table_headers.total_amount')}:</label>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.cost_amount && sale.cost_amount > 0 && (
                <div className="payment-row cost-breakdown">
                  <label>Cost (excl. tax):</label>
                  <span>{formatCurrency(sale.cost_amount)}</span>
                </div>
              )}
              {sale.tax_amount > 0 && (
                <div className="payment-row tax-breakdown">
                  <label>{t('modals.tax_included')}:</label>
                  <span>{formatCurrency(sale.tax_amount)}</span>
                </div>
              )}
              {sale.discount_amount > 0 && (
                <div className="payment-row discount">
                  <label>{t('modals.discount')}:</label>
                  <span>-{formatCurrency(sale.discount_amount)}</span>
                </div>
              )}
              <div className="payment-row total">
                <label>{t('common.total')}:</label>
                <span>{formatCurrency(sale.total_amount)}</span>
              </div>
              <div className="payment-row">
                <label>{t('table_headers.payment_method')}:</label>
                <span className="payment-method">
                  {sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="notes-section">
              <h3>{t('common.notes')}</h3>
              <div className="notes-content">
                {sale.notes}
              </div>
            </div>
          )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {t('modals.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;
