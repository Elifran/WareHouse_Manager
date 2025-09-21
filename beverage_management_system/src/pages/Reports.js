import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Reports.css';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reports, setReports] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState('');
  const [reportFilters, setReportFilters] = useState({
    start_date: '',
    end_date: '',
    product_id: '',
    category_id: '',
    customer_name: ''
  });
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const reportTypes = [
    {
      id: 'sales',
      name: 'Sales Report',
      description: 'Detailed sales analysis with revenue, cost, and profit breakdown',
      icon: '💰',
      color: '#10b981'
    },
    {
      id: 'inventory',
      name: 'Inventory Report',
      description: 'Current inventory status, stock levels, and valuation',
      icon: '📦',
      color: '#8b5cf6'
    },
    {
      id: 'profit_loss',
      name: 'Profit & Loss Report',
      description: 'Financial performance analysis with profit margins',
      icon: '📊',
      color: '#3b82f6'
    },
    {
      id: 'stock_movement',
      name: 'Stock Movement Report',
      description: 'Track all stock movements, purchases, and sales',
      icon: '📈',
      color: '#f59e0b'
    },
    {
      id: 'customer',
      name: 'Customer Report',
      description: 'Customer analysis and purchase behavior',
      icon: '👥',
      color: '#06b6d4'
    }
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/');
      setReports(response.data);
    } catch (err) {
      setError('Failed to load reports');
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeSelect = (reportType) => {
    setSelectedReportType(reportType);
    setShowFilters(true);
    setGeneratedReport(null);
    setError('');
    setSuccess('');
  };

  const handleFilterChange = (field, value) => {
    setReportFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateReport = async () => {
    if (!selectedReportType) {
      setError('Please select a report type');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Prepare request data based on report type
      let requestData = {};
      
      // Common filters
      if (reportFilters.start_date) {
        requestData.start_date = reportFilters.start_date;
      }
      if (reportFilters.end_date) {
        requestData.end_date = reportFilters.end_date;
      }

      let endpoint = '';
      switch (selectedReportType) {
        case 'sales':
          endpoint = '/reports/sales/';
          requestData = {
            start_date: reportFilters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 30 days ago
            end_date: reportFilters.end_date || new Date().toISOString().split('T')[0], // Default to today
            include_details: true,
            group_by: 'day'
          };
          break;
        case 'inventory':
          endpoint = '/reports/inventory/';
          requestData = {
            start_date: reportFilters.start_date || new Date().toISOString().split('T')[0],
            end_date: reportFilters.end_date || new Date().toISOString().split('T')[0],
            include_low_stock: true,
            include_out_of_stock: true
          };
          break;
        case 'stock_movement':
          endpoint = '/reports/stock-movements/';
          requestData = {
            start_date: reportFilters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: reportFilters.end_date || new Date().toISOString().split('T')[0]
          };
          if (reportFilters.product_id) {
            requestData.product = reportFilters.product_id;
          }
          break;
        default:
          setError('Report type not implemented yet');
          return;
      }

      const response = await api.post(endpoint, requestData);
      
      setGeneratedReport({
        type: selectedReportType,
        data: response.data,
        generated_at: new Date().toISOString()
      });
      
      setSuccess('Report generated successfully!');
    } catch (err) {
      setError(`Failed to generate report: ${err.response?.data?.detail || err.message}`);
      console.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    if (!generatedReport) {
      setError('No report to export');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Create a new report record first
      const reportData = {
        name: `${reportTypes.find(r => r.id === selectedReportType)?.name} - ${new Date().toLocaleDateString()}`,
        report_type: selectedReportType,
        description: `Generated report with filters: ${JSON.stringify(reportFilters)}`,
        parameters: reportFilters
      };

      await api.post('/reports/', reportData);
      
      // Generate the actual file based on format
      let fileName = '';
      let fileContent = '';
      let mimeType = '';
      
      if (format === 'pdf') {
        // For now, we'll create a simple text-based export
        // In a real implementation, you'd use a PDF library like jsPDF
        fileName = `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.txt`;
        fileContent = generateTextReport(generatedReport);
        mimeType = 'text/plain';
      } else if (format === 'excel') {
        // For now, we'll create a CSV export
        // In a real implementation, you'd use a library like xlsx
        fileName = `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
        fileContent = generateCSVReport(generatedReport);
        mimeType = 'text/csv';
      }
      
      // Download the file
      downloadFile(fileContent, fileName, mimeType);
      
      setSuccess(`Report exported as ${format.toUpperCase()} successfully!`);
      fetchReports(); // Refresh reports list
    } catch (err) {
      setError(`Failed to export report: ${err.response?.data?.detail || err.message}`);
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateTextReport = (report) => {
    const { type, data } = report;
    let content = `${reportTypes.find(r => r.id === type)?.name}\n`;
    content += `Generated: ${formatDate(report.generated_at)}\n`;
    content += `=====================================\n\n`;
    
    switch (type) {
      case 'sales':
        content += `SUMMARY:\n`;
        content += `Total Sales: ${data.summary?.total_sales?.toFixed(2) || '0.00'} MGA\n`;
        content += `Total Transactions: ${data.summary?.total_count || 0}\n`;
        content += `Total Items Sold: ${data.summary?.total_items || 0}\n`;
        content += `Average Sale: ${data.summary?.total_sales && data.summary?.total_count ? (data.summary.total_sales / data.summary.total_count).toFixed(2) : '0.00'} MGA\n\n`;
        
        if (data.details && data.details.length > 0) {
          content += `SALES DETAILS:\n`;
          content += `Sale Number | Customer | Amount | Items | Sold By | Date\n`;
          content += `------------|----------|--------|-------|---------|-----\n`;
          data.details.forEach(sale => {
            content += `${sale.sale_number} | ${sale.customer_name || 'Walk-in'} | ${sale.total_amount?.toFixed(2) || '0.00'} MGA | ${sale.items_count} | ${sale.sold_by || '-'} | ${formatDate(sale.created_at)}\n`;
          });
        }
        break;
        
      case 'inventory':
        content += `SUMMARY:\n`;
        content += `Total Products: ${data.summary?.total_products || 0}\n`;
        content += `Total Value: ${data.summary?.total_value?.toFixed(2) || '0.00'} MGA\n`;
        content += `Low Stock Items: ${data.summary?.low_stock_count || 0}\n`;
        content += `Out of Stock: ${data.summary?.out_of_stock_count || 0}\n\n`;
        
        if (data.products && data.products.length > 0) {
          content += `PRODUCT DETAILS:\n`;
          content += `Product | SKU | Category | Stock | Cost Price | Selling Price | Stock Value | Status\n`;
          content += `--------|-----|----------|-------|------------|---------------|-------------|-------\n`;
          data.products.forEach(product => {
            const status = product.is_out_of_stock ? 'Out of Stock' : product.is_low_stock ? 'Low Stock' : 'In Stock';
            content += `${product.name} | ${product.sku} | ${product.category} | ${product.stock_quantity} | ${product.cost_price?.toFixed(2) || '0.00'} MGA | ${product.selling_price?.toFixed(2) || '0.00'} MGA | ${product.stock_value?.toFixed(2) || '0.00'} MGA | ${status}\n`;
          });
        }
        break;
        
      case 'stock_movement':
        if (data.summary && data.summary.length > 0) {
          content += `MOVEMENT SUMMARY:\n`;
          data.summary.forEach(summary => {
            content += `${summary.movement_type}: ${summary.total_quantity} units (${summary.count} movements)\n`;
          });
          content += `\n`;
        }
        
        if (data.movements && data.movements.length > 0) {
          content += `MOVEMENT DETAILS:\n`;
          content += `Date | Product | SKU | Type | Quantity | Reference | Notes | User\n`;
          content += `-----|---------|-----|------|----------|-----------|-------|-----\n`;
          data.movements.forEach(movement => {
            content += `${formatDate(movement.created_at)} | ${movement.product_name} | ${movement.product_sku} | ${movement.movement_type} | ${movement.quantity} | ${movement.reference_number || '-'} | ${movement.notes || '-'} | ${movement.created_by || '-'}\n`;
          });
        }
        break;
        
      default:
        content += `Report data:\n${JSON.stringify(data, null, 2)}`;
    }
    
    return content;
  };

  const generateCSVReport = (report) => {
    const { type, data } = report;
    let content = '';
    
    switch (type) {
      case 'sales':
        if (data.details && data.details.length > 0) {
          content += 'Sale Number,Customer,Amount,Items,Sold By,Date\n';
          data.details.forEach(sale => {
            content += `"${sale.sale_number}","${sale.customer_name || 'Walk-in'}","${sale.total_amount?.toFixed(2) || '0.00'} MGA","${sale.items_count}","${sale.sold_by || '-'}","${formatDate(sale.created_at)}"\n`;
          });
        }
        break;
        
      case 'inventory':
        if (data.products && data.products.length > 0) {
          content += 'Product,SKU,Category,Stock,Cost Price,Selling Price,Stock Value,Status\n';
          data.products.forEach(product => {
            const status = product.is_out_of_stock ? 'Out of Stock' : product.is_low_stock ? 'Low Stock' : 'In Stock';
            content += `"${product.name}","${product.sku}","${product.category}","${product.stock_quantity}","${product.cost_price?.toFixed(2) || '0.00'} MGA","${product.selling_price?.toFixed(2) || '0.00'} MGA","${product.stock_value?.toFixed(2) || '0.00'} MGA","${status}"\n`;
          });
        }
        break;
        
      case 'stock_movement':
        if (data.movements && data.movements.length > 0) {
          content += 'Date,Product,SKU,Type,Quantity,Reference,Notes,User\n';
          data.movements.forEach(movement => {
            content += `"${formatDate(movement.created_at)}","${movement.product_name}","${movement.product_sku}","${movement.movement_type}","${movement.quantity}","${movement.reference_number || '-'}","${movement.notes || '-'}","${movement.created_by || '-'}"\n`;
          });
        }
        break;
        
      default:
        content = 'Report data not available for CSV export';
    }
    
    return content;
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderReportData = () => {
    if (!generatedReport) return null;

    const { type, data } = generatedReport;

    switch (type) {
      case 'sales':
        return (
          <div className="report-data">
            <h3>Sales Report Data</h3>
            <div className="sales-summary">
              <div className="summary-card">
                <h4>Total Sales</h4>
                <p>{data.summary?.total_sales?.toFixed(2) || '0.00'} MGA</p>
              </div>
              <div className="summary-card">
                <h4>Total Transactions</h4>
                <p>{data.summary?.total_count || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Total Items Sold</h4>
                <p>{data.summary?.total_items || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Average Sale</h4>
                <p>{data.summary?.total_sales && data.summary?.total_count ? (data.summary.total_sales / data.summary.total_count).toFixed(2) : '0.00'} MGA</p>
              </div>
            </div>
            
            {data.chart_data && data.chart_data.length > 0 && (
              <div className="sales-chart">
                <h4>Sales Trend</h4>
                <div className="chart-container">
                  <div className="chart-bars">
                    {data.chart_data.map((day, index) => (
                      <div key={index} className="chart-bar">
                        <div className="bar-group">
                          <div 
                            className="bar sales-bar" 
                            style={{ height: `${Math.max(5, (day.total / Math.max(...data.chart_data.map(d => d.total))) * 100)}%` }}
                            title={`Sales: ${day.total.toFixed(2)} MGA`}
                          ></div>
                        </div>
                        <div className="bar-label">
                          {day.date}
                        </div>
                        <div className="bar-values">
                          <div className="value sales">{day.total.toFixed(0)} MGA</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {data.details && data.details.length > 0 && (
              <div className="sales-details">
                <h4>Sales Details</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Sale Number</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Items</th>
                        <th>Sold By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.details.map((sale, index) => (
                        <tr key={index}>
                          <td>{sale.sale_number}</td>
                          <td>{sale.customer_name || 'Walk-in'}</td>
                          <td>{sale.total_amount?.toFixed(2) || '0.00'} MGA</td>
                          <td>{sale.items_count}</td>
                          <td>{sale.sold_by || '-'}</td>
                          <td>{formatDate(sale.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case 'inventory':
        return (
          <div className="report-data">
            <h3>Inventory Report Data</h3>
            <div className="inventory-summary">
              <div className="summary-card">
                <h4>Total Products</h4>
                <p>{data.summary?.total_products || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Total Value</h4>
                <p>{data.summary?.total_value?.toFixed(2) || '0.00'} MGA</p>
              </div>
              <div className="summary-card">
                <h4>Low Stock Items</h4>
                <p>{data.summary?.low_stock_count || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Out of Stock</h4>
                <p>{data.summary?.out_of_stock_count || 0}</p>
              </div>
            </div>
            
            {data.products && data.products.length > 0 && (
              <div className="inventory-details">
                <h4>Product Details</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Min Level</th>
                        <th>Cost Price</th>
                        <th>Selling Price</th>
                        <th>Stock Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((product, index) => (
                        <tr key={index}>
                          <td>{product.name}</td>
                          <td>{product.sku}</td>
                          <td>{product.category}</td>
                          <td>{product.stock_quantity}</td>
                          <td>{product.min_stock_level}</td>
                          <td>{product.cost_price?.toFixed(2) || '0.00'} MGA</td>
                          <td>{product.selling_price?.toFixed(2) || '0.00'} MGA</td>
                          <td>{product.stock_value?.toFixed(2) || '0.00'} MGA</td>
                          <td>
                            <span className={`status ${product.is_out_of_stock ? 'out-of-stock' : product.is_low_stock ? 'low-stock' : 'in-stock'}`}>
                              {product.is_out_of_stock ? 'Out of Stock' : product.is_low_stock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case 'stock_movement':
        return (
          <div className="report-data">
            <h3>Stock Movement Report Data</h3>
            
            {data.summary && data.summary.length > 0 && (
              <div className="movement-summary">
                <h4>Movement Summary</h4>
                <div className="summary-cards">
                  {data.summary.map((summary, index) => (
                    <div key={index} className="summary-card">
                      <h4>{summary.movement_type}</h4>
                      <p>Quantity: {summary.total_quantity}</p>
                      <p>Count: {summary.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {data.movements && data.movements.length > 0 && (
              <div className="stock-movements">
                <h4>Movement Details</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Reference</th>
                        <th>Notes</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.movements.map((movement, index) => (
                        <tr key={index}>
                          <td>{formatDate(movement.created_at)}</td>
                          <td>{movement.product_name}</td>
                          <td>{movement.product_sku}</td>
                          <td>
                            <span className={`movement-type ${movement.movement_type}`}>
                              {movement.movement_type}
                            </span>
                          </td>
                          <td>{movement.quantity}</td>
                          <td>{movement.reference_number || '-'}</td>
                          <td>{movement.notes || '-'}</td>
                          <td>{movement.created_by || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="report-data">
            <p>Report data format not implemented yet.</p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
    }
  };

  if (loading && !generatedReport) {
    return (
      <div className="reports">
        <div className="reports-loading">
          <div className="spinner"></div>
          <span>Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="reports-header">
        <h1>Reports</h1>
        <p>Generate detailed reports and export them for analysis</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>✅</span>
          {success}
        </div>
      )}

      <div className="reports-content">
        {/* Report Type Selection */}
        <div className="report-types-section">
          <h2>Select Report Type</h2>
          <div className="report-types-grid">
            {reportTypes.map((reportType) => (
              <div
                key={reportType.id}
                className={`report-type-card ${selectedReportType === reportType.id ? 'selected' : ''}`}
                onClick={() => handleReportTypeSelect(reportType.id)}
              >
                <div className="report-type-icon" style={{ backgroundColor: reportType.color }}>
                  {reportType.icon}
                </div>
                <div className="report-type-content">
                  <h3>{reportType.name}</h3>
                  <p>{reportType.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="filters-section">
            <h2>Report Filters</h2>
            <div className="filters-grid">
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={reportFilters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={reportFilters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Product ID</label>
                <input
                  type="text"
                  placeholder="Enter product ID"
                  value={reportFilters.product_id}
                  onChange={(e) => handleFilterChange('product_id', e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Category ID</label>
                <input
                  type="text"
                  placeholder="Enter category ID"
                  value={reportFilters.category_id}
                  onChange={(e) => handleFilterChange('category_id', e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={reportFilters.customer_name}
                  onChange={(e) => handleFilterChange('customer_name', e.target.value)}
                />
              </div>
            </div>
            <div className="filters-actions">
              <button
                className="btn btn-primary"
                onClick={generateReport}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowFilters(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Generated Report */}
        {generatedReport && (
          <div className="generated-report-section">
            <div className="report-header">
              <h2>
                {reportTypes.find(r => r.id === selectedReportType)?.name}
                <span className="report-date">
                  Generated: {formatDate(generatedReport.generated_at)}
                </span>
              </h2>
              <div className="report-actions">
                <button
                  className="btn btn-success"
                  onClick={() => exportReport('pdf')}
                  disabled={loading}
                >
                  📄 Export Text
                </button>
                <button
                  className="btn btn-info"
                  onClick={() => exportReport('excel')}
                  disabled={loading}
                >
                  📊 Export CSV
                </button>
              </div>
            </div>
            {renderReportData()}
          </div>
        )}

        {/* Previous Reports */}
        <div className="previous-reports-section">
          <h2>Previous Reports</h2>
          {reports.length > 0 ? (
            <div className="reports-list">
              {reports.map((report) => (
                <div key={report.id} className="report-item">
                  <div className="report-info">
                    <h4>{report.name}</h4>
                    <p>{report.description}</p>
                    <div className="report-meta">
                      <span>Type: {report.report_type}</span>
                      <span>Generated: {formatDate(report.generated_at)}</span>
                      <span>By: {report.generated_by_name}</span>
                    </div>
                  </div>
                  <div className="report-actions">
                    {report.file_path && (
                      <button className="btn btn-sm btn-outline">
                        📥 Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No previous reports found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
