import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PrintButton from './PrintButton';
import './SaleDetailModal.css';
import { formatCurrency, formatDate } from '../utils/helpers';

const SaleDetailModal = ({ sale, onClose, loading = false }) => {
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    saleId: '',
    clientName: '',
    startDate: '',
    endDate: ''
  });
  const [filterLoading, setFilterLoading] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Fetch sales data with pagination and filters
  const fetchSales = async (page = 1, filters = {}) => {
    setFilterLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...filters
      });

      const response = await fetch(`/api/sales?${queryParams}`);
      const data = await response.json();
      
      setSales(data.sales);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  // Initial load - only fetch if no specific sale is provided
  useEffect(() => {
    if (!sale) {
      fetchSales(1, filters);
    }
  }, [sale]); // Add sale as dependency

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    fetchSales(1, cleanFilters);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      saleId: '',
      clientName: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
    fetchSales(1, {});
  };

  // Navigation handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchSales(nextPage, filters);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchSales(prevPage, filters);
    }
  };

  // Early return conditions - moved after all hooks
  if (!sale && !loading && !filterLoading) {
    // Check if we have any sales data to show
    if (sales.length === 0 && !filterLoading) {
      return null;
    }
  }

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sales-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('modals.sale_details')}</h2>
          <div className="header-actions">
            {sale && (
              <PrintButton
                data={sale}
                title={t('titles.sale_receipt')}
                type="sale"
                printText={t('buttons.print_receipt')}
                className="print-sale-receipt-btn"
              />
            )}
            <button className="modal-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Filters Section - Only show when no specific sale is selected */}
          {!sale && (
            <div className="filters-section">
              <h3>{t('modals.filter_sales')}</h3>
              <div className="filters-grid">
                <div className="filter-item">
                  <label htmlFor="saleId">{t('table_headers.sale_number')}:</label>
                  <input
                    id="saleId"
                    type="text"
                    placeholder={t('placeholders.enter_sale_id')}
                    value={filters.saleId}
                    onChange={(e) => handleFilterChange('saleId', e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label htmlFor="clientName">{t('common.name')}:</label>
                  <input
                    id="clientName"
                    type="text"
                    placeholder={t('placeholders.enter_client_name')}
                    value={filters.clientName}
                    onChange={(e) => handleFilterChange('clientName', e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label htmlFor="startDate">{t('labels.start_date')}:</label>
                  <input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label htmlFor="endDate">{t('labels.end_date')}:</label>
                  <input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-actions">
                <button className="btn-primary" onClick={applyFilters}>
                  {t('buttons.apply_filters')}
                </button>
                <button className="btn-secondary" onClick={clearFilters}>
                  {t('buttons.clear_filters')}
                </button>
              </div>
            </div>
          )}

          {loading || filterLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{t('modals.loading_sale_details')}</p>
            </div>
          ) : sale ? (
            // Single Sale Detail View
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
          ) : (
            // Sales List View with Pagination
            <>
              <div className="sales-list-section">
                <h3>{t('modals.recent_sales')} ({sales.length})</h3>
                
                {sales.length > 0 ? (
                  <div className="sales-table">
                    <div className="table-header">
                      <div className="col-sale-number">{t('table_headers.sale_number')}</div>
                      <div className="col-customer">{t('common.name')}</div>
                      <div className="col-date">{t('common.date')}</div>
                      <div className="col-amount">{t('common.total')}</div>
                      <div className="col-status">{t('common.status')}</div>
                    </div>
                    {sales.map((saleItem) => (
                      <div key={saleItem.id} className="table-row clickable" onClick={() => {/* Handle click to view details */}}>
                        <div className="col-sale-number">{saleItem.sale_number}</div>
                        <div className="col-customer">{saleItem.customer_name || t('dashboard.walk_in_customer')}</div>
                        <div className="col-date">{formatDate(saleItem.created_at)}</div>
                        <div className="col-amount">{formatCurrency(saleItem.total_amount)}</div>
                        <div className="col-status">
                          <span className={`status status-${saleItem.status}`}>
                            {saleItem.status.charAt(0).toUpperCase() + saleItem.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-sales">{t('modals.no_sales_found')}</p>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <button 
                      className="btn-pagination" 
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                    >
                      {t('buttons.previous')}
                    </button>
                    
                    <span className="pagination-info">
                      {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
                    </span>
                    
                    <button 
                      className="btn-pagination" 
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      {t('buttons.next')}
                    </button>
                  </div>
                )}
              </div>
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
