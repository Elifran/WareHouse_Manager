import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import './PrintButton.css';

// Helper functions for generating print content
const generateInventoryContent = (data) => {
  
  // Try to extract the products array from the data object
  let products = data;
  if (!Array.isArray(data)) {
    // Look for common array property names
    if (data.results && Array.isArray(data.results)) {
      products = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      products = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      products = data.items;
    } else {
      // Check if data has numbered keys (like '0', '1', '2', etc.)
      const numberedKeys = Object.keys(data).filter(key => /^\d+$/.test(key));
      if (numberedKeys.length > 0) {
        products = numberedKeys.map(key => data[key]).filter(item => item && typeof item === 'object');
      } else {
        products = [];
      }
    }
  }
  
  
  return `
    <div class="info-section">
      <h3>{t('titles.inventory_summary')}</h3>
      <div class="info-row">
        <span class="info-label">Total Products:</span>
        <span class="info-value">${Array.isArray(products) ? products.length : 0}</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Product Name</th>
          <th>SKU</th>
          <th>Stock Quantity</th>
          <th>Base Unit</th>
          <th>Unit Price</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        ${Array.isArray(products) ? products.map(item => `
          <tr>
            <td>${item.name || 'N/A'}</td>
            <td>${item.sku || 'N/A'}</td>
            <td>${item.stock_quantity || 0}</td>
            <td>${item.base_unit?.name || item.base_unit?.symbol || 'piece'}</td>
            <td>${parseFloat(item.price || 0).toFixed(2)} MGA</td>
            <td>${item.category?.name || 'N/A'}</td>
          </tr>
        `).join('') : '<tr><td colspan="6">No products found</td></tr>'}
      </tbody>
    </table>
  `;
};

const generatePurchaseOrderContent = (data) => {
  return `
    <div class="info-section">
      <h3>Purchase Order Information</h3>
      <div class="info-row">
        <span class="info-label">Order Number:</span>
        <span class="info-value">${data.order_number || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Supplier:</span>
        <span class="info-value">${data.supplier?.name || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Order Date:</span>
        <span class="info-value">${data.order_date ? new Date(data.order_date).toLocaleDateString() : 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value">${data.status || 'N/A'}</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity Ordered</th>
          <th>Unit</th>
          <th>Unit Cost</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${data.items ? data.items.map(item => `
          <tr>
            <td>${item.product?.name || 'N/A'}</td>
            <td>${item.quantity_ordered || 0}</td>
            <td>${item.unit?.name || item.unit?.symbol || 'piece'}</td>
            <td>${parseFloat(item.unit_cost || 0).toFixed(2)} MGA</td>
            <td>${parseFloat((item.quantity_ordered || 0) * (item.unit_cost || 0)).toFixed(2)} MGA</td>
          </tr>
        `).join('') : ''}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4">Total Amount:</td>
          <td>${parseFloat(data.total_amount || 0).toFixed(2)} MGA</td>
        </tr>
      </tfoot>
    </table>
  `;
};

const generateDeliveryContent = (data) => {
  return `
    <div class="info-section">
      <h3>Delivery Information</h3>
      <div class="info-row">
        <span class="info-label">Delivery Number:</span>
        <span class="info-value">${data.delivery_number || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Purchase Order:</span>
        <span class="info-value">${data.purchase_order?.order_number || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Delivery Date:</span>
        <span class="info-value">${data.delivery_date ? new Date(data.delivery_date).toLocaleDateString() : 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value">${data.status || 'N/A'}</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity Received</th>
          <th>Unit</th>
          <th>Unit Cost</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${data.items ? data.items.map(item => `
          <tr>
            <td>${item.product_name || item.product?.name || 'N/A'}</td>
            <td>${item.quantity_received || item.delivered_quantity || 0}</td>
            <td>${item.unit_name || item.unit?.name || item.unit?.symbol || 'piece'}</td>
            <td>${parseFloat(item.unit_cost || 0).toFixed(2)} MGA</td>
            <td>${parseFloat((item.quantity_received || item.delivered_quantity || 0) * (item.unit_cost || 0)).toFixed(2)} MGA</td>
          </tr>
        `).join('') : ''}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4">Total Amount:</td>
          <td>${parseFloat(data.total_amount || 0).toFixed(2)} MGA</td>
        </tr>
      </tfoot>
    </table>
  `;
};

