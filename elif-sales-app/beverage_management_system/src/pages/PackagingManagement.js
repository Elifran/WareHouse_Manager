import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import './PackagingManagement.css';

const PackagingManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [statistics, setStatistics] = useState({});
  
  // Pagination states
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const [currentSalePage, setCurrentSalePage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter states
  const [transactionFilters, setTransactionFilters] = useState({
    search: '',
    status: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    transactionType: ''
  });

  const [saleFilters, setSaleFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    transaction_type: 'consignation',
    sale: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    payment_method: 'cash',
    status: 'active',
    notes: '',
    items: []
  });
  
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    notes: ''
  });

  const [settleData, setSettleData] = useState({
    settlement_type: 'return',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchSales();
    fetchStatistics();
  }, []);

  useEffect(() => {
    applyTransactionFilters();
  }, [transactions, transactionFilters]);

  useEffect(() => {
    applySaleFilters();
  }, [sales, saleFilters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/packaging/transactions/');
      setTransactions(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load packaging transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionDetails = async (transactionId) => {
    try {
      const response = await api.get(`/api/packaging/transactions/${transactionId}/`);
      setTransactionDetails(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to load transaction details');
      console.error('Error fetching transaction details:', err);
      return null;
    }
  };

  const fetchSales = async () => {
    try {
      const response = await api.get('/api/sales/');
      setSales(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/api/packaging/statistics/');
      setStatistics(response.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Filter functions
  const applyTransactionFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (transactionFilters.search) {
      const searchLower = transactionFilters.search.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.transaction_number?.toLowerCase().includes(searchLower) ||
        transaction.customer_name?.toLowerCase().includes(searchLower) ||
        transaction.sale_number?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (transactionFilters.status) {
      filtered = filtered.filter(transaction => transaction.status === transactionFilters.status);
    }

    // Payment status filter
    if (transactionFilters.paymentStatus) {
      filtered = filtered.filter(transaction => transaction.payment_status === transactionFilters.paymentStatus);
    }

    // Transaction type filter
    if (transactionFilters.transactionType) {
      filtered = filtered.filter(transaction => transaction.transaction_type === transactionFilters.transactionType);
    }

    // Date range filter
    if (transactionFilters.startDate) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.created_at) >= new Date(transactionFilters.startDate)
      );
    }

    if (transactionFilters.endDate) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.created_at) <= new Date(transactionFilters.endDate + 'T23:59:59')
      );
    }

    setFilteredTransactions(filtered);
    setCurrentTransactionPage(1); // Reset to first page when filters change
  };

  const applySaleFilters = () => {
    let filtered = sales.filter(sale => sale.packaging_items && sale.packaging_items.length > 0);

    // Search filter
    if (saleFilters.search) {
      const searchLower = saleFilters.search.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.sale_number?.toLowerCase().includes(searchLower) ||
        sale.customer_name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (saleFilters.status) {
      filtered = filtered.filter(sale => sale.status === saleFilters.status);
    }

    // Date range filter
    if (saleFilters.startDate) {
      filtered = filtered.filter(sale => 
        new Date(sale.created_at) >= new Date(saleFilters.startDate)
      );
    }

    if (saleFilters.endDate) {
      filtered = filtered.filter(sale => 
        new Date(sale.created_at) <= new Date(saleFilters.endDate + 'T23:59:59')
      );
    }

    setFilteredSales(filtered);
    setCurrentSalePage(1); // Reset to first page when filters change
  };

  const handleTransactionFilterChange = (key, value) => {
    setTransactionFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaleFilterChange = (key, value) => {
    setSaleFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearTransactionFilters = () => {
    setTransactionFilters({
      search: '',
      status: '',
      paymentStatus: '',
      startDate: '',
      endDate: '',
      transactionType: ''
    });
  };

  const clearSaleFilters = () => {
    setSaleFilters({
      search: '',
      status: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleViewDetails = async (transaction) => {
    try {
      setSelectedTransaction(transaction);
      setLoading(true);
      const details = await fetchTransactionDetails(transaction.id);
      if (details) {
        setTransactionDetails(details);
        setShowDetailsModal(true);
      }
    } catch (err) {
      setError('Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculations
  const getCurrentTransactions = () => {
    const startIndex = (currentTransactionPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  };

  const getCurrentSales = () => {
    const startIndex = (currentSalePage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSales.slice(startIndex, endIndex);
  };

  const getTotalTransactionPages = () => {
    return Math.ceil(filteredTransactions.length / itemsPerPage);
  };

  const getTotalSalePages = () => {
    return Math.ceil(filteredSales.length / itemsPerPage);
  };

  const handleMakePayment = async () => {
    try {
      setError('');
      setSuccess('');

      if (!selectedTransaction || !paymentData.amount) {
        setError('Please select a transaction and enter payment amount');
        return;
      }

      await api.post(`/api/packaging/transactions/${selectedTransaction.id}/payments/`, paymentData);
      setSuccess('Payment processed successfully');
      setPaymentData({ amount: 0, payment_method: 'cash', notes: '' });
      setShowPaymentForm(false);
      setSelectedTransaction(null);
      fetchTransactions();
      fetchStatistics();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process payment');
      console.error('Error processing payment:', err);
    }
  };

  const handleSettleTransaction = async () => {
    try {
      setError('');
      setSuccess('');

      if (!selectedTransaction) {
        setError('Please select a transaction to settle');
        return;
      }

      await api.post(`/api/packaging/transactions/${selectedTransaction.id}/settle/`, settleData);
      setSuccess('Packaging transaction settled successfully');
      setSettleData({ settlement_type: 'return', notes: '' });
      setShowSettleForm(false);
      setSelectedTransaction(null);
      fetchTransactions();
      fetchStatistics();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to settle transaction');
      console.error('Error settling transaction:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'status-active',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return <span className={`status-badge ${statusClasses[status] || ''}`}>{status}</span>;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const paymentClasses = {
      pending: 'payment-pending',
      partial: 'payment-partial',
      paid: 'payment-paid',
      refunded: 'payment-refunded'
    };
    const paymentLabels = {
      pending: 'Unpaid',
      partial: 'Partial',
      paid: 'Paid',
      refunded: 'Refunded'
    };
    return <span className={`payment-badge ${paymentClasses[paymentStatus] || ''}`}>{paymentLabels[paymentStatus] || paymentStatus}</span>;
  };

  if (loading && !showDetailsModal) {
    return (
      <div className="packaging-management">
        <div className="loading">Loading packaging transactions...</div>
      </div>
    );
  }

  const currentTransactions = getCurrentTransactions();
  const currentSales = getCurrentSales();
  const totalTransactionPages = getTotalTransactionPages();
  const totalSalePages = getTotalSalePages();

  const hasActiveTransactionFilters = Object.values(transactionFilters).some(value => value !== '');
  const hasActiveSaleFilters = Object.values(saleFilters).some(value => value !== '');

  return (
    <div className="packaging-management">
      <div className="page-header">
        <h1>Packaging Management</h1>
        <div className="header-actions">
          <div className="info-text">
            <small>Packaging transactions are automatically created when sales are completed</small>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Statistics */}
      <div className="statistics-grid">
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <p>{statistics.total_transactions || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Active Transactions</h3>
          <p>{statistics.active_transactions || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Amount</h3>
          <p>{formatCurrency(statistics.total_amount || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Paid Amount</h3>
          <p>{formatCurrency(statistics.paid_amount || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Remaining Amount</h3>
          <p>{formatCurrency(statistics.remaining_amount || 0)}</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="transactions-section">
        <div className="section-header">
          <h2>Packaging Transactions</h2>
          {totalTransactionPages > 1 && (
            <div className="pagination-info">
              Page {currentTransactionPage} of {totalTransactionPages} 
              ({filteredTransactions.length} filtered of {transactions.length} total)
            </div>
          )}
        </div>

        {/* Transaction Filters */}
        <div className="filters-section">
          <div className="filters-header">
            <h3>Filters</h3>
            {hasActiveTransactionFilters && (
              <Button onClick={clearTransactionFilters} variant="text" size="small">
                Clear All Filters
              </Button>
            )}
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search by transaction, customer, or sale..."
                value={transactionFilters.search}
                onChange={(e) => handleTransactionFilterChange('search', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select
                value={transactionFilters.status}
                onChange={(e) => handleTransactionFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Payment Status</label>
              <select
                value={transactionFilters.paymentStatus}
                onChange={(e) => handleTransactionFilterChange('paymentStatus', e.target.value)}
              >
                <option value="">All Payment Statuses</option>
                <option value="pending">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Transaction Type</label>
              <select
                value={transactionFilters.transactionType}
                onChange={(e) => handleTransactionFilterChange('transactionType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="consignation">Consignation</option>
                <option value="exchange">Exchange</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={transactionFilters.startDate}
                onChange={(e) => handleTransactionFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={transactionFilters.endDate}
                onChange={(e) => handleTransactionFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {filteredTransactions.length === 0 ? (
          <div className="no-data">
            {transactions.length === 0 
              ? 'No packaging transactions found' 
              : 'No transactions match your filters'}
          </div>
        ) : (
          <>
            <div className="transactions-list">
              {currentTransactions.map(transaction => (
                <div key={transaction.id} className="transaction-card">
                  <div className="transaction-header">
                    <div className="transaction-info">
                      <h3>{transaction.transaction_number}</h3>
                      <p>Sale: {transaction.sale_number}</p>
                      <p>Customer: {transaction.customer_name || 'N/A'}</p>
                    </div>
                    <div className="transaction-status">
                      {getStatusBadge(transaction.status)}
                      {getPaymentStatusBadge(transaction.payment_status)}
                    </div>
                  </div>
                  
                  <div className="transaction-details">
                    {(() => {
                      const showAmounts = transaction.transaction_type === 'consignation';
                      const amountOrDash = (val) => showAmounts ? formatCurrency(val) : '-';
                      return (
                        <>
                          <div className="detail-row">
                            <span>Type:</span>
                            <span>{transaction.transaction_type}</span>
                          </div>
                          <div className="detail-row">
                            <span>Total Amount:</span>
                            <span>{amountOrDash(transaction.total_amount)}</span>
                          </div>
                          <div className="detail-row">
                            <span>Paid Amount:</span>
                            <span>{amountOrDash(transaction.paid_amount)}</span>
                          </div>
                          <div className="detail-row">
                            <span>Remaining:</span>
                            <span>{amountOrDash(transaction.remaining_amount)}</span>
                          </div>
                          <div className="detail-row">
                            <span>Created:</span>
                            <span>{formatDate(transaction.created_at)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="transaction-actions">
                    {(
                      transaction.transaction_type === 'consignation' &&
                      transaction.status === 'active' &&
                      (transaction.payment_status === 'pending' || transaction.payment_status === 'partial') &&
                      transaction.remaining_amount > 0
                    ) && (
                      <Button 
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setPaymentData(prev => ({ ...prev, amount: transaction.remaining_amount }));
                          setShowPaymentForm(true);
                        }}
                        variant="primary"
                        size="small"
                      >
                        Make Payment
                      </Button>
                    )}
                    {(transaction.status === 'active' && (transaction.transaction_type === 'due')) && (
                      <Button 
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setSettleData({ settlement_type: 'return', notes: '' });
                          setShowSettleForm(true);
                        }}
                        variant="success"
                        size="small"
                      >
                        Settle
                      </Button>
                    )}
                    {(transaction.transaction_type === 'consignation' && transaction.payment_status === 'paid') && (
                      <Button 
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setSettleData({ settlement_type: 'return', notes: '' });
                          setShowSettleForm(true);
                        }}
                        variant="warning"
                        size="small"
                      >
                        Mark Returned
                      </Button>
                    )}

                    {/* Delete action for any packaging transaction */}
                    <Button 
                      onClick={async () => {
                        try {
                          setError('');
                          setSuccess('');
                          await api.delete(`/api/packaging/transactions/${transaction.id}/`);
                          setSuccess('Packaging transaction deleted');
                          fetchTransactions();
                          fetchStatistics();
                        } catch (err) {
                          setError(err.response?.data?.error || 'Failed to delete transaction');
                        }
                      }}
                      variant="danger"
                      size="small"
                    >
                      Delete
                    </Button>
                    <Button 
                      onClick={() => handleViewDetails(transaction)}
                      variant="secondary"
                      size="small"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Transactions Pagination */}
            {totalTransactionPages > 1 && (
              <div className="pagination-controls">
                <Button 
                  onClick={() => setCurrentTransactionPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentTransactionPage === 1}
                  variant="secondary"
                  size="small"
                >
                  Previous
                </Button>
                
                <span className="page-indicator">
                  Page {currentTransactionPage} of {totalTransactionPages}
                </span>
                
                <Button 
                  onClick={() => setCurrentTransactionPage(prev => Math.min(prev + 1, totalTransactionPages))}
                  disabled={currentTransactionPage === totalTransactionPages}
                  variant="secondary"
                  size="small"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sales with Packaging */}
      <div className="sales-section">
        <div className="section-header">
          <h2>Sales with Packaging</h2>
          {totalSalePages > 1 && (
            <div className="pagination-info">
              Page {currentSalePage} of {totalSalePages}
              ({filteredSales.length} filtered)
            </div>
          )}
        </div>

        {/* Sale Filters */}
        <div className="filters-section">
          <div className="filters-header">
            <h3>Filters</h3>
            {hasActiveSaleFilters && (
              <Button onClick={clearSaleFilters} variant="text" size="small">
                Clear All Filters
              </Button>
            )}
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search by sale number or customer..."
                value={saleFilters.search}
                onChange={(e) => handleSaleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select
                value={saleFilters.status}
                onChange={(e) => handleSaleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={saleFilters.startDate}
                onChange={(e) => handleSaleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={saleFilters.endDate}
                onChange={(e) => handleSaleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {filteredSales.length === 0 ? (
          <div className="no-data">
            {sales.filter(s => s.packaging_items && s.packaging_items.length > 0).length === 0
              ? 'No sales with packaging found' 
              : 'No sales match your filters'}
          </div>
        ) : (
          <>
            <div className="sales-list">
              {currentSales.map(sale => (
                <div key={sale.id} className="sale-card">
                  <div className="sale-header">
                    <div className="sale-info">
                      <h3>{sale.sale_number}</h3>
                      <p>Customer: {sale.customer_name || 'Walk-in Customer'}</p>
                      <p>Date: {formatDate(sale.created_at)}</p>
                      <p>Status: {sale.status}</p>
                    </div>
                  </div>
                  
                  <div className="packaging-summary">
                    <h4>Packaging Items ({sale.packaging_items.length})</h4>
                    <div className="packaging-items">
                      {sale.packaging_items.map((item, index) => (
                        <div key={index} className="packaging-item">
                          <span>{item.product_name} x {item.quantity} = {formatCurrency(item.total_price)}</span>
                          <span className={`status-badge ${item.status}`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                    {sale.status === 'completed' && (
                      <div className="auto-created-notice">
                        <small>✅ Packaging transaction automatically created</small>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sales Pagination */}
            {totalSalePages > 1 && (
              <div className="pagination-controls">
                <Button 
                  onClick={() => setCurrentSalePage(prev => Math.max(prev - 1, 1))}
                  disabled={currentSalePage === 1}
                  variant="secondary"
                  size="small"
                >
                  Previous
                </Button>
                
                <span className="page-indicator">
                  Page {currentSalePage} of {totalSalePages}
                </span>
                
                <Button 
                  onClick={() => setCurrentSalePage(prev => Math.min(prev + 1, totalSalePages))}
                  disabled={currentSalePage === totalSalePages}
                  variant="secondary"
                  size="small"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h2>Transaction Details - {selectedTransaction.transaction_number}</h2>
              <button onClick={() => setShowDetailsModal(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              {loading ? (
                <div className="loading">Loading details...</div>
              ) : transactionDetails ? (
                <div className="transaction-details-content">
                  {/* Basic Information */}
                  <div className="details-section">
                    <h3>Basic Information</h3>
                    <div className="details-grid">
                      <div className="detail-item">
                        <label>Transaction Number:</label>
                        <span>{transactionDetails.transaction_number}</span>
                      </div>
                      <div className="detail-item">
                        <label>Sale Number:</label>
                        <span>{transactionDetails.sale_number}</span>
                      </div>
                      <div className="detail-item">
                        <label>Customer:</label>
                        <span>{transactionDetails.customer_name || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Transaction Type:</label>
                        <span>{transactionDetails.transaction_type}</span>
                      </div>
                      <div className="detail-item">
                        <label>Status:</label>
                        <span>{getStatusBadge(transactionDetails.status)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Payment Status:</label>
                        <span>{getPaymentStatusBadge(transactionDetails.payment_status)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Created Date:</label>
                        <span>{formatDateTime(transactionDetails.created_at)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Last Updated:</label>
                        <span>{formatDateTime(transactionDetails.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="details-section">
                    <h3>Financial Summary</h3>
                    <div className="financial-grid">
                      <div className="financial-item">
                        <label>Total Amount:</label>
                        <span className="amount">{formatCurrency(transactionDetails.total_amount)}</span>
                      </div>
                      <div className="financial-item">
                        <label>Paid Amount:</label>
                        <span className="amount paid">{formatCurrency(transactionDetails.paid_amount)}</span>
                      </div>
                      <div className="financial-item">
                        <label>Remaining Amount:</label>
                        <span className="amount remaining">{formatCurrency(transactionDetails.remaining_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Packaging Items */}
                  {transactionDetails.items && transactionDetails.items.length > 0 && (
                    <div className="details-section">
                      <h3>Packaging Items ({transactionDetails.items.length})</h3>
                      <div className="items-table">
                        <div className="table-header">
                          <div>Product Name</div>
                          <div>Quantity</div>
                          <div>Unit Price</div>
                          <div>Total Price</div>
                          <div>Status</div>
                        </div>
                        <div className="table-body">
                          {transactionDetails.items.map((item, index) => (
                            <div key={index} className="table-row">
                              <div>{item.product_name}</div>
                              <div>{item.quantity}</div>
                              <div>{formatCurrency(item.unit_price)}</div>
                              <div>{formatCurrency(item.total_price)}</div>
                              <div>
                                <span className={`status-badge ${item.status}`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  {transactionDetails.payments && transactionDetails.payments.length > 0 && (
                    <div className="details-section">
                      <h3>Payment History ({transactionDetails.payments.length})</h3>
                      <div className="items-table">
                        <div className="table-header">
                          <div>Date</div>
                          <div>Amount</div>
                          <div>Method</div>
                          <div>Notes</div>
                        </div>
                        <div className="table-body">
                          {transactionDetails.payments.map((payment, index) => (
                            <div key={index} className="table-row">
                              <div>{formatDateTime(payment.created_at)}</div>
                              <div>{formatCurrency(payment.amount)}</div>
                              <div>{payment.payment_method}</div>
                              <div>{payment.notes || '-'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {transactionDetails.notes && (
                    <div className="details-section">
                      <h3>Notes</h3>
                      <div className="notes-content">
                        {transactionDetails.notes}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="error-message">Failed to load transaction details</div>
              )}
            </div>

            <div className="modal-footer">
              <Button onClick={() => setShowDetailsModal(false)} variant="secondary">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentForm && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Make Payment</h2>
              <button onClick={() => setShowPaymentForm(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="payment-info">
                <p><strong>Transaction:</strong> {selectedTransaction.transaction_number}</p>
                <p><strong>Customer:</strong> {selectedTransaction.customer_name || 'N/A'}</p>
                <p><strong>Total Amount:</strong> {formatCurrency(selectedTransaction.total_amount)}</p>
                <p><strong>Paid Amount:</strong> {formatCurrency(selectedTransaction.paid_amount)}</p>
                <p><strong>Remaining:</strong> {formatCurrency(selectedTransaction.remaining_amount)}</p>
              </div>

              <div className="form-group">
                <label>Payment Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedTransaction.remaining_amount}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
              </div>
            </div>

            <div className="modal-footer">
              <Button onClick={handleMakePayment} variant="primary">
                Process Payment
              </Button>
              <Button onClick={() => setShowPaymentForm(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleForm && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Settle Packaging Transaction</h2>
              <button onClick={() => setShowSettleForm(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="payment-info">
                <p><strong>Transaction:</strong> {selectedTransaction.transaction_number}</p>
                <p><strong>Customer:</strong> {selectedTransaction.customer_name || 'N/A'}</p>
                <p><strong>Sale:</strong> {selectedTransaction.sale_number}</p>
                <p><strong>Total Amount:</strong> {formatCurrency(selectedTransaction.total_amount)}</p>
                <p><strong>Paid Amount:</strong> {formatCurrency(selectedTransaction.paid_amount)}</p>
                <p><strong>Remaining:</strong> {formatCurrency(selectedTransaction.remaining_amount)}</p>
              </div>

              <div className="form-group">
                <label>Settlement Type *</label>
                <select
                  value={settleData.settlement_type}
                  onChange={(e) => setSettleData(prev => ({ ...prev, settlement_type: e.target.value }))}
                  required
                >
                  <option value="return">Packaging Returned</option>
                  <option value="refund">Deposit Refunded</option>
                </select>
                <small>
                  {settleData.settlement_type === 'return' 
                    ? 'Customer returned the packaging items' 
                    : 'Customer received refund for packaging deposit'}
                </small>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={settleData.notes}
                  onChange={(e) => setSettleData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  placeholder="Additional notes about the settlement..."
                />
              </div>

              <div className="settlement-warning">
                <p><strong>⚠️ Warning:</strong> This action will mark the packaging transaction as completed and cannot be undone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <Button onClick={handleSettleTransaction} variant="success">
                Settle Transaction
              </Button>
              <Button onClick={() => setShowSettleForm(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagingManagement;