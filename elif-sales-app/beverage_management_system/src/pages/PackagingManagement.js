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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sales, setSales] = useState([]);
  const [statistics, setStatistics] = useState({});
  
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

  if (loading) {
    return (
      <div className="packaging-management">
        <div className="loading">Loading packaging transactions...</div>
      </div>
    );
  }

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

      {/* Recent Sales with Packaging */}
      <div className="sales-section">
        <h2>Recent Sales with Packaging</h2>
        {sales.length === 0 ? (
          <div className="no-data">No sales found</div>
        ) : (
          <div className="sales-list">
            {sales.filter(sale => sale.packaging_items && sale.packaging_items.length > 0).slice(0, 5).map(sale => (
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
        )}
      </div>

      {/* Transactions List */}
      <div className="transactions-section">
        <h2>Packaging Transactions</h2>
        {transactions.length === 0 ? (
          <div className="no-data">No packaging transactions found</div>
        ) : (
          <div className="transactions-list">
            {transactions.map(transaction => (
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
                  <div className="detail-row">
                    <span>Type:</span>
                    <span>{transaction.transaction_type}</span>
                  </div>
                  <div className="detail-row">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(transaction.total_amount)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Paid Amount:</span>
                    <span>{formatCurrency(transaction.paid_amount)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Remaining:</span>
                    <span>{formatCurrency(transaction.remaining_amount)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Created:</span>
                    <span>{formatDate(transaction.created_at)}</span>
                  </div>
                </div>

                <div className="transaction-actions">
                  {transaction.remaining_amount > 0 && (
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
                  {transaction.status === 'active' && (
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
                  <Button 
                    onClick={() => {
                      // View details
                      console.log('View transaction details:', transaction);
                    }}
                    variant="secondary"
                    size="small"
                    >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


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
