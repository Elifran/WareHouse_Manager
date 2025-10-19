import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Button from '../components/Button';
import PrintButton from '../components/PrintButton';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import PackagingValidation from './PackagingValidation';
import './PendingSales.css';

const PendingSales = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [pendingSales, setPendingSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editTotals, setEditTotals] = useState({ subtotal: 0, total_amount: 0 });
  const [completingSale, setCompletingSale] = useState(null);
  const [stockValidationStatus, setStockValidationStatus] = useState({});
  const [paymentType, setPaymentType] = useState('full');
  const [paidAmount, setPaidAmount] = useState(0);
  const [showPackagingValidation, setShowPackagingValidation] = useState(false);
  const [packagingValidationSaleId, setPackagingValidationSaleId] = useState(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPendingSales();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (pendingSales.length > 0) {
      validateStockForAllSales();
    }
  }, [pendingSales]);

  const fetchPendingSales = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('accessToken');
      
      const response = await api.get('/api/sales/pending/');
      setPendingSales(response.data);
    } catch (error) {
      console.error('Error fetching pending sales:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // More specific error handling
      if (error.response?.status === 401) {
        alert('Authentication required. Please log in again.');
        // Redirect to login or refresh token
        window.location.href = '/login';
      } else {
        alert('Error fetching pending sales: ' + (error.response?.data?.detail || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const validateStockForAllSales = async () => {
    const validationStatus = {};
    
    for (const sale of pendingSales) {
      let hasInsufficientStock = false;
      
      for (const item of sale.items || []) {
        try {
          const response = await api.get(`/api/products/${item.product}/stock-availability/`);
          const stockData = response.data;
          
          if (stockData.available_units) {
            const unitData = stockData.available_units.find(unit => unit.id === item.unit);
            if (unitData && unitData.available_quantity < item.quantity_display) {
              hasInsufficientStock = true;
              break;
            }
          }
        } catch (error) {
          console.error(`Error checking stock for product ${item.product}:`, error);
        }
      }
      
      validationStatus[sale.id] = { hasInsufficientStock };
    }
    
    setStockValidationStatus(validationStatus);
  };

  const completeSale = async (saleId) => {
    try {
      setCompletingSale(saleId);
      
      // Check if sale has items with packaging that need validation
      const sale = pendingSales.find(s => s.id === saleId);
      const hasPackagingItems = sale.items?.some(item => item.product_has_packaging);
      
      if (hasPackagingItems) {
        // Show packaging validation page
        setPackagingValidationSaleId(saleId);
        setShowPackagingValidation(true);
        setCompletingSale(null);
        return;
      }
      
      // Proceed with normal completion if no packaging items
      await performSaleCompletion(saleId);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error completing sale: ' + (error.response?.data?.detail || error.message));
      setCompletingSale(null);
    }
  };

  const performSaleCompletion = async (saleId) => {
    try {
      // Check stock before completing
      const sale = pendingSales.find(s => s.id === saleId);
      const stockValidationErrors = [];
      
      for (const item of sale.items || []) {
        try {
          const response = await api.get(`/api/products/${item.product}/stock-availability/`);
          const stockData = response.data;
          
          if (stockData.available_units) {
            const unitData = stockData.available_units.find(unit => unit.id === item.unit);
            if (unitData && unitData.available_quantity < item.quantity_display) {
              stockValidationErrors.push(`${item.product_name}: Required ${item.quantity_display} ${item.unit_name}, but only ${unitData.available_quantity} available`);
            }
          }
        } catch (error) {
          console.error(`Error checking stock for product ${item.product}:`, error);
          stockValidationErrors.push(`${item.product_name}: Unable to check stock availability`);
        }
      }
      
      if (stockValidationErrors.length > 0) {
        alert('Cannot complete sale due to insufficient stock:\n' + stockValidationErrors.join('\n'));
        return;
      }
      
      await api.post(`/api/sales/${saleId}/complete/`);
      
      // Print receipt after successful completion using PrintButton logic
      const completedSale = { ...sale, status: 'completed' };
      
      // Remove from pending sales list
      setPendingSales(prev => prev.filter(sale => sale.id !== saleId));
      setShowSaleModal(false);
      setSelectedSale(null);
      
      alert('Sale completed successfully!');
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error completing sale: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCompletingSale(null);
    }
  };

  const handlePackagingValidationComplete = async () => {
    try {
      await performSaleCompletion(packagingValidationSaleId);
      setShowPackagingValidation(false);
      setPackagingValidationSaleId(null);
    } catch (error) {
      console.error('Error completing sale after packaging validation:', error);
    }
  };

  const handlePackagingValidationCancel = () => {
    setShowPackagingValidation(false);
    setPackagingValidationSaleId(null);
    setCompletingSale(null);
  };

  const cancelSale = async (saleId) => {
    if (window.confirm('Are you sure you want to cancel this sale?')) {
      try {
        await api.delete(`/api/sales/${saleId}/`);
        setPendingSales(prev => prev.filter(sale => sale.id !== saleId));
        setShowSaleModal(false);
        setSelectedSale(null);
        alert('Sale cancelled successfully!');
      } catch (error) {
        console.error('Error cancelling sale:', error);
        alert('Error cancelling sale: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  // Prepare print data for PrintButton component (consistent with POS logic)
  const preparePrintData = (sale) => {
    return {
      sale_number: sale.sale_number,
      customer_name: sale.customer_name || 'Walk-in Customer',
      customer_phone: sale.customer_phone || '',
      customer_email: sale.customer_email || '',
      user_name: user?.username || t('app.unknown_user'),
      user_id: user?.id || 'unknown',
      created_at: sale.created_at,
      print_timestamp: new Date().toISOString(),
      print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: sale.status === 'completed' ? 'completed' : 'pending',
      payment_status: sale.payment_status || 'pending',
      payment_method: sale.payment_method || 'cash',
      total_amount: sale.total_amount || sale.subtotal,
      paid_amount: sale.paid_amount || 0,
      remaining_amount: sale.remaining_amount || (parseFloat(sale.total_amount || sale.subtotal) - parseFloat(sale.paid_amount || 0)),
      due_date: sale.due_date || null,
      subtotal: sale.subtotal,
      discount_amount: sale.discount_amount || 0,
      tax_amount: sale.tax_amount || 0,
      items: sale.items?.map(item => ({
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        quantity_display: item.quantity_display,
        unit_name: item.unit_name,
        unit_price: item.unit_price,
        total_price: item.total_price
      })) || []
    };
  };

  const editSale = (sale) => {
    setEditingSale(sale);
    
    // Initialize items with proper quantities and calculate totals
    const items = sale.items?.map(item => {
      const quantity = parseFloat(item.quantity_display || item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const calculatedTotalPrice = quantity * unitPrice;
      
      return {
        ...item,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: calculatedTotalPrice
      };
    }) || [];
    
    // Calculate initial totals based on current item data
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    
    // If no tax_amount is provided, assume 0% tax (common for many sales)
    const taxAmount = parseFloat(sale.tax_amount || 0) || 0;
    const discountAmount = parseFloat(sale.discount_amount || 0) || 0;
    const calculatedTotal = calculatedSubtotal + taxAmount - discountAmount;
    
    // Always use calculated totals to ensure accuracy
    const subtotal = calculatedSubtotal;
    const total_amount = calculatedTotal;
    
    const formData = {
      customer_name: sale.customer_name || '',
      customer_phone: sale.customer_phone || '',
      customer_email: sale.customer_email || '',
      payment_method: sale.payment_method || 'cash',
      items: items,
      subtotal: subtotal,
      total_amount: total_amount,
      tax_amount: sale.tax_amount || 0,
      discount_amount: sale.discount_amount || 0
    };
    
    
    setEditFormData(formData);
    setEditTotals({ subtotal: subtotal, total_amount: total_amount });
    
    // Initialize payment options
    const currentPaidAmount = parseFloat(sale.paid_amount) || 0;
    const calculatedTotalAmount = total_amount; // Use the calculated total from form data
    
    if (currentPaidAmount >= calculatedTotalAmount) {
      setPaymentType('full');
      setPaidAmount(calculatedTotalAmount);
    } else if (currentPaidAmount > 0) {
      setPaymentType('partial');
      setPaidAmount(currentPaidAmount);
    } else {
      setPaymentType('full');
      setPaidAmount(calculatedTotalAmount);
    }
    
    setShowEditModal(true);
    setShowSaleModal(false);
  };

  const handleEditItemQuantity = (itemIndex, newQuantity) => {
    
    if (!editFormData.items || !Array.isArray(editFormData.items)) {
      console.error('editFormData.items is not properly initialized:', editFormData);
      return;
    }
    
    const updatedItems = [...editFormData.items];
    updatedItems[itemIndex].quantity = parseFloat(newQuantity) || 0;
    updatedItems[itemIndex].total_price = updatedItems[itemIndex].quantity * parseFloat(updatedItems[itemIndex].unit_price) || 0;
    
    
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    setEditFormData({
      ...editFormData,
      items: updatedItems,
      subtotal: subtotal
    });
    
    // Fallback to original sale values if editFormData doesn't have them
    const taxAmount = parseFloat(editFormData.tax_amount !== undefined ? editFormData.tax_amount : (editingSale?.tax_amount || 0)) || 0;
    const discountAmount = parseFloat(editFormData.discount_amount !== undefined ? editFormData.discount_amount : (editingSale?.discount_amount || 0)) || 0;
    const newTotalAmount = subtotal + taxAmount - discountAmount;
    
    setEditTotals({
      subtotal: subtotal,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      newTotalAmount: newTotalAmount,
      editFormDataTax: editFormData.tax_amount,
      editFormDataDiscount: editFormData.discount_amount
    });
    
    const newEditFormData = {
      ...editFormData,
      items: updatedItems,
      subtotal: subtotal,
      total_amount: newTotalAmount
    };
    
    
    setEditFormData(newEditFormData);
    setEditTotals({ subtotal: subtotal, total_amount: newTotalAmount });
    
    // Force a re-render by logging the state after setting it
    setTimeout(() => {
    }, 100);
  };

  const removeEditItem = (itemIndex) => {
    const updatedItems = editFormData.items.filter((_, index) => index !== itemIndex);
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    // Fallback to original sale values if editFormData doesn't have them
    const taxAmount = parseFloat(editFormData.tax_amount !== undefined ? editFormData.tax_amount : (editingSale?.tax_amount || 0)) || 0;
    const discountAmount = parseFloat(editFormData.discount_amount !== undefined ? editFormData.discount_amount : (editingSale?.discount_amount || 0)) || 0;
    const newTotalAmount = subtotal + taxAmount - discountAmount;
    
    setEditFormData({
      ...editFormData,
      items: updatedItems,
      subtotal: subtotal,
      total_amount: newTotalAmount
    });
    setEditTotals({ subtotal: subtotal, total_amount: newTotalAmount });
  };

  const calculateEditTotal = () => {
    return editFormData.items?.reduce((total, item) => {
      return total + (parseFloat(item.total_price || 0));
    }, 0) || 0;
  };

  // Update paid amount when payment type changes or subtotal changes
  useEffect(() => {
    if (paymentType === 'full') {
      setPaidAmount(editTotals.subtotal || 0);
    }
  }, [paymentType, editTotals.subtotal]);


  const saveEditedSale = async () => {
    try {
      const updateData = {
        customer_name: editFormData.customer_name,
        customer_phone: editFormData.customer_phone,
        customer_email: editFormData.customer_email,
        payment_method: editFormData.payment_method,
        paid_amount: paidAmount,
        items: editFormData.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };
      
      console.log('Saving edited sale:', {
        saleId: editingSale.id,
        updateData: updateData,
        editFormData: editFormData
      });
      
      const response = await api.patch(`/sales/${editingSale.id}/`, updateData);
      
      setShowEditModal(false);
      setEditingSale(null);
      setEditFormData({});
      
      // Refresh the pending sales list
      fetchPendingSales();
      
      alert('Sale updated successfully!');
    } catch (error) {
      console.error('Error updating sale:', error);
      alert('Error updating sale: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="pending-sales-page">
        <div className="page-header">
          <h1>{t('titles.pending_sales')}</h1>
        </div>
        <div className="loading-message">Loading pending sales...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pending-sales-page">
        <div className="page-header">
          <h1>{t('titles.pending_sales')}</h1>
        </div>
        <div className="loading-message">Please log in to view pending sales.</div>
      </div>
    );
  }

  return (
    <div className="pending-sales-page">
      <div className="page-header">
        <h1>{t('titles.pending_sales')}</h1>
        <p>Manage and validate pending sales before completion</p>
      </div>

      {pendingSales.length === 0 ? (
        <div className="no-pending-sales">
          <div className="no-sales-icon">📋</div>
          <h3>{t('titles.no_pending_sales')}</h3>
          <p>All sales have been completed or there are no pending sales at the moment.</p>
        </div>
      ) : (
        <div className="pending-sales-grid">
          {pendingSales.map((sale) => (
            <div key={sale.id} className="pending-sale-card">
              <div className="sale-header">
                <div className="sale-number">{sale.sale_number}</div>
                <div className="sale-date">{formatDate(sale.created_at)}</div>
              </div>
              
              <div className="sale-customer">
                <strong>{sale.customer_name || 'Walk-in Customer'}</strong>
              </div>
              
              <div className="sale-items">
                <div className="items-count">{sale.items?.length || 0} items</div>
                <div className="items-preview">
                  {sale.items?.slice(0, 3).map((item, index) => (
                    <div key={index} className="item-preview">
                      <span className="item-name">{item.product_name}</span>
                      <span className="item-quantity">{item.quantity_display || item.quantity} {item.unit_name}</span>
                      <span className={`price-mode-badge ${item.price_mode === 'wholesale' ? 'wholesale' : ''}`}>
                        {item.price_mode === 'wholesale' ? 'WS' : 'STD'}
                      </span>
                    </div>
                  ))}
                  {sale.items?.length > 3 && (
                    <div className="more-items">+{sale.items.length - 3} more items</div>
                  )}
                </div>
              </div>
              
              <div className="sale-total">
                <strong>{formatCurrency(sale.total_amount)}</strong>
              </div>
              
              <div className="stock-status">
                {stockValidationStatus[sale.id]?.hasInsufficientStock ? (
                  <div className="stock-insufficient">⚠️ Insufficient Stock</div>
                ) : (
                  <div className="stock-sufficient">✅ Stock Available</div>
                )}
              </div>
              
              <div className="sale-actions">
                <Button
                  size="small"
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Fetch complete sale data including items
                      const response = await api.get(`/api/sales/${sale.id}/`);
                      setSelectedSale(response.data);
                      setShowSaleModal(true);
                    } catch (error) {
                      console.error('Error fetching sale details:', error);
                      // Fallback to using the sale data from the list
                      setSelectedSale(sale);
                      setShowSaleModal(true);
                    }
                  }}
                >
                  View Details
                </Button>
                
                {/* Use PrintButton component instead of custom print function */}
                <PrintButton
                  data={preparePrintData(sale)}
                  title={t('titles.sale_receipt')}
                  type="sale"
                  printText="🖨️ Print"
                  className="print-sale-btn"
                  variant="outline"
                  size="small"
                />
                
                <Button
                  size="small"
                  variant="outline"
                  onClick={() => editSale(sale)}
                >
                  ✏️ Edit
                </Button>
                <Button
                  size="small"
                  variant="primary"
                  disabled={stockValidationStatus[sale.id]?.hasInsufficientStock}
                  onClick={() => completeSale(sale.id)}
                  loading={completingSale === sale.id}
                >
                  {stockValidationStatus[sale.id]?.hasInsufficientStock ? t('buttons.insufficient_stock') : t('buttons.complete_sale')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sale Details Modal */}
      {showSaleModal && selectedSale && (
        <div className="modal-overlay">
          <div className="modal sale-details-modal">
            <div className="modal-header">
              <h2>Sale Details - {selectedSale.sale_number}</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowSaleModal(false);
                  setSelectedSale(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Customer Information */}
              <div className="info-section">
                <h3>Customer Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedSale.customer_name || 'Walk-in Customer'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{selectedSale.customer_phone || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{selectedSale.customer_email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Sale Information */}
              <div className="info-section">
                <h3>Sale Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Date:</span>
                    <span className="info-value">{formatDate(selectedSale.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Payment Method:</span>
                    <span className="info-value">{selectedSale.payment_method?.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className="status-badge pending">Pending</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="items-section">
                <h3>Items ({selectedSale.items?.length || 0})</h3>
                <div 
                  className="items-container"
                  style={{
                    minHeight: `${Math.max(200, (selectedSale.items?.length || 0) * 120)}px`,
                    maxHeight: '500px'
                  }}
                >
                  {selectedSale.items?.map((item, index) => (
                    <div key={index} className="item-card" style={{marginBottom: '12px'}}>
                      <div className="item-header">
                        <div className="item-name">{item.product_name}</div>
                        <span className={`price-mode-badge ${item.price_mode === 'wholesale' ? 'wholesale' : ''}`}>
                          {item.price_mode === 'wholesale' ? 'WS' : 'STD'}
                        </span>
                      </div>
                      <div className="item-details">
                        <div className="item-quantity">
                          <span className="quantity">{item.quantity_display || item.quantity || 'N/A'}</span>
                          <span className="unit">{item.unit_name || 'N/A'}</span>
                        </div>
                        <div className="item-price">
                          <span className="unit-price">{item.unit_price ? formatCurrency(item.unit_price) : 'N/A'} each</span>
                          <span className="total-price">{item.total_price ? formatCurrency(item.total_price) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="totals-section">
                <h3>Totals</h3>
                <div className="totals-grid">
                  <div className="total-item">
                    <span className="total-label">Subtotal:</span>
                    <span className="total-value">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount_amount > 0 && (
                    <div className="total-item">
                      <span className="total-label">Discount:</span>
                      <span className="total-value">-{formatCurrency(selectedSale.discount_amount)}</span>
                    </div>
                  )}
                  {selectedSale.tax_amount > 0 && (
                    <div className="total-item">
                      <span className="total-label">Tax:</span>
                      <span className="total-value">{formatCurrency(selectedSale.tax_amount)}</span>
                    </div>
                  )}
                  <div className="total-item total-final">
                    <span className="total-label">Total:</span>
                    <span className="total-value">{formatCurrency(selectedSale.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              <div className="stock-section">
                <h3>Stock Status</h3>
                <div className="stock-status">
                  {stockValidationStatus[selectedSale.id]?.hasInsufficientStock ? (
                    <div className="stock-insufficient">
                      ⚠️ Insufficient Stock
                    </div>
                  ) : (
                    <div className="stock-sufficient">
                      ✅ Stock Available
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSaleModal(false);
                  setSelectedSale(null);
                }}
              >
                Close
              </Button>
              
              {/* Use PrintButton component in modal footer */}
              <PrintButton
                data={preparePrintData(selectedSale)}
                title={t('titles.sale_receipt')}
                type="sale"
                printText="🖨️ Print Receipt"
                className="print-sale-btn"
                variant="secondary"
              />
              
              <Button
                variant="secondary"
                onClick={() => editSale(selectedSale)}
              >
                ✏️ Edit
              </Button>
              <Button
                variant="success"
                disabled={stockValidationStatus[selectedSale.id]?.hasInsufficientStock}
                onClick={() => completeSale(selectedSale.id)}
              >
                {stockValidationStatus[selectedSale.id]?.hasInsufficientStock ? t('buttons.insufficient_stock') : t('buttons.complete_sale')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && (
        <div className="modal-overlay">
          <div className="modal edit-sale-modal">
            <div className="modal-header">
              <h2>Edit Sale - {editingSale.sale_number}</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSale(null);
                  setEditFormData({});
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Customer Information */}
              <div className="form-section">
                <h3>Customer Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      value={editFormData.customer_name || ''}
                      onChange={(e) => setEditFormData({...editFormData, customer_name: e.target.value})}
                      placeholder={t('forms.customer_name')}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={editFormData.customer_phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, customer_phone: e.target.value})}
                      placeholder={t('forms.phone_number')}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editFormData.customer_email || ''}
                      onChange={(e) => setEditFormData({...editFormData, customer_email: e.target.value})}
                      placeholder={t('forms.email_address')}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={editFormData.payment_method || 'cash'}
                      onChange={(e) => setEditFormData({...editFormData, payment_method: e.target.value})}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Options */}
              <div className="form-section">
                <h3>Payment Type</h3>
                <div className="payment-types">
                  <label className="payment-type">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={paymentType === 'full'}
                      onChange={(e) => setPaymentType(e.target.value)}
                    />
                    <span>Full Payment (100%)</span>
                  </label>
                  <label className="payment-type">
                    <input
                      type="radio"
                      name="paymentType"
                      value="partial"
                      checked={paymentType === 'partial'}
                      onChange={(e) => setPaymentType(e.target.value)}
                    />
                    <span>Partial Payment (0-99.99%)</span>
                  </label>
                </div>
                
                {paymentType === 'partial' && (
                  <div className="form-group">
                    <label>Amount to Pay</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={editTotals.subtotal || 0}
                      value={paidAmount || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setPaidAmount(value);
                      }}
                      placeholder={t('forms.enter_amount_to_pay')}
                    />
                    <small>
                      Total: {formatCurrency(editTotals.subtotal || 0)} | 
                      Remaining: {formatCurrency((editTotals.subtotal || 0) - (paidAmount || 0))}
                    </small>
                  </div>
                )}
                
                {paymentType === 'full' && (
                  <div className="form-group">
                    <label>Amount to Pay</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editTotals.subtotal || 0}
                      readOnly
                      className="form-control"
                    />
                    <small>Full payment for the total amount.</small>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="form-section">
                <h3>Items ({editFormData.items?.length || 0})</h3>
                <div className="items-edit-container">
                  {editFormData.items?.map((item, index) => (
                    <div key={index} className="edit-item-card">
                      <div className="item-header">
                        <div className="item-name">{item.product_name}</div>
                        <span className={`price-mode-badge ${item.price_mode === 'wholesale' ? 'wholesale' : ''}`}>
                          {item.price_mode === 'wholesale' ? 'WS' : 'STD'}
                        </span>
                      </div>
                      <div className="item-details">
                        <div className="item-unit">{item.unit_name}</div>
                        <div className="item-price">{formatCurrency(item.unit_price)} each</div>
                      </div>
                      <div className="item-controls">
                        <div className="control-group">
                          <label>Quantity:</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleEditItemQuantity(index, e.target.value)}
                          />
                        </div>
                        <div className="control-group">
                          <label>Price Mode:</label>
                          <select
                            value={item.price_mode}
                            disabled
                            style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                          >
                            <option value="standard">Standard</option>
                            <option value="wholesale">Wholesale</option>
                          </select>
                        </div>
                        <div className="item-total">
                          {formatCurrency(item.total_price)}
                        </div>
                        <div className="item-actions">
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => removeEditItem(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="totals-section">
                <h3>Totals</h3>
                <div className="totals-grid">
                  <div className="total-item">
                    <span className="total-label">Subtotal:</span>
                    <span className="total-value">{formatCurrency(editTotals.subtotal || 0)}</span>
                  </div>
                  <div className="total-item total-final">
                    <span className="total-label">Total:</span>
                    <span className="total-value">{formatCurrency(editTotals.total_amount || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSale(null);
                  setEditFormData({});
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveEditedSale}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Packaging Validation Modal */}
      {showPackagingValidation && (
        <div className="modal-overlay">
          <div className="modal-content packaging-validation-modal">
            <PackagingValidation
              saleId={packagingValidationSaleId}
              onComplete={handlePackagingValidationComplete}
              onCancel={handlePackagingValidationCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingSales;