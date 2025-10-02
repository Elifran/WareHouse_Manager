import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SaleDetailModal from '../components/SaleDetailModal';
import PrintButton from '../components/PrintButton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleDetailLoading, setSaleDetailLoading] = useState(false);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [monthlySalesData, setMonthlySalesData] = useState([]);

  // Check if user is sales team (limited access)
  const isSalesTeam = user?.role === 'sales';

  // Process chart data from sales
  const processChartData = (salesData) => {
    if (!Array.isArray(salesData)) return;

    // Group sales by date for chart based on selected period
    const chartData = {};

    salesData.forEach(sale => {
      const saleDate = new Date(sale.created_at);
      let dateKey;
      
      // Determine date key based on selected period
      switch (selectedPeriod) {
        case 'daily':
          // Group by hour for daily view
          dateKey = `${saleDate.toISOString().split('T')[0]} ${String(saleDate.getHours()).padStart(2, '0')}:00`;
          break;
        case 'weekly':
          // Group by day for weekly view
          dateKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'month':
          // Group by day for monthly view
          dateKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        default:
          dateKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      
      // Skip refunded sales from chart data
      if (sale.status === 'refunded') {
        return;
      }
      
      const amount = parseFloat(sale.paid_amount) || 0; // Use paid amount for chart
      let cost = parseFloat(sale.cost_amount) || 0;
      
      // If cost_amount is not available, try to calculate from items
      if (cost === 0 && sale.items && Array.isArray(sale.items)) {
        cost = sale.items.reduce((itemCost, item) => {
          const itemCostPrice = parseFloat(item.cost_price) || 0;
          const itemQuantity = parseFloat(item.quantity) || 0;
          return itemCost + (itemCostPrice * itemQuantity);
        }, 0);
      }
      
      const profit = amount - cost;

      if (!chartData[dateKey]) {
        chartData[dateKey] = { date: dateKey, sales: 0, cost: 0, profit: 0, count: 0 };
      }
      chartData[dateKey].sales += amount;
      chartData[dateKey].cost += cost;
      chartData[dateKey].profit += profit;
      chartData[dateKey].count += 1;
    });

    // Convert to array and sort by date
    const chartArray = Object.values(chartData)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    setDailySalesData(chartArray);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, isSalesTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selected period
      const now = new Date();
      let startDate;
      
      switch (selectedPeriod) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      
      // For Admin app, fetch data filtered by time period
      const [salesResponse, purchaseOrdersResponse, productsResponse] = await Promise.all([
        api.get(`/api/sales/?ordering=-created_at&created_at__gte=${startDateStr}`), // Filter sales by date
        api.get('/api/purchases/purchase-orders/'),
        api.get('/api/products/?ordering=-created_at') // Get products ordered by creation date
      ]);
      
      // Calculate comprehensive metrics - handle paginated responses
      const salesData = salesResponse.data.results || salesResponse.data;
      const ordersData = purchaseOrdersResponse.data.results || purchaseOrdersResponse.data;
      const productsData = productsResponse.data.results || productsResponse.data;
      
      // Count only non-refunded sales
      const totalSales = Array.isArray(salesData) ? salesData.filter(sale => sale.status !== 'refunded').length : 0;
      const totalOrders = Array.isArray(ordersData) ? ordersData.length : 0;
      const totalProducts = Array.isArray(productsData) ? productsData.length : 0;
      
      // Calculate total sales value (only paid amounts, excluding refunded sales)
      const totalSalesValue = Array.isArray(salesData) ? salesData.reduce((sum, sale) => {
        // Only count sales that are not refunded and have paid amounts
        if (sale.status === 'refunded') {
          return sum; // Skip refunded sales
        }
        return sum + (parseFloat(sale.paid_amount) || 0);
      }, 0) : 0;
      
      // Calculate total order value
      const totalOrderValue = Array.isArray(ordersData) ? ordersData.reduce((sum, order) => {
        return sum + (parseFloat(order.total_amount) || 0);
      }, 0) : 0;
      
      // Calculate inventory metrics and product analytics
      let outOfStockCount = 0;
      let lowStockCount = 0;
      let totalRetailValue = 0;
      let totalCostValue = 0;
      let productSalesCount = {};
      let latestProducts = [];
      
      if (Array.isArray(productsData)) {
        productsData.forEach(product => {
          if (product.is_out_of_stock) {
            outOfStockCount++;
          }
          if (product.is_low_stock) {
            lowStockCount++;
          }
          // Calculate retail value (stock * price)
          const stock = parseFloat(product.stock_quantity) || 0;
          const price = parseFloat(product.price) || 0;
          const costPrice = parseFloat(product.cost_price) || 0;
          totalRetailValue += stock * price;
          totalCostValue += stock * costPrice;
        });
        
        // Get latest 3 products
        latestProducts = productsData.slice(0, 3).map(product => ({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price) || 0,
          stock: parseFloat(product.stock_quantity) || 0,
          created_at: product.created_at
        }));
      }
      
      // Calculate sales analytics
      let totalProfit = 0;
      let totalRevenue = 0;
      let totalCost = 0;
      let recentSales = [];
      
      if (Array.isArray(salesData)) {
        recentSales = salesData.slice(0, 5).map(sale => ({
          id: sale.id,
          sale_number: sale.sale_number,
          customer_name: sale.customer_name || t('dashboard.walk_in_customer'),
          total_amount: parseFloat(sale.paid_amount) || 0, // Show paid amount instead of total
          payment_method: sale.payment_method,
          status: sale.status,
          created_at: sale.created_at,
          sold_by_name: sale.sold_by_name
        }));
        
        // Calculate profit from sales
        salesData.forEach((sale, index) => {
          // Skip refunded sales from accounting calculations
          if (sale.status === 'refunded') {
            return;
          }
          
          // Use paid_amount for revenue (actual money received)
          const revenue = parseFloat(sale.paid_amount) || 0;
          let cost = parseFloat(sale.cost_amount) || 0;
          
          
          // If cost_amount is not available, try to calculate from items
          if (cost === 0 && sale.items && Array.isArray(sale.items)) {
            cost = sale.items.reduce((itemCost, item) => {
              // Use total_cost if available, otherwise calculate from unit_cost
              const itemTotalCost = parseFloat(item.total_cost) || 0;
              const itemCostPrice = parseFloat(item.unit_cost) || 0;
              const itemQuantity = parseFloat(item.quantity) || 0;
              
              // If total_cost is available, use it directly
              if (itemTotalCost > 0) {
                return itemCost + itemTotalCost;
              }
              // Otherwise calculate from unit_cost * quantity
              else {
                const calculatedCost = itemCostPrice * itemQuantity;
                return itemCost + calculatedCost;
              }
            }, 0);
          }
          
          totalRevenue += revenue;
          totalCost += cost;
          totalProfit += (revenue - cost);
        });
        
      }
      
      // Find best-selling product (most sold quantity)
      let bestSellingProduct = null;
      if (Array.isArray(salesData)) {
        let productSales = {};
        salesData.forEach(sale => {
          // Skip refunded sales from product analytics
          if (sale.status === 'refunded') {
            return;
          }
          
          if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
              const productId = item.product;
              const quantity = parseFloat(item.quantity) || 0;
              if (!productSales[productId]) {
                productSales[productId] = {
                  id: productId,
                  name: item.product_name,
                  totalQuantity: 0,
                  totalRevenue: 0
                };
              }
              productSales[productId].totalQuantity += quantity;
              // Use paid amount proportionally for revenue calculation
              const salePaidAmount = parseFloat(sale.paid_amount) || 0;
              const saleTotalAmount = parseFloat(sale.total_amount) || 0;
              const itemRevenue = saleTotalAmount > 0 ? (parseFloat(item.total_price) || 0) * (salePaidAmount / saleTotalAmount) : 0;
              productSales[productId].totalRevenue += itemRevenue;
            });
          }
        });
        
        // Find the product with highest quantity sold
        const productIds = Object.keys(productSales);
        if (productIds.length > 0) {
          bestSellingProduct = productIds.reduce((best, current) => 
            productSales[current].totalQuantity > productSales[best].totalQuantity ? current : best
          );
          bestSellingProduct = productSales[bestSellingProduct];
        }
      }
      
      setDashboardData({
        sales: {
          total_sales: totalSales,
          total_value: totalSalesValue,
          total_revenue: totalRevenue,
          total_cost: totalCost,
          total_profit: totalProfit,
          recent_sales: recentSales
        },
        orders: {
          total_orders: totalOrders,
          total_value: totalOrderValue
        },
        inventory: {
          total_products: totalProducts,
          out_of_stock: outOfStockCount,
          low_stock: lowStockCount,
          retail_value: totalRetailValue,
          cost_value: totalCostValue,
          latest_products: latestProducts
        },
        analytics: {
          best_selling_product: bestSellingProduct,
          profit_margin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0
        }
      });

      // Process chart data
      processChartData(salesData);
    } catch (err) {
      setError(t('dashboard.failed_to_load'));
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period) => {
    // Only allow period changes for non-sales users
    if (!isSalesTeam) {
      setSelectedPeriod(period);
    }
  };

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

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <span>{t('dashboard.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-error">
          <h2>{t('dashboard.error')}</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>{t('dashboard.title')}</h1>
            <p>{t('dashboard.welcome', { username: user?.username })}</p>
            {isSalesTeam && (
              <p className="role-indicator">{t('dashboard.sales_team_view')}</p>
            )}
          </div>
          {!isSalesTeam && (
            <div className="period-selector">
              <label>{t('dashboard.time_period')}</label>
              <select 
                value={selectedPeriod} 
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="period-select"
              >
                <option value="daily">{t('dashboard.daily')}</option>
                <option value="weekly">{t('dashboard.weekly')}</option>
                <option value="month">{t('dashboard.monthly')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Sales Summary Card */}
        <div className="metric-card">
          <div className="metric-icon sales">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.total_sales')}</h3>
            <p className="metric-value">
              {(dashboardData?.sales?.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA
            </p>
            <p className="metric-label">
              {dashboardData?.sales?.total_sales || 0} {t('dashboard.sales')}
            </p>
          </div>
        </div>

        {/* Total Cost Card */}
        <div className="metric-card">
          <div className="metric-icon cost">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.total_cost')}</h3>
            <p className="metric-value">
              {(dashboardData?.sales?.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA
            </p>
            <p className="metric-label">
              {t('dashboard.cost_of_goods_sold')}
            </p>
          </div>
        </div>

        {/* Orders Summary Card */}
        <div className="metric-card">
          <div className="metric-icon orders">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 7h-1V6a4 4 0 0 0-8 0v1H9a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM12 4a2 2 0 0 1 2 2v1h-4V6a2 2 0 0 1 2-2zm6 15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.total_orders')}</h3>
            <p className="metric-value">
              {dashboardData?.orders?.total_orders || 0}
            </p>
            <p className="metric-label">
              {t('dashboard.orders')}
            </p>
          </div>
        </div>

        {/* Inventory Summary Card */}
        <div className="metric-card">
          <div className="metric-icon inventory">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
              <path d="M2 17L12 22L22 17"/>
              <path d="M2 12L12 17L22 12"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.total_products')}</h3>
            <p className="metric-value">
              {dashboardData?.inventory?.total_products || 0}
            </p>
            <p className="metric-label">
              {t('dashboard.active_products')}
            </p>
          </div>
        </div>



        {/* Retail Value Card */}
        <div className="metric-card">
          <div className="metric-icon retail">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4V2c0-.55-.45-1-1-1s-1 .45-1 1v2H3c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6h2c.55 0 1-.45 1-1s-.45-1-1-1H7zM21 4h-2V2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6h2c.55 0 1-.45 1-1s-.45-1-1-1z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.retail_value')}</h3>
            <p className="metric-value">
              {(dashboardData?.inventory?.retail_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA
            </p>
            <p className="metric-label">
              {dashboardData?.inventory?.low_stock || 0} {t('dashboard.low_stock')}
            </p>
          </div>
        </div>

        {/* Out of Stock Card */}
        <div className="metric-card">
          <div className="metric-icon out-of-stock">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.out_of_stock')}</h3>
            <p className="metric-value">
              {dashboardData?.inventory?.out_of_stock || 0}
            </p>
            <p className="metric-label">
              {t('dashboard.products_need_restocking')}
            </p>
          </div>
        </div>

        {/* Profit Card */}
        <div className="metric-card">
          <div className="metric-icon profit">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.total_profit')}</h3>
            <p className="metric-value">
              {(dashboardData?.sales?.total_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA
            </p>
            <p className="metric-label">
              {dashboardData?.analytics?.profit_margin?.toFixed(1) || '0.0'}% {t('dashboard.margin')}
            </p>
          </div>
        </div>

        {/* Best Selling Product Card */}
        <div className="metric-card">
          <div className="metric-icon best-seller">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{t('dashboard.best_seller')}</h3>
            <p className="metric-value">
              {dashboardData?.analytics?.best_selling_product?.name || 'N/A'}
            </p>
            <p className="metric-label">
              {dashboardData?.analytics?.best_selling_product?.totalQuantity || 0} {t('dashboard.units_sold')}
            </p>
          </div>
        </div>

      </div>

      {/* Sales Chart - Only for Admin/Manager */}
      {!isSalesTeam && (
        <div className="dashboard-section">
          <h2>{t('dashboard.sales_trend_this_month')}</h2>
          <div className="sales-chart">
            {dailySalesData.length > 0 ? (
              <div className="chart-container">
                <div className="chart-bars">
                  {dailySalesData.map((day, index) => (
                    <div key={index} className="chart-bar">
                      <div className="bar-group">
                        <div 
                          className="bar sales-bar" 
                          style={{ height: `${Math.max(5, (day.sales / Math.max(...dailySalesData.map(d => d.sales))) * 100)}%` }}
                          title={`Sales: ${day.sales.toFixed(2)} MGA`}
                        ></div>
                        <div 
                          className="bar cost-bar" 
                          style={{ height: `${Math.max(5, (day.cost / Math.max(...dailySalesData.map(d => d.sales))) * 100)}%` }}
                          title={`Cost: ${day.cost.toFixed(2)} MGA`}
                        ></div>
                      </div>
                      <div className="bar-label">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="bar-values">
                        <div className="value sales">{day.sales.toFixed(0)} MGA</div>
                        <div className="value cost">{day.cost.toFixed(0)} MGA</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color sales"></div>
                    <span>Sales</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color cost"></div>
                    <span>Cost</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="no-data">No sales data available for the selected period</p>
            )}
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>{t('dashboard.recent_sales')}</h2>
          {dashboardData?.recent_sales?.length > 0 && (
            <PrintButton
              data={{
                ...dashboardData.recent_sales,
                user_name: user?.username || t('app.unknown_user'),
                user_id: user?.id || 'unknown',
                print_timestamp: new Date().toISOString(),
                print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              }}
              title={t('titles.sales_management_report')}
              type="sales_history"
              printText={t('buttons.print_sales_report')}
              className="print-recent-sales-btn"
            />
          )}
        </div>
        <div className="recent-sales">
          {dashboardData?.recent_sales?.length > 0 ? (
            <div className="sales-list">
              {dashboardData.recent_sales.map((sale, index) => (
                <div 
                  key={index} 
                  className="sale-item clickable"
                  onClick={() => handleSaleClick(sale)}
                  title={t('dashboard.click_to_view_details')}
                >
                  <div className="sale-info">
                    <h4>{sale.sale_number}</h4>
                    <p>{sale.customer_name || t('dashboard.walk_in_customer')}</p>
                  </div>
                  <div className="sale-amount">
                    <span>{sale.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA</span>
                    <small>{new Date(sale.created_at).toLocaleDateString()}</small>
                  </div>
                  <div className="sale-arrow">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No recent sales</p>
          )}
        </div>
      </div>

      {/* Latest Products */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Latest Products</h2>
        </div>
        <div className="latest-products">
          {dashboardData?.inventory?.latest_products?.length > 0 ? (
            <div className="products-list">
              {dashboardData.inventory.latest_products.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-info">
                    <h4>{product.name}</h4>
                    <p>Added: {new Date(product.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="product-stats">
                    <div className="stat-row">
                      <span className="stat-label">Price:</span>
                      <span className="stat-value">{product.price.toFixed(2)} MGA</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Stock:</span>
                      <span className="stat-value">{product.stock} units</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Value:</span>
                      <span className="stat-value">{(product.stock * product.price).toFixed(2)} MGA</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No products available</p>
          )}
        </div>
      </div>

      {/* Best Selling Product Details */}
      {dashboardData?.analytics?.best_selling_product && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Best Selling Product</h2>
          </div>
          <div className="best-seller-details">
            <div className="product-item featured">
              <div className="product-info">
                <h4>{dashboardData.analytics.best_selling_product.name}</h4>
                <p>Top performer in sales</p>
              </div>
              <div className="product-stats">
                <div className="stat-row">
                  <span className="stat-label">{t('dashboard.units_sold')}:</span>
                  <span className="stat-value highlight">{dashboardData.analytics.best_selling_product.totalQuantity}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">{t('dashboard.revenue')}:</span>
                  <span className="stat-value highlight">{dashboardData.analytics.best_selling_product.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">{t('dashboard.avg_per_sale')}:</span>
                  <span className="stat-value">{((dashboardData.analytics.best_selling_product.totalRevenue / dashboardData.analytics.best_selling_product.totalQuantity) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MGA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Sales Chart */}
      {dailySalesData.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Daily Sales Trend (Last 30 Days)</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `${value.toLocaleString()} MGA`} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${parseFloat(value).toFixed(2)} MGA`, 
                    name === 'sales' ? 'Sales' : name === 'cost' ? 'Cost' : 'Profit'
                  ]}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales" />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="Cost" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Sales Chart */}
      {monthlySalesData.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Monthly Sales Overview (Last 12 Months)</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `${value.toLocaleString()} MGA`} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${parseFloat(value).toFixed(2)} MGA`, 
                    name === 'sales' ? 'Sales' : name === 'cost' ? 'Cost' : 'Profit'
                  ]}
                  labelFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
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

export default Dashboard;
