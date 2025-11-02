import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Table from '../components/Table';
import Button from '../components/Button';
import PrintButton from '../components/PrintButton';
import './SalesManagement.css';
import SaleDetailModal from '../components/SaleDetailModal';
import {formatCurrency} from '../utils/helpers';

const SalesManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleDetailLoading, setSaleDetailLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const [deleteFilters, setDeleteFilters] = useState({
    customer_name: '',
    start_date: '',
    end_date: '',
    status: 'completed'
  });
  const [editFormData, setEditFormData] = useState({
    items: [],
    payment_type: 'full',
    paid_amount: 0
  });
  const [products, setProducts] = useState([]);
  // const [filters, setFilters] = useState({
  //   status: '',
  //   customer_name: '',
  //   start_date: '',
  //   end_date: '',
  //   sale_number: '',
  //   payment_status: '' // Added payment status filter
  // });
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Update your filters state initialization
  const [filters, setFilters] = useState({
    status: '',
    customer_name: '',
    start_date: getTodayDate(), // Set today's date as default
    end_date: getTodayDate(),   // Set today's date as default
    sale_number: '',
    payment_status: ''
  });

  const fetchSales = useCallback(async (page = 1, filterParams = {}) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      
      // Pagination params
      params.append('page', page.toString());
      params.append('page_size', ITEMS_PER_PAGE.toString());
      
      // Filter params
      if (filterParams.status) params.append('status', filterParams.status);
      if (filterParams.customer_name) params.append('search', filterParams.customer_name);
      if (filterParams.start_date) params.append('created_at__date__gte', filterParams.start_date);
      if (filterParams.end_date) params.append('created_at__date__lte', filterParams.end_date);
      if (filterParams.sale_number) params.append('sale_number', filterParams.sale_number);
      if (filterParams.payment_status) params.append('payment_status', filterParams.payment_status); // Added payment status filter
      
      const response = await api.get(`/api/sales/?${params.toString()}`);
      const salesData = response.data.results || response.data;
      
      // Ensure salesData is always an array
      if (!Array.isArray(salesData)) {
        console.error('Sales data is not an array:', salesData);
        setSales([]);
        return;
      }
      
      setSales(salesData);
      
      // Set pagination info
      if (response.data.count !== undefined) {
        setTotalCount(response.data.count);
        setTotalPages(Math.ceil(response.data.count / ITEMS_PER_PAGE));
      } else {
        // Fallback if pagination info not available
        setTotalCount(salesData.length);
        setTotalPages(1);
      }
      
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to fetch sales: ' + (err.response?.data?.error || err.message));
      console.error('Sales fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales(1, filters);
    fetchProducts();
  }, [fetchSales]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products/?is_active=true');
      setProducts(response.data.results || response.data);
    } catch (err) {
      console.error('Products fetch error:', err);
    }
  };

  // Navigation handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      fetchSales(nextPage, filters);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      fetchSales(prevPage, filters);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchSales(page, filters);
    }
  };

  const handleDeleteSales = async () => {
    try {
      setError('');
      const response = await api.delete('/api/sales/delete/', {
        data: deleteFilters
      });
      
      alert(`Successfully deleted ${response.data.deleted_count} sales`);
      setShowDeleteModal(false);
      setDeleteFilters({
        customer_name: '',
        start_date: '',
        end_date: '',
        status: 'completed'
      });
      fetchSales(currentPage, filters);
      fetchProducts(); // Refresh products to update stock quantities
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete sales');
      console.error('Delete sales error:', err);
    }
  };

  const handleEditSale = async () => {
    try {
      setError('');
      
      // Prepare the data to send
      const updateData = {
        items: editFormData.items,
        paid_amount: editFormData.paid_amount
      };
      
      await api.put(`/api/sales/${selectedSale.id}/edit/`, updateData);
      alert('Sale updated successfully');
      setShowEditModal(false);
      setSelectedSale(null);
      setEditFormData({ items: [], payment_type: 'full', paid_amount: 0 });
      fetchSales(currentPage, filters);
      fetchProducts(); // Refresh products to update stock quantities
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update sale');
      console.error('Edit sale error:', err);
    }
  };

  const handleMakePayment = async (saleId, paymentAmount) => {
    try {
      setError('');
      await api.post(`/api/sales/${saleId}/payment/`, {
        payment_amount: paymentAmount,
        is_full_payment: true
      });
      alert('Payment processed successfully');
      setShowPaymentModal(false);
      fetchSales(currentPage, filters);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process payment');
      console.error('Payment error:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeleteFilterChange = (e) => {
    const { name, value } = e.target;
    setDeleteFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchSales(1, filters);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      customer_name: '',
      start_date: '',
      end_date: '',
      sale_number: '',
      payment_status: '' // Reset payment status filter
    });
    setCurrentPage(1);
    fetchSales(1, {});
  };

  const openEditModal = async (sale) => {
    try {
      setLoadingSale(true);
      setError('');
      
      // Fetch full sale data including items
      const response = await api.get(`/api/sales/${sale.id}/`);
      const fullSale = response.data;
      
      setSelectedSale(fullSale);
      setEditFormData({
        items: fullSale.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit: item.unit?.id || item.unit || '',
          unit_price: item.unit_price,
          price_mode: item.price_mode || 'standard'
        })),
        payment_type: fullSale.payment_status === 'paid' ? 'full' : 
                     fullSale.payment_status === 'partial' ? 'partial' : 'full',
        paid_amount: fullSale.paid_amount || 0
      });
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load sale details');
      console.error('Sale fetch error:', err);
    } finally {
      setLoadingSale(false);
    }
  };

  const cancelSale = async (saleId) => {
    try {
      setError('');
      const response = await api.post(`/api/sales/${saleId}/cancel/`);
      
      if (response.data.message === 'Sale cancelled and stock restored') {
        // Show refund information for completed sales
        if (response.data.refund_amount && response.data.refund_amount > 0) {
          alert(`Sale cancelled and stock restored successfully!\n\nRefund Information:\nOriginal Sale: ${response.data.original_sale_number}\nRefund Amount: $${response.data.refund_amount.toFixed(2)}\n\nPlease process the refund to the customer.`);
        } else {
          alert('Sale cancelled and stock restored successfully');
        }
      } else {
        alert('Sale cancelled successfully');
      }
      
      fetchSales(currentPage, filters);
      fetchProducts(); // Refresh products to update stock quantities
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel sale');
      console.error('Cancel sale error:', err);
    }
  };

  const createReturn = async (sale) => {
    try {
      setError('');
      
      // Prepare return data
      const returnData = {
        sale_type: 'return',
        original_sale: sale.id,
        customer_name: sale.customer_name || '',
        customer_phone: sale.customer_phone || '',
        customer_email: sale.customer_email || '',
        notes: `Return for sale ${sale.sale_number}`,
        items: sale.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          price_mode: item.price_mode || 'standard',
          original_sale_item: item.id
        }))
      };
      
      const response = await api.post('/api/sales/', returnData);
      
      alert(`Return created successfully: ${response.data.sale_number}. Stock has been restored.`);
      
      // Refresh the sales list and products
      fetchSales(currentPage, filters);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create return');
      console.error('Create return error:', err);
    }
  };

  const handlePaymentMethodChange = async (saleId, newPaymentMethod) => {
    try {
      setError('');
      await api.patch(`/sales/${saleId}/payment-method/`, {
        payment_method: newPaymentMethod
      });
      
      // Update the local state to reflect the change immediately
      setSales(prevSales => 
        prevSales.map(sale => 
          sale.id === saleId 
            ? { ...sale, payment_method: newPaymentMethod }
            : sale
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update payment method');
      console.error('Payment method update error:', err);
    }
  };

  const addEditItem = () => {
    setEditFormData(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unit: '', unit_price: 0 }]
    }));
  };

  const removeEditItem = (index) => {
    setEditFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateEditItem = (index, field, value) => {
    setEditFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const validateEditSale = () => {
    // Require at least 1 item for all sales (including returns)
    if (!editFormData.items || editFormData.items.length === 0) {
      return false;
    }

    // Check if any item has invalid quantity (allow quantity = 0)
    for (const item of editFormData.items) {
      const quantity = parseFloat(item.quantity);
      if (isNaN(quantity) || quantity < 0) {
        return false;
      }

      // Find the corresponding original item to check stock availability
      const originalItem = selectedSale?.items?.find(original => 
        original.product === item.product && 
        original.unit === item.unit && 
        original.price_mode === item.price_mode
      );

      if (originalItem) {
        // Calculate the quantity difference
        const originalQuantity = parseFloat(originalItem.quantity);
        const quantityDiff = quantity - originalQuantity;
        
        // If increasing quantity, check stock availability
        if (quantityDiff > 0) {
          // Find the product to get current stock
          const product = products.find(p => p.id === parseInt(item.product));
          if (product) {
            // Convert quantity difference to base units for stock check
            // This is a simplified check - in a real scenario, you'd need proper unit conversion
            const stockNeeded = quantityDiff;
            if (product.stock_quantity < stockNeeded) {
              return false;
            }
          }
        }
      }
    }

    // Validate payment logic
    if (editFormData.payment_type === 'partial') {
      const total = calculateEditTotal();
      const paidAmount = parseFloat(editFormData.paid_amount) || 0;
      
      // For partial payment, paid amount must be less than total and greater than 0
      if (paidAmount >= total || paidAmount <= 0) {
        return false;
      }
    } else if (editFormData.payment_type === 'full') {
      const total = calculateEditTotal();
      const paidAmount = parseFloat(editFormData.paid_amount) || 0;
      
      // For full payment, paid amount must equal total
      if (paidAmount !== total) {
        return false;
      }
    }

    return true;
  };

  const getProductPrice = (productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    return product ? product.price : 0;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      returned: 'status-returned',
      refunded: 'status-refunded'
    };
    return <span className={`status-badge ${statusClasses[status] || ''}`}>{status}</span>;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const paymentClasses = {
      pending: 'payment-pending',
      partial: 'payment-partial',
      paid: 'payment-paid'
    };
    const paymentLabels = {
      pending: 'Unpaid',
      partial: 'Partial',
      paid: 'Paid'
    };
    return <span className={`payment-badge ${paymentClasses[paymentStatus] || ''}`}>{paymentLabels[paymentStatus] || paymentStatus}</span>;
  };

  const calculateEditTotal = () => {
    return editFormData.items.reduce((total, item) => {
      return total + (parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0));
    }, 0);
  };

  // Update paid_amount when payment_type changes
  useEffect(() => {
    if (editFormData.payment_type === 'full') {
      setEditFormData(prev => ({
        ...prev,
        paid_amount: calculateEditTotal()
      }));
    }
  }, [editFormData.payment_type, editFormData.items]);

  // Sales app - all authenticated users can access sales management
  const handleSaleClick = async (sale) => {
      try {
        setSaleDetailLoading(true);
        setShowSaleModal(true);
        
        // Check if sale has an ID
        const saleId = sale.id || sale.sale_id;
        if (!saleId) {
          throw new Error(t('errors.not_found'));
        }
        
        // Fetch detailed sale information
        const response = await api.get(`/api/sales/${saleId}/`);
        setSelectedSale(response.data);
      } catch (err) {
        console.error('Failed to fetch sale details:', err);
        setError(`Failed to load sale details: ${err.message}`);
        setShowSaleModal(false);
      } finally {
        setSaleDetailLoading(false);
      }
    };

    const handleCloseSaleModal = () => {
      setShowSaleModal(false);
      setSelectedSale(null);
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    };
    
  return (
    <div className="sales-management">
      <div className="page-header">
        <h1>{t('titles.sales_management')}</h1>
        <div className="header-actions">
          <PrintButton
            data={{
              ...sales,
              user_name: user?.username || t('app.unknown_user'),
              user_id: user?.id || 'unknown',
              print_timestamp: new Date().toISOString(),
              print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }}
            title={t('titles.sales_management_report')}
            type="sales_history"
            printText={t('buttons.print_sales_report')}
            className="print-sales-report-btn"
          />
          <Button 
            variant="danger" 
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Sales
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Enhanced Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="form-group">
            <label>Sale Number</label>
            <input
              type="text"
              name="sale_number"
              value={filters.sale_number}
              onChange={handleFilterChange}
              placeholder="Enter sale number"
            />
          </div>
          
          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          
          {/* Added Payment Status Filter */}
          <div className="form-group">
            <label>Payment Status</label>
            <select
              name="payment_status"
              value={filters.payment_status}
              onChange={handleFilterChange}
            >
              <option value="">All Payment Statuses</option>
              <option value="pending">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Customer Name</label>
            <input
              type="text"
              name="customer_name"
              value={filters.customer_name}
              onChange={handleFilterChange}
              placeholder={t('forms.search_by_customer_name')}
            />
          </div>
          
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </div>
        </div>
        
        <div className="filter-actions">
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
          <Button variant="primary" onClick={applyFilters}>
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Pagination Info */}
      <div className="pagination-info-top">
        Showing {sales.length} of {totalCount} sales (Page {currentPage} of {totalPages})
      </div>

      {/* Sales Table */}
      <div className="table-section">
        {loading ? (
          <div className="loading">Loading sales...</div>
        ) : (
          <>
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
                
                {/* Page Numbers */}
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`btn-pagination ${currentPage === page ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
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
            <Table
              data={sales}
              columns={[
                {
                  key: 'sale_number',
                  header: t('table_headers.sale_number'),
                  render: (value, row) => (
                    <span
                      className="sale-number clickable"
                      onClick={() => handleSaleClick(row)}
                    >
                      {value}
                    </span>
                  )
                },
                {
                  key: 'customer_name',
                  header: t('table_headers.customer'),
                  render: (value) => value || 'N/A'
                },
                {
                  key: 'status',
                  header: t('table_headers.status'),
                  render: (value) => (
                    <div className="status-container">
                      <div className="sale-status">{getStatusBadge(value)}</div>
                    </div>
                  )
                },
                {
                  key: 'payment_status',
                  header: t('table_headers.payment'),
                  render: (value) => {
                    const paymentClasses = {
                      pending: 'payment-pending',
                      partial: 'payment-partial',
                      paid: 'payment-paid'
                    };
                    const paymentLabels = {
                      pending: t('status_labels.pending'),
                      partial: t('status_labels.partial'),
                      paid: t('status_labels.paid')
                    };
                    return (
                      <span className={`payment-badge ${paymentClasses[value] || ''}`}>
                        {paymentLabels[value] || value}
                      </span>
                    );
                  }
                },
                {
                  key: 'items',
                  header: t('table_headers.items'),
                  render: (items) => {
                    if (!items || items.length === 0)
                      return <span className="no-items">No items</span>;
                    return (
                      <div className="sale-items">
                        {items.slice(0, 2).map((item, index) => (
                          <div key={index} className="sale-item-row">
                            <span className="item-name">
                              {item.product_name}
                              <span
                                className={`price-mode-badge ${item.price_mode || 'standard'}`}
                              >
                                {item.price_mode === 'wholesale' ? 'WS' : 'STD'}
                              </span>
                            </span>
                            <span className="item-details">
                              {item.quantity_display || item.quantity}{' '}
                              {item.unit_symbol || 'pcs'} × {formatCurrency(item.unit_price)}
                            </span>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <div className="more-items">+{items.length - 2} more items</div>
                        )}
                      </div>
                    );
                  }
                },
                {
                  key: 'total_amount',
                  header: t('table_headers.total_amount'),
                  render: (value) => (
                    <div className="amount-container">
                      <div className="total-amount">{formatCurrency(value)}</div>
                    </div>
                  )
                },
                {
                  key: 'created_at',
                  header: t('table_headers.date'),
                  render: (value) => formatDate(value)
                },
                {
                  key: 'sold_by_name',
                  header: t('table_headers.sold_by'),
                  render: (value) => value || 'N/A'
                },
                {
                  key: 'payment_method',
                  header: t('table_headers.payment_method'),
                  render: (value, row) => {
                    if (row.status === 'pending') {
                      return (
                        <select
                          value={value || 'cash'}
                          onChange={(e) => handlePaymentMethodChange(row.id, e.target.value)}
                          className="payment-method-select"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="mobile_money">Mobile Money</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      );
                    }
                    const methodLabels = {
                      cash: t('payment_methods.cash'),
                      card: t('payment_methods.card'),
                      mobile_money: t('payment_methods.mobile_money'),
                      bank_transfer: t('payment_methods.bank_transfer')
                    };
                    return (
                      <span className="payment-method-display">
                        {methodLabels[value] || value || 'Cash'}
                      </span>
                    );
                  }
                },
                {
                  key: 'paid_amount',
                  header: t('table_headers.paid_amount'),
                  render: (value) => (
                    <div className="payment-amount-container">
                      <div className="paid-amount">
                        {formatCurrency(parseFloat(value) || 0)}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'actions',
                  header: t('table_headers.actions'),
                  render: (_, row) => (
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      {!(row.status === 'completed' && row.payment_status === 'paid') &&
                        row.status !== 'refunded' && (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => openEditModal(row)}
                            loading={loadingSale}
                            disabled={loadingSale}
                          >
                            Edit
                          </Button>
                        )}
                      {row.status === 'completed' &&
                        row.status !== 'refunded' &&
                        row.sale_type !== 'return' && (
                          <Button
                            variant="warning"
                            size="small"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to create a return for this sale? This will restore stock and mark the sale as refunded.`
                                )
                              ) {
                                createReturn(row);
                              }
                            }}
                            loading={loadingSale}
                            disabled={loadingSale}
                          >
                            Return
                          </Button>
                        )}
                      {(row.status === 'pending' || row.status === 'completed') &&
                        row.status !== 'refunded' &&
                        row.sale_type !== 'return' && (
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to cancel this ${row.status} sale?`
                                )
                              ) {
                                cancelSale(row.id);
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                    </div>
                  )
                }
              ]}
              onRowClick={(row) => handleSaleClick(row)}
            />

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
                
                {/* Page Numbers */}
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`btn-pagination ${currentPage === page ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
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
          </>
        )}
      </div>

      {/* Rest of your modals remain the same */}
      {/* Delete Sales Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Sales</h2>
              <button className="close-button" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Select criteria to delete sales:</p>
              
              <div className="form-group">
                <label>Customer Name (optional)</label>
                <input
                  type="text"
                  name="customer_name"
                  value={deleteFilters.customer_name}
                  onChange={handleDeleteFilterChange}
                  placeholder={t('forms.leave_empty_to_delete_all')}
                />
              </div>
              
              <div className="form-group">
                <label>Start Date (optional)</label>
                <input
                  type="date"
                  name="start_date"
                  value={deleteFilters.start_date}
                  onChange={handleDeleteFilterChange}
                />
              </div>
              
              <div className="form-group">
                <label>End Date (optional)</label>
                <input
                  type="date"
                  name="end_date"
                  value={deleteFilters.end_date}
                  onChange={handleDeleteFilterChange}
                />
              </div>
              
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={deleteFilters.status}
                  onChange={handleDeleteFilterChange}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteSales}>
                  Delete Sales
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h2>
                {selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid' ? t('modals.view_sale') : t('modals.edit_sale')}: {selectedSale?.sale_number || t('app.loading')}
                {selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid' && (
                  <span className="view-only-badge">{t('modals.view_only')}</span>
                )}
              </h2>
              <button className="close-button" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {loadingSale ? (
                <div className="loading">Loading sale details...</div>
              ) : selectedSale ? (
                <>
                  <div className="edit-sale-info">
                    <p><strong>Customer:</strong> {selectedSale.customer_name || 'N/A'}</p>
                    <p><strong>Date:</strong> {formatDate(selectedSale.created_at)}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedSale.status)}</p>
                    <p><strong>Payment Status:</strong> {getPaymentStatusBadge(selectedSale.payment_status)}</p>
                    <p><strong>Total Amount:</strong> ${selectedSale.total_amount}</p>
                    <p><strong>Paid Amount:</strong> ${selectedSale.paid_amount}</p>
                    {selectedSale.payment_status === 'partial' && (
                      <p><strong>Remaining Amount:</strong> ${selectedSale.remaining_amount}</p>
                    )}
                    {selectedSale.due_date && (
                      <p><strong>Due Date:</strong> {formatDate(selectedSale.due_date)}</p>
                    )}
                  </div>
                  
                  <h3>Sale Items</h3>
                  <div className="edit-items">
                    {editFormData.items.map((item, index) => {
                      const originalItem = selectedSale?.items?.find(origItem => 
                        origItem.product === item.product && 
                        origItem.unit === item.unit &&
                        origItem.price_mode === item.price_mode
                      );
                      
                      return (
                        <div key={index} className="edit-item">
                          <div className="form-group">
                            <label>Product</label>
                            <input
                              type="text"
                              value={originalItem?.product_name || t('app.unknown_product')}
                              readOnly
                              className="readonly-field"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Unit</label>
                            <input
                              type="text"
                              value={originalItem?.unit_name ? `${originalItem.unit_name} (${originalItem.unit_symbol})` : 'N/A'}
                              readOnly
                              className="readonly-field"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Price Mode</label>
                            <input
                              type="text"
                              value={item.price_mode === 'wholesale' ? 'Wholesale (WS)' : 'Standard (STD)'}
                              readOnly
                              className="readonly-field"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Unit Price</label>
                            <input
                              type="text"
                              value={formatCurrency(item.unit_price)}
                              readOnly
                              className="readonly-field"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Quantity</label>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateEditItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              readOnly={selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid'}
                              className={selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid' ? 'read-only-input' : ''}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Total</label>
                            <input
                              type="text"
                              value={formatCurrency(item.quantity * item.unit_price)}
                              readOnly
                              className="readonly-field"
                            />
                          </div>
                        
                        {!(selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid') && (
                          <Button 
                            variant="danger" 
                            size="small"
                            onClick={() => removeEditItem(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  
                  {!(selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid') && (
                    <>
                      <h3>Payment Options</h3>
                      <div className="payment-section">
                        <div className="form-group">
                          <label>Payment Type</label>
                          <div className="payment-types">
                            <label className="payment-type">
                              <input
                                type="radio"
                                name="editPaymentType"
                                value="full"
                                checked={editFormData.payment_type === 'full'}
                                onChange={(e) => setEditFormData(prev => ({
                                  ...prev,
                                  payment_type: e.target.value,
                                  paid_amount: e.target.value === 'full' ? calculateEditTotal() : prev.paid_amount
                                }))}
                                disabled={selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid'}
                              />
                              <span>Full Payment (100%)</span>
                            </label>
                            <label className="payment-type">
                              <input
                                type="radio"
                                name="editPaymentType"
                                value="partial"
                                checked={editFormData.payment_type === 'partial'}
                                onChange={(e) => setEditFormData(prev => ({
                                  ...prev,
                                  payment_type: e.target.value
                                }))}
                                disabled={selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid'}
                              />
                              <span>Partial Payment (0-99.99%)</span>
                            </label>
                          </div>
                        </div>
                        
                        {editFormData.payment_type === 'partial' && (
                          <div className="form-group">
                            <label>Amount to Pay</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={calculateEditTotal()}
                              value={editFormData.paid_amount || 0}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setEditFormData(prev => ({
                                  ...prev,
                                  paid_amount: value
                                }));
                              }}
                              placeholder={t('forms.enter_amount_to_pay')}
                              readOnly={selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid'}
                              className={selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid' ? 'read-only-input' : ''}
                            />
                            <small>
                              Total: ${calculateEditTotal().toFixed(2)} | 
                              Remaining: ${(calculateEditTotal() - (editFormData.paid_amount || 0)).toFixed(2)}
                            </small>
                          </div>
                        )}
                        
                        {editFormData.payment_type === 'full' && (
                          <div className="form-group">
                            <label>Amount to Pay</label>
                            <input
                              type="number"
                              step="0.01"
                              value={calculateEditTotal()}
                              readOnly
                              className="form-control"
                            />
                            <small>Full payment for the total amount.</small>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="modal-actions">
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                      {selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid' ? t('modals.close') : t('modals.cancel')}
                    </Button>
                    {!(selectedSale?.status === 'completed' && selectedSale?.payment_status === 'paid') && (
                      <Button 
                        variant="primary" 
                        onClick={handleEditSale}
                        disabled={!validateEditSale()}
                      >
                        Update Sale
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="error-message">
                  Failed to load sale details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Make Payment - {selectedSale.sale_number}</h2>
              <button className="close-button" onClick={() => setShowPaymentModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="payment-info">
                <p><strong>Customer:</strong> {selectedSale.customer_name || 'N/A'}</p>
                <p><strong>Total Amount:</strong> ${selectedSale.total_amount}</p>
                <p><strong>Paid Amount:</strong> ${selectedSale.paid_amount}</p>
                <p><strong>Remaining Amount:</strong> ${selectedSale.remaining_amount}</p>
              </div>
              
              <div className="form-group">
                <label>Payment Amount (Full Payment Only)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedSale.remaining_amount}
                  readOnly
                  className="form-control"
                />
                <small>This will be a full payment for the remaining amount.</small>
              </div>
              
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="success" 
                  onClick={() => handleMakePayment(selectedSale.id, selectedSale.remaining_amount)}
                >
                  Process Payment (${selectedSale.remaining_amount})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {showSaleModal && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={handleCloseSaleModal}
          loading={saleDetailLoading}
        />
      )}
    </div>
  );
};

export default SalesManagement;