import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import Table from '../components/Table';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import DeliveryModal from '../components/DeliveryModal';
import PrintButton from '../components/PrintButton';
import './PurchaseOrders.css';

// EditDeliveryModal Component
const EditDeliveryModal = ({ delivery, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    notes: delivery.notes || '',
    items: (delivery.items || []).map(item => ({
      id: item.id,
      product_id: item.product.id,
      quantity_received: item.quantity_received,
      unit_cost: item.unit_cost,
      tax_class_id: item.tax_class?.id || '',
      condition_notes: item.condition_notes || ''
    }))
  });
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
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
        notes: formData.notes,
        items: formData.items.filter(item => item.quantity_received > 0).map(item => ({
          id: item.id,
          product_id: parseInt(item.product_id),
          quantity_received: parseFloat(item.quantity_received),
          unit_cost: parseFloat(item.unit_cost),
          tax_class_id: item.tax_class_id ? parseInt(item.tax_class_id) : null,
          condition_notes: item.condition_notes
        }))
      };
      await onSubmit(deliveryData);
    } catch (error) {
      console.error('Error updating delivery:', error);
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
    const originalItem = delivery.items.find(delItem => delItem.id === item.id);
    if (originalItem?.tax_class) {
      return lineTotal * (parseFloat(originalItem.tax_class.tax_rate) / 100);
    }
    return 0;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    formData.items.forEach(item => {
      subtotal += calculateItemTotal(item);
      taxAmount += calculateTaxAmount(item);
    });
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const totals = calculateTotals();

  return (
    <div className="modal-overlay">
      <div className={`modal-content delivery-modal ${isMobile ? 'mobile-modal' : ''}`}>
        <div className="modal-header">
          <h2>Edit Delivery</h2>
          <div className="header-actions">
            <PrintButton
              data={delivery}
              title="Delivery Receipt"
              type="delivery"
              printText={isMobile ? "📄" : "Print Receipt"}
              className="print-edit-delivery-btn"
              size={isMobile ? "small" : "medium"}
            />
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="delivery-info">
              <div className="info-grid">
                <div className="info-row">
                  <span className="label">Delivery Number:</span>
                  <span className="value">{delivery.delivery_number}</span>
                </div>
                <div className="info-row">
                  <span className="label">Purchase Order:</span>
                  <span className="value">{delivery.purchase_order?.order_number}</span>
                </div>
                <div className="info-row">
                  <span className="label">Supplier:</span>
                  <span className="value">{delivery.purchase_order?.supplier?.name}</span>
                </div>
              </div>
              <div className="form-group full-width">
                <label htmlFor="notes">Delivery Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={isMobile ? 2 : 3}
                ></textarea>
              </div>
            </div>

            <div className="form-section">
              <h3>Items to Receive</h3>
              <div className={`delivery-items ${isMobile ? 'mobile-view' : 'desktop-view'}`}>
                {!isMobile ? (
                  <>
                    <div className="delivery-items-header">
                      <span>Product</span>
                      <span>Received</span>
                      <span>Unit Cost</span>
                      <span>Tax Rate</span>
                      <span>Condition Notes</span>
                      <span>Line Total</span>
                      <span>Tax Amount</span>
                    </div>
                    {formData.items.map((item, index) => {
                      const originalItem = delivery.items.find(delItem => delItem.id === item.id);
                      const product = originalItem?.product;
                      const taxClass = originalItem?.tax_class;

                      return (
                        <div key={item.id} className="delivery-item-row">
                          <span className="product-name">{product?.name} ({product?.sku})</span>
                          <input
                            type="number"
                            value={item.quantity_received}
                            onChange={(e) => handleItemChange(index, 'quantity_received', e.target.value)}
                            min="0"
                            required
                          />
                          <input
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                            step="0.01"
                            min="0"
                            required
                          />
                          <span>{taxClass ? `${taxClass.name} (${taxClass.tax_rate}%)` : 'N/A'}</span>
                          <input
                            type="text"
                            value={item.condition_notes}
                            onChange={(e) => handleItemChange(index, 'condition_notes', e.target.value)}
                            placeholder="Condition notes..."
                          />
                          <span>{calculateItemTotal(item).toFixed(2)} MGA</span>
                          <span>{calculateTaxAmount(item).toFixed(2)} MGA</span>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  // Mobile view for delivery items
                  <div className="mobile-delivery-items">
                    {formData.items.map((item, index) => {
                      const originalItem = delivery.items.find(delItem => delItem.id === item.id);
                      const product = originalItem?.product;
                      const taxClass = originalItem?.tax_class;

                      return (
                        <div key={item.id} className="mobile-delivery-item">
                          <div className="mobile-item-header">
                            <strong>{product?.name}</strong>
                            <span className="sku">{product?.sku}</span>
                          </div>
                          <div className="mobile-item-fields">
                            <div className="field-group">
                              <label>Quantity Received</label>
                              <input
                                type="number"
                                value={item.quantity_received}
                                onChange={(e) => handleItemChange(index, 'quantity_received', e.target.value)}
                                min="0"
                                required
                              />
                            </div>
                            <div className="field-group">
                              <label>Unit Cost (MGA)</label>
                              <input
                                type="number"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                step="0.01"
                                min="0"
                                required
                              />
                            </div>
                            <div className="field-group">
                              <label>Tax Rate</label>
                              <span className="tax-info">{taxClass ? `${taxClass.name} (${taxClass.tax_rate}%)` : 'N/A'}</span>
                            </div>
                            <div className="field-group full-width">
                              <label>Condition Notes</label>
                              <input
                                type="text"
                                value={item.condition_notes}
                                onChange={(e) => handleItemChange(index, 'condition_notes', e.target.value)}
                                placeholder="Condition notes..."
                              />
                            </div>
                            <div className="mobile-item-totals">
                              <span>Line Total: {calculateItemTotal(item).toFixed(2)} MGA</span>
                              <span>Tax: {calculateTaxAmount(item).toFixed(2)} MGA</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="order-summary">
              <div className="summary-item">
                <span>Subtotal:</span>
                <span>{totals.subtotal.toFixed(2)} MGA</span>
              </div>
              <div className="summary-item">
                <span>Tax:</span>
                <span>{totals.taxAmount.toFixed(2)} MGA</span>
              </div>
              <div className="summary-item total-amount">
                <span>Total:</span>
                <span>{totals.total.toFixed(2)} MGA</span>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose} 
              disabled={loading}
              fullWidth={isMobile}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading}
              fullWidth={isMobile}
            >
              {loading ? 'Updating...' : 'Update Delivery'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PurchaseOrders = () => {
  const { t } = useTranslation();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryAction, setDeliveryAction] = useState('create');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [showEditDeliveryModal, setShowEditDeliveryModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [orderFilter, setOrderFilter] = useState('active');
  const [isMobile, setIsMobile] = useState(false);
  const api = useApi();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersResponse, suppliersResponse, deliveriesResponse, allDeliveriesResponse] = await Promise.all([
        api.get('/api/purchases/purchase-orders/'),
        api.get('/api/purchases/suppliers/'),
        api.get('/api/purchases/deliveries/pending/'),
        api.get('/api/purchases/deliveries/')
      ]);

      setPurchaseOrders(ordersResponse.data.results || ordersResponse.data);
      setSuppliers(suppliersResponse.data.results || suppliersResponse.data);
      setPendingDeliveries(deliveriesResponse.data.results || deliveriesResponse.data);
      setAllDeliveries(allDeliveriesResponse.data.results || allDeliveriesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (orderData) => {
    try {
      await api.post('/api/purchases/purchase-orders/', orderData);
      fetchData();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Error creating purchase order: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateDelivery = async (deliveryData) => {
    try {
      await api.post('/api/purchases/deliveries/', deliveryData);
      fetchData();
      setShowDeliveryModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error creating delivery:', error);
      alert('Error creating delivery: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateDeliveryAndArchiveOrder = async (deliveryData) => {
    try {
      await api.post('/api/purchases/deliveries/', deliveryData);
      await api.patch(`/api/purchases/purchase-orders/${selectedOrder.id}/`, { status: 'archived' });
      
      fetchData();
      setShowDeliveryModal(false);
      setSelectedOrder(null);
      alert('Delivery created and purchase order archived successfully!');
    } catch (error) {
      console.error('Error creating delivery and archiving order:', error);
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleArchiveOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to archive this purchase order?')) {
      try {
        await api.patch(`/purchases/purchase-orders/${orderId}/`, { status: 'archived' });
        fetchData();
        alert('Purchase order archived successfully!');
      } catch (error) {
        console.error('Error archiving purchase order:', error);
        alert('Error archiving purchase order: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to permanently delete this archived purchase order? This action cannot be undone.')) {
      try {
        await api.delete(`/api/purchases/purchase-orders/${orderId}/`);
        fetchData();
        alert('Purchase order deleted successfully');
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        alert('Error deleting purchase order: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleDeleteAllArchived = async () => {
    const archivedOrders = purchaseOrders.filter(order => order.status === 'archived');
    if (archivedOrders.length === 0) {
      alert('No archived orders to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to permanently delete ALL ${archivedOrders.length} archived purchase orders? This action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      try {
        const deletePromises = archivedOrders.map(order => 
          api.delete(`/api/purchases/purchase-orders/${order.id}/`)
        );
        await Promise.all(deletePromises);
        fetchData();
        alert(`Successfully deleted ${archivedOrders.length} archived purchase orders`);
      } catch (error) {
        console.error('Error deleting archived orders:', error);
        alert('Error deleting archived orders: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleConfirmDelivery = async (deliveryId) => {
    if (window.confirm('Are you sure you want to confirm this delivery? This will update the stock quantities.')) {
      try {
        await api.post('/api/purchases/deliveries/confirm/', { delivery_id: deliveryId });
        fetchData();
        alert('Delivery confirmed and stock updated successfully!');
      } catch (error) {
        console.error('Error confirming delivery:', error);
        alert('Error confirming delivery: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleViewOrder = (order) => {
    setViewOrder(order);
    setShowViewModal(true);
  };

  const handleEditDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setShowEditDeliveryModal(true);
  };

  const handleUpdateDelivery = async (deliveryData) => {
    try {
      await api.patch(`/purchases/deliveries/${selectedDelivery.id}/`, deliveryData);
      fetchData();
      setShowEditDeliveryModal(false);
      setSelectedDelivery(null);
      alert('Delivery updated successfully!');
    } catch (error) {
      console.error('Error updating delivery:', error);
      alert('Error updating delivery: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteDelivery = async (deliveryId) => {
    if (window.confirm('Are you sure you want to permanently delete this delivery? This action cannot be undone.')) {
      try {
        await api.delete(`/api/purchases/deliveries/${deliveryId}/`);
        fetchData();
        alert('Delivery deleted successfully');
      } catch (error) {
        console.error('Error deleting delivery:', error);
        alert('Error deleting delivery: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      sent: 'status-sent',
      confirmed: 'status-confirmed',
      partially_delivered: 'status-partial',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
      archived: 'status-archived'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-default'}`}>
        {isMobile ? status.charAt(0).toUpperCase() : status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // Mobile Card Components
  const PurchaseOrderCard = ({ order }) => (
    <div className="purchase-order-card">
      <div className="card-header">
        <div className="card-title">
          <h3 className="order-number">{order.order_number}</h3>
          <span className="supplier-name">{order.supplier?.name}</span>
        </div>
        <div className="card-status">
          {getStatusBadge(order.status)}
        </div>
      </div>
      
      <div className="card-details">
        <div className="detail-row">
          <span className="label">Order Date:</span>
          <span className="value">{new Date(order.order_date).toLocaleDateString()}</span>
        </div>
        <div className="detail-row">
          <span className="label">Expected Delivery:</span>
          <span className="value">{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '-'}</span>
        </div>
        <div className="detail-row">
          <span className="label">Total Amount:</span>
          <span className="value amount">{parseFloat(order.total_amount).toFixed(2)} MGA</span>
        </div>
      </div>

      <div className="card-actions">
        <div className="action-buttons">
          <PrintButton
            data={order}
            title="Purchase Order"
            type="purchase_order"
            printText={isMobile ? "📄" : "Print"}
            className="print-po-btn"
            size="small"
          />
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              setSelectedOrder(order);
              setDeliveryAction('create');
              setShowDeliveryModal(true);
            }}
            disabled={order.status === 'cancelled' || order.status === 'delivered' || order.status === 'archived'}
            fullWidth={isMobile}
          >
            {isMobile ? '📦 Create' : 'Create Delivery'}
          </Button>
          <Button
            size="small"
            variant="primary"
            onClick={() => {
              setSelectedOrder(order);
              setDeliveryAction('create_and_archive');
              setShowDeliveryModal(true);
            }}
            disabled={order.status === 'cancelled' || order.status === 'delivered' || order.status === 'archived'}
            fullWidth={isMobile}
          >
            {isMobile ? '📦✓ Create & Archive' : 'Create & Archive Order'}
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => handleViewOrder(order)}
            fullWidth={isMobile}
          >
            {isMobile ? '👁️ View' : 'View Order'}
          </Button>
          {order.status === 'archived' && (
            <Button
              size="small"
              variant="danger"
              onClick={() => handleDeleteOrder(order.id)}
              fullWidth={isMobile}
            >
              {isMobile ? '🗑️ Delete' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const DeliveryCard = ({ delivery }) => (
    <div className="delivery-card">
      <div className="card-header">
        <div className="card-title">
          <h3 className="delivery-number">{delivery.delivery_number}</h3>
          <span className="order-number">PO: {delivery.purchase_order?.order_number}</span>
        </div>
        <div className="card-status">
          {getStatusBadge(delivery.status)}
        </div>
      </div>
      
      <div className="card-details">
        <div className="detail-row">
          <span className="label">Delivery Date:</span>
          <span className="value">{new Date(delivery.delivery_date).toLocaleDateString()}</span>
        </div>
        <div className="detail-row">
          <span className="label">Total Amount:</span>
          <span className="value amount">{parseFloat(delivery.total_amount).toFixed(2)} MGA</span>
        </div>
        {delivery.received_by && (
          <div className="detail-row">
            <span className="label">Received By:</span>
            <span className="value">{delivery.received_by}</span>
          </div>
        )}
      </div>

      <div className="card-actions">
        <div className="action-buttons">
          <PrintButton
            data={delivery}
            title="Delivery Receipt"
            type="delivery"
            printText={isMobile ? "📄" : "Print"}
            className="print-delivery-btn"
            size="small"
          />
          {delivery.status === 'pending' && (
            <>
              <Button
                size="small"
                variant="primary"
                onClick={() => handleConfirmDelivery(delivery.id)}
                fullWidth={isMobile}
              >
                {isMobile ? '✓ Confirm' : 'Confirm & Update Stock'}
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => handleEditDelivery(delivery)}
                fullWidth={isMobile}
              >
                {isMobile ? '✏️ Edit' : 'Edit Delivery'}
              </Button>
            </>
          )}
          {delivery.status === 'completed' && (
            <Button
              size="small"
              variant="outline"
              onClick={() => handleViewOrder(delivery.purchase_order)}
              fullWidth={isMobile}
            >
              {isMobile ? '👁️ View PO' : 'View Order'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const purchaseOrderColumns = [
    {
      key: 'order_number',
      label: 'Order Number',
      render: (value, row) => (
        <div>
          <div className="order-number">{value}</div>
          <div className="supplier-name">{row.supplier?.name}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'order_date',
      label: 'Order Date',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'expected_delivery_date',
      label: 'Expected Delivery',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      render: (value) => `${parseFloat(value).toFixed(2)} MGA`
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <PrintButton
            data={row}
            title="Purchase Order"
            type="purchase_order"
            printText="Print"
            className="print-po-btn"
            size="small"
          />
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              setSelectedOrder(row);
              setDeliveryAction('create');
              setShowDeliveryModal(true);
            }}
            disabled={row.status === 'cancelled' || row.status === 'delivered' || row.status === 'archived'}
          >
            Create Delivery
          </Button>
          <Button
            size="small"
            variant="primary"
            onClick={() => {
              setSelectedOrder(row);
              setDeliveryAction('create_and_archive');
              setShowDeliveryModal(true);
            }}
            disabled={row.status === 'cancelled' || row.status === 'delivered' || row.status === 'archived'}
          >
            Create & Archive
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => handleViewOrder(row)}
          >
            View
          </Button>
          {row.status === 'archived' && (
            <Button
              size="small"
              variant="danger"
              onClick={() => handleDeleteOrder(row.id)}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  const deliveryColumns = [
    {
      key: 'delivery_number',
      label: 'Delivery Number',
      render: (value, row) => (
        <div>
          <div className="delivery-number">{value}</div>
          <div className="order-number">PO: {row.purchase_order?.order_number}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'delivery_date',
      label: 'Delivery Date',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      render: (value) => `${parseFloat(value).toFixed(2)} MGA`
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <PrintButton
            data={row}
            title="Delivery Receipt"
            type="delivery"
            printText="Print"
            className="print-delivery-btn"
            size="small"
          />
          {['pending', 'received', 'verified'].includes(row.status) && (
            <>
              {row.status === 'pending' && (
                <>
                  <Button
                    size="small"
                    variant="primary"
                    onClick={() => handleConfirmDelivery(row.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => handleEditDelivery(row)}
                  >
                    Edit
                  </Button>
                </>
              )}
              {/* Add Delete Button for unconfirmed deliveries */}
              <Button
                size="small"
                variant="danger"
                onClick={() => handleDeleteDelivery(row.id)}
                title="Delete this delivery"
              >
                Delete
              </Button>
            </>
          )}
          {row.status === 'completed' && (
            <Button
              size="small"
              variant="outline"
              onClick={() => handleViewOrder(row.purchase_order)}
            >
              View PO
            </Button>
          )}
        </div>
      )
    }
  ];

  const deliveryHistoryColumns = [
    {
      key: 'delivery_number',
      label: 'Delivery Number',
      render: (value, row) => (
        <div>
          <div className="delivery-number">{value}</div>
          <div className="order-number">PO: {row.purchase_order?.order_number}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'delivery_date',
      label: 'Delivery Date',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'received_date',
      label: 'Received Date',
      render: (value) => value ? (
        <span className="received-date">{new Date(value).toLocaleDateString()}</span>
      ) : (
        <span className="received-date empty">Not received</span>
      )
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      render: (value) => `${parseFloat(value).toFixed(2)} MGA`
    },
    {
      key: 'received_by',
      label: 'Received By',
      render: (value) => value ? (
        <span className="received-by">{value}</span>
      ) : (
        <span className="received-by">-</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <PrintButton
            data={row}
            title="Delivery Receipt"
            type="delivery"
            printText="Print"
            className="print-delivery-history-btn"
            size="small"
          />
          <Button
            size="small"
            variant="outline"
            onClick={() => handleViewOrder(row.purchase_order)}
          >
            View PO
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <span>Loading purchase orders...</span>
      </div>
    );
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'orders':
        const filteredOrders = orderFilter === 'archived' 
          ? purchaseOrders.filter(order => order.status === 'archived')
          : purchaseOrders.filter(order => order.status !== 'archived');
        return { 
          data: filteredOrders, 
          columns: purchaseOrderColumns, 
          emptyMessage: orderFilter === 'archived' ? t('empty_messages.no_archived_purchase_orders') : t('empty_messages.no_active_purchase_orders') 
        };
      case 'pending':
        return { data: pendingDeliveries, columns: deliveryColumns, emptyMessage: t('empty_messages.no_pending_deliveries') };
      case 'history':
        return { data: allDeliveries, columns: deliveryHistoryColumns, emptyMessage: t('empty_messages.no_delivery_history') };
      default:
        return { data: [], columns: [], emptyMessage: t('app.no_data_available') };
    }
  };

  const currentData = getCurrentData();

  return (
    <div className="purchase-orders">
      <div className="page-header">
        <h1>{t('titles.purchase_orders_delivery')}</h1>
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            size={isMobile ? "small" : "medium"}
            fullWidth={isMobile}
          >
            {isMobile ? '📝 Create PO' : 'Create Purchase Order'}
          </Button>
        </div>
      </div>

      <div className={`management-layout ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
        {/* Navigation */}
        <div className={`navigation-section ${isMobile ? 'mobile-nav' : 'desktop-nav'}`}>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <span className="tab-icon">📋</span>
              <span className="tab-text">{isMobile ? 'Orders' : t('titles.purchase_orders')}</span>
              <span className="tab-count">({purchaseOrders.length})</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <span className="tab-icon">⏳</span>
              <span className="tab-text">{isMobile ? 'Pending' : 'Pending Deliveries'}</span>
              <span className="tab-count">({pendingDeliveries.length})</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span className="tab-icon">📦</span>
              <span className="tab-text">{isMobile ? 'History' : 'Delivery History'}</span>
              <span className="tab-count">({allDeliveries.length})</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          <div className="content-header">
            <h2>
              {activeTab === 'orders' && (isMobile ? 'Purchase Orders' : t('titles.purchase_orders'))}
              {activeTab === 'pending' && (isMobile ? 'Pending Deliveries' : 'Pending Deliveries')}
              {activeTab === 'history' && (isMobile ? 'Delivery History' : 'Delivery History')}
            </h2>
          </div>

          {/* Order Filter Section */}
          {activeTab === 'orders' && (
            <div className="order-filter-section">
              <div className="filter-buttons">
                <button 
                  type="button"
                  className={`filter-btn ${orderFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setOrderFilter('active')}
                >
                  <span className="filter-icon">📋</span>
                  <span className="filter-text">{isMobile ? 'Active' : 'Active Orders'}</span>
                  <span className="filter-count">
                    ({purchaseOrders.filter(order => order.status !== 'archived').length})
                  </span>
                </button>
                <button 
                  type="button"
                  className={`filter-btn ${orderFilter === 'archived' ? 'active' : ''}`}
                  onClick={() => setOrderFilter('archived')}
                >
                  <span className="filter-icon">📁</span>
                  <span className="filter-text">{isMobile ? 'Archived' : 'Archived Orders'}</span>
                  <span className="filter-count">
                    ({purchaseOrders.filter(order => order.status === 'archived').length})
                  </span>
                </button>
              </div>
              
              {/* Delete All Archived Button */}
              {orderFilter === 'archived' && purchaseOrders.filter(order => order.status === 'archived').length > 0 && (
                <div className="bulk-actions">
                  <Button
                    variant="danger"
                    size="small"
                    onClick={handleDeleteAllArchived}
                    fullWidth={isMobile}
                  >
                    {isMobile ? '🗑️ Delete All' : '🗑️ Delete All Archived'}
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <div className="table-container">
            {/* Mobile Card View */}
            {isMobile ? (
              <div className="mobile-cards-container">
                {currentData.data.length === 0 ? (
                  <div className="empty-state">
                    <p>{currentData.emptyMessage}</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {currentData.data.map(item => 
                      activeTab === 'orders' ? (
                        <PurchaseOrderCard key={item.id} order={item} />
                      ) : (
                        <DeliveryCard key={item.id} delivery={item} />
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Desktop Table View */
              <Table
                data={currentData.data}
                columns={currentData.columns}
                emptyMessage={currentData.emptyMessage}
              />
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <PurchaseOrderModal
          suppliers={suppliers}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateOrder}
          isMobile={isMobile}
        />
      )}

      {showDeliveryModal && selectedOrder && (
        <DeliveryModal
          purchaseOrder={selectedOrder}
          action={deliveryAction}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedOrder(null);
            setDeliveryAction('create');
          }}
          onSubmit={deliveryAction === 'create_and_archive' ? handleCreateDeliveryAndArchiveOrder : handleCreateDelivery}
          isMobile={isMobile}
        />
      )}

      {showViewModal && viewOrder && (
        <ViewOrderModal
          order={viewOrder}
          onClose={() => {
            setShowViewModal(false);
            setViewOrder(null);
          }}
          isMobile={isMobile}
        />
      )}

      {showEditDeliveryModal && selectedDelivery && (
        <EditDeliveryModal
          delivery={selectedDelivery}
          onClose={() => {
            setShowEditDeliveryModal(false);
            setSelectedDelivery(null);
          }}
          onSubmit={handleUpdateDelivery}
        />
      )}
    </div>
  );
};

// ViewOrderModal Component
const ViewOrderModal = ({ order, onClose, isMobile = false }) => {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay">
      <div className={`modal-content view-order-modal ${isMobile ? 'mobile-modal' : ''}`}>
        <div className="modal-header">
          <h2>Purchase Order Details</h2>
          <div className="header-actions">
            <PrintButton
              data={order}
              title={t('titles.purchase_order')}
              type="purchase_order"
              printText={isMobile ? "📄" : t('buttons.print_order')}
              className="print-view-order-btn"
              size={isMobile ? "small" : "medium"}
            />
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="order-details">
            <div className="detail-section">
              <h3>Order Information</h3>
              <div className={`detail-grid ${isMobile ? 'mobile-grid' : 'desktop-grid'}`}>
                <div className="detail-item">
                  <label>Order Number:</label>
                  <span>{order.order_number}</span>
                </div>
                <div className="detail-item">
                  <label>Supplier:</label>
                  <span>{order.supplier?.name}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Order Date:</label>
                  <span>{new Date(order.order_date).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Expected Delivery:</label>
                  <span>{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <label>Created By:</label>
                  <span>{order.created_by?.username || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="detail-section">
                <h3>Notes</h3>
                <div className="notes-content">
                  {order.notes}
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>Order Items</h3>
              <div className={`items-table ${isMobile ? 'mobile-items' : 'desktop-items'}`}>
                {!isMobile ? (
                  <>
                    <div className="items-header">
                      <span>Product</span>
                      <span>SKU</span>
                      <span>Quantity</span>
                      <span>Unit Cost</span>
                      <span>Tax</span>
                      <span>Line Total</span>
                    </div>
                    {order.items?.map((item, index) => (
                      <div key={index} className="item-row">
                        <span>{item.product?.name}</span>
                        <span>{item.product?.sku}</span>
                        <span>{item.quantity_ordered}</span>
                        <span>{parseFloat(item.unit_cost).toFixed(2)} MGA</span>
                        <span>{item.tax_class ? `${item.tax_class.name} (${item.tax_class.tax_rate}%)` : 'No Tax'}</span>
                        <span>{parseFloat(item.line_total).toFixed(2)} MGA</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="mobile-items-list">
                    {order.items?.map((item, index) => (
                      <div key={index} className="mobile-item">
                        <div className="mobile-item-header">
                          <strong>{item.product?.name}</strong>
                          <span className="sku">{item.product?.sku}</span>
                        </div>
                        <div className="mobile-item-details">
                          <div className="detail">
                            <span>Quantity:</span>
                            <span>{item.quantity_ordered}</span>
                          </div>
                          <div className="detail">
                            <span>Unit Cost:</span>
                            <span>{parseFloat(item.unit_cost).toFixed(2)} MGA</span>
                          </div>
                          <div className="detail">
                            <span>Tax:</span>
                            <span>{item.tax_class ? `${item.tax_class.name} (${item.tax_class.tax_rate}%)` : 'No Tax'}</span>
                          </div>
                          <div className="detail total">
                            <span>Line Total:</span>
                            <span>{parseFloat(item.line_total).toFixed(2)} MGA</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h3>Order Summary</h3>
              <div className={`summary-grid ${isMobile ? 'mobile-summary' : 'desktop-summary'}`}>
                <div className="summary-item">
                  <label>Subtotal:</label>
                  <span>{parseFloat(order.subtotal).toFixed(2)} MGA</span>
                </div>
                <div className="summary-item">
                  <label>Tax Amount:</label>
                  <span>{parseFloat(order.tax_amount).toFixed(2)} MGA</span>
                </div>
                <div className="summary-item total">
                  <label>Total Amount:</label>
                  <span>{parseFloat(order.total_amount).toFixed(2)} MGA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose} fullWidth={isMobile}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;