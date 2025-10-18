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

  const handleCreateTransaction = async () => {
    try {
      setError('');
      setSuccess('');

      if (!formData.sale) {
        setError('Please select a sale');
        return;
      }

      if (formData.items.length === 0) {
        setError('Please add at least one packaging item');
        return;
      }

      await api.post('/api/packaging/transactions/', formData);
      setSuccess('Packaging transaction created successfully');
      setFormData({
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
      setShowCreateForm(false);
      fetchTransactions();
      fetchStatistics();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create packaging transaction');
      console.error('Error creating transaction:', err);
    }
  };

  const handleCreateFromSale = async (saleId) => {
    try {
      setError('');
      setSuccess('');

      await api.post(`/api/packaging/sales/${saleId}/create/`);
      setSuccess('Packaging transaction created from sale successfully');
      fetchTransactions();
      fetchStatistics();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create packaging transaction from sale');
      console.error('Error creating transaction from sale:', err);
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

  const handleSaleChange = (saleId) => {
    const sale = sales.find(s => s.id === parseInt(saleId));
    if (sale) {
      setFormData(prev => ({
        ...prev,
        sale: saleId,
        customer_name: sale.customer_name || '',
        customer_phone: sale.customer_phone || '',
        customer_email: sale.customer_email || ''
      }));
    }
  };

  const addPackagingItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product: '',
        quantity: 1,
        unit: '',
        unit_price: 0,
        notes: ''
      }]
    }));
  };

  const updatePackagingItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removePackagingItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
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
          <Button onClick={() => setShowCreateForm(true)} variant="primary">
            Create Transaction
          </Button>
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

      {/* Create Transaction Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Packaging Transaction</h2>
              <button onClick={() => setShowCreateForm(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Sale *</label>
                <select
                  value={formData.sale}
                  onChange={(e) => handleSaleChange(e.target.value)}
                  required
                >
                  <option value="">Select Sale</option>
                  {sales.map(sale => (
                    <option key={sale.id} value={sale.id}>
                      {sale.sale_number} - {sale.customer_name || 'Walk-in Customer'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Transaction Type</label>
                <select
                  value={formData.transaction_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_type: e.target.value }))}
                >
                  <option value="consignation">Consignation (Paid)</option>
                  <option value="exchange">Exchange</option>
                  <option value="return">Return</option>
                  <option value="due">Due (To be returned)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Customer Phone</label>
                <input
                  type="text"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
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
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="packaging-items-section">
                <div className="section-header">
                  <h3>Packaging Items</h3>
                  <Button onClick={addPackagingItem} variant="primary" size="small">
                    Add Item
                  </Button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="packaging-item-form">
                    <div className="form-group">
                      <label>Product *</label>
                      <select
                        value={item.product}
                        onChange={(e) => updatePackagingItem(index, 'product', e.target.value)}
                        required
                      >
                        <option value="">Select Product</option>
                        {/* Products will be loaded from the selected sale */}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => updatePackagingItem(index, 'quantity', parseFloat(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updatePackagingItem(index, 'unit_price', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="form-group">
                      <label>Notes</label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updatePackagingItem(index, 'notes', e.target.value)}
                      />
                    </div>

                    <Button 
                      onClick={() => removePackagingItem(index)}
                      variant="danger"
                      size="small"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <Button onClick={handleCreateTransaction} variant="primary">
                Create Transaction
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="secondary">
                Cancel
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