const generateSaleContent = (data, t) => {
  // Debug: Log the data being processed
  
  // Extract items from the data object
  let items = data.items;
  if (!items) {
    // Check if data has numbered keys for items
    const numberedKeys = Object.keys(data).filter(key => /^\d+$/.test(key));
    if (numberedKeys.length > 0) {
      items = numberedKeys.map(key => data[key]).filter(item => item && typeof item === 'object');
    }
  }
  
  
  return `
    <div class="info-section">
      <h3>Sale Information</h3>
      <div class="info-row">
        <span class="info-label">Sale Number:</span>
        <span class="info-value">${data.sale_number || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer:</span>
        <span class="info-value">${data.customer_name || 'Walk-in Customer'}</span>
      </div>
      ${data.customer_phone ? `
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value">${data.customer_phone}</span>
        </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value">${data.status || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Status:</span>
        <span class="info-value">${data.payment_status === 'paid' ? t('payment_status.paid') : 
                                   data.payment_status === 'partial' ? t('payment_status.partial_payment') : 
                                   data.payment_status === 'pending' ? t('payment_status.pending_payment') : 
                                   t('payment_status.unknown')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total Amount:</span>
        <span class="info-value">${parseFloat(data.total_amount || 0).toFixed(2)} MGA</span>
      </div>
      <div class="info-row">
        <span class="info-label">Paid Amount:</span>
        <span class="info-value">${parseFloat(data.paid_amount || 0).toFixed(2)} MGA</span>
      </div>
      ${data.payment_status === 'partial' ? `
        <div class="info-row payment-warning">
          <span class="info-label">Remaining Amount:</span>
          <span class="info-value">${parseFloat(data.remaining_amount || 0).toFixed(2)} MGA</span>
        </div>
        <div class="info-row payment-warning">
          <span class="info-label">Due Date:</span>
          <span class="info-value">${data.due_date || t('payment_status.to_be_determined')}</span>
        </div>
      ` : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items && Array.isArray(items) ? items.map(item => `
          <tr>
            <td>${item.product_name || 'N/A'}</td>
            <td>${item.quantity_display || item.quantity || 0}</td>
            <td>${item.unit_name || 'piece'}</td>
            <td>${parseFloat(item.unit_price || 0).toFixed(2)} MGA</td>
            <td>${parseFloat(item.total_price || 0).toFixed(2)} MGA</td>
          </tr>
        `).join('') : '<tr><td colspan="5">No items found</td></tr>'}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4">Total Amount:</td>
          <td>${parseFloat(data.total_amount || 0).toFixed(2)} MGA</td>
        </tr>
      </tfoot>
    </table>
  `;
};

const generateSalesHistoryContent = (data) => {
  // Debug: Log the data being processed
  
  // Try to extract the sales array from the data object
  let sales = data;
  if (!Array.isArray(data)) {
    // Look for common array property names
    if (data.results && Array.isArray(data.results)) {
      sales = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      sales = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      sales = data.items;
    } else {
      // Check if data has numbered keys (like '0', '1', '2', etc.)
      const numberedKeys = Object.keys(data).filter(key => /^\d+$/.test(key));
      if (numberedKeys.length > 0) {
        sales = numberedKeys.map(key => data[key]).filter(item => item && typeof item === 'object');
      } else {
        sales = [];
      }
    }
  }
  
  
  return `
    <div class="info-section">
      <h3>Sales Report Summary</h3>
      <div class="info-row">
        <span class="info-label">Total Sales:</span>
        <span class="info-value">${Array.isArray(sales) ? sales.length : 0}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total Revenue:</span>
        <span class="info-value">${Array.isArray(sales) ? sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0).toFixed(2) : '0.00'} MGA</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Sale Number</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Total Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${Array.isArray(sales) ? sales.map(sale => `
          <tr>
            <td>${sale.sale_number || 'N/A'}</td>
            <td>${sale.customer_name || 'Walk-in Customer'}</td>
            <td>${sale.created_at ? new Date(sale.created_at).toLocaleDateString() : 'N/A'}</td>
            <td>${parseFloat(sale.total_amount || 0).toFixed(2)} MGA</td>
            <td>${sale.status || 'N/A'}</td>
          </tr>
        `).join('') : ''}
      </tbody>
    </table>
  `;
};

const generateDefaultContent = (data) => {
  return `
    <div class="info-section">
      <h3>Document Information</h3>
      <div class="info-row">
        <span class="info-label">Document Type:</span>
        <span class="info-value">General Document</span>
      </div>
      <div class="info-row">
        <span class="info-label">Generated:</span>
        <span class="info-value">${new Date().toLocaleString()}</span>
      </div>
    </div>
    <div class="info-section">
      <h3>Content</h3>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
  `;
};

// Export the generatePrintContent function
export const generatePrintContent = (data, title, type, t) => {
  
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  const printTimestamp = new Date().toISOString();
  const printId = data.print_id || `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  
  let content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #333; 
          padding-bottom: 10px; 
          margin-bottom: 20px; 
        }
        .header h1 { 
          margin: 0; 
          color: #2c3e50; 
          font-size: 24px;
        }
        .header .date { 
          color: #666; 
          font-size: 14px; 
          margin-top: 5px;
        }
        .header .print-info { 
          color: #888; 
          font-size: 12px; 
          margin-top: 3px;
          font-family: monospace;
        }
        .info-section { 
          margin-bottom: 20px; 
          padding: 15px; 
          background: #f8f9fa; 
          border-radius: 5px; 
        }
        .info-section h3 { 
          margin: 0 0 10px 0; 
          color: #2c3e50; 
          font-size: 16px;
        }
        .info-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 5px; 
        }
        .info-label { 
          font-weight: bold; 
          color: #555; 
        }
        .info-value { 
          color: #333; 
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px; 
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 8px; 
          text-align: left; 
        }
        th { 
          background-color: #f2f2f2; 
          font-weight: bold; 
          color: #2c3e50;
        }
        .total-row { 
          font-weight: bold; 
          background-color: #e9ecef; 
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 12px; 
          border-top: 1px solid #ddd; 
          padding-top: 10px; 
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <div class="date">Generated on ${currentDate} at ${currentTime}</div>
        <div class="print-info">Print ID: ${printId} | Timestamp: ${printTimestamp}</div>
      </div>
  `;

  // Add type-specific content
  switch (type) {
    case 'inventory':
      content += generateInventoryContent(data);
      break;
    case 'purchase_order':
      content += generatePurchaseOrderContent(data);
      break;
    case 'delivery':
      content += generateDeliveryContent(data);
      break;
    case 'sale':
      content += generateSaleContent(data, t);
      break;
    case 'sales_history':
      content += generateSalesHistoryContent(data);
      break;
    default:
      content += generateDefaultContent(data);
  }
  

  content += `
      <div class="footer">
        <p>Generated by Beverage Management System</p>
        <p>Print ID: ${printId} | Generated: ${printTimestamp}</p>
        <p>Document Type: ${type.toUpperCase()} | User: ${data.user_name || 'System'}</p>
      </div>
    </body>
    </html>
  `;

  return content;
};

const PrintButton = ({ 
  data, 
  title, 
  type = 'default', 
  onValidate = null, 
  validateText = 'Validate & Print',
  printText = 'Print',
  className = '',
  disabled = false,
  showValidateOption = false
}) => {
  const { t } = useTranslation();
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  const handlePrint = async (validateFirst = false) => {
    
    if (validateFirst && onValidate) {
      try {
        await onValidate();
      } catch (error) {
        console.error('Validation failed:', error);
        return;
      }
    }

    setIsPrinting(true);
    
    try {
      // Create print content
      const printContent = generatePrintContent(data, title, type, t);
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        throw new Error('Failed to open print window. Please check popup blockers.');
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      const printAfterLoad = () => {
        printWindow.focus();
        printWindow.print();
        // Close the window after a short delay to allow printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };
      
      // Check if window is already loaded
      if (printWindow.document.readyState === 'complete') {
        printAfterLoad();
      } else {
        printWindow.onload = printAfterLoad;
      }
      
      // Fallback timeout
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print. Please try again. Error: ' + error.message);
    } finally {
      setIsPrinting(false);
      setShowPrintOptions(false);
    }
  };

  if (showValidateOption && onValidate) {
    return (
      <div className={`print-button-container ${className}`}>
        <Button
          variant="outline"
          size="small"
          onClick={() => setShowPrintOptions(!showPrintOptions)}
          disabled={disabled}
        >
          {showPrintOptions ? 'Hide Options' : 'Show Options'}
        </Button>
        {showPrintOptions && (
          <>
            <Button
              variant="primary"
              size="small"
              onClick={() => handlePrint(true)}
              disabled={disabled || isPrinting}
            >
              {isPrinting ? 'Processing...' : validateText}
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={() => handlePrint(false)}
              disabled={disabled || isPrinting}
            >
              {isPrinting ? 'Preparing...' : printText}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="small"
      onClick={() => handlePrint(false)}
      disabled={disabled || isPrinting}
      className={className}
    >
      {isPrinting ? 'Printing...' : printText}
    </Button>
  );
};

export default PrintButton;
