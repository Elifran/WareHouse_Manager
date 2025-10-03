import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SaleDetailModal from '../components/SaleDetailModal';
import PrintButton from '../components/PrintButton';
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

  // Check if user is sales team (limited access)
  const isSalesTeam = user?.role === 'sales';

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, isSalesTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // For Orders app, fetch order-related data instead of sales reports
      const [purchaseOrdersResponse, deliveriesResponse, pendingDeliveriesResponse, suppliersResponse] = await Promise.all([
        api.get('/api/purchases/purchase-orders/'),
        api.get('/api/purchases/deliveries/'),
        api.get('/api/purchases/deliveries/pending/'),
        api.get('/api/purchases/suppliers/')
      ]);
      
      // Calculate order-related metrics
      const totalOrders = purchaseOrdersResponse.data.length;
      const totalDeliveries = deliveriesResponse.data.length;
      const pendingDeliveries = pendingDeliveriesResponse.data.length;
      const totalSuppliers = suppliersResponse.data.length;
      
      // Calculate total order value
      const totalOrderValue = purchaseOrdersResponse.data.reduce((sum, order) => {
        return sum + (order.total_amount || 0);
      }, 0);
      
      setDashboardData({
        orders: {
          total_orders: totalOrders,
          total_value: totalOrderValue
        },
        deliveries: {
          total_deliveries: totalDeliveries,
          pending_deliveries: pendingDeliveries
        },
        suppliers: {
          total_suppliers: totalSuppliers
        }
      });
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
        {/* Orders Summary Cards */}
        <div className="metric-card">
          <div className="metric-icon orders">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 7h-1V6a4 4 0 0 0-8 0v1H9a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM12 4a2 2 0 0 1 2 2v1h-4V6a2 2 0 0 1 2-2zm6 15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Total Orders</h3>
            <p className="metric-value">
              {dashboardData?.orders?.total_orders || 0}
            </p>
            <p className="metric-label">
              orders
            </p>
          </div>
        </div>

        {!isSalesTeam && (
          <>
            <div className="metric-card">
              <div className="metric-icon deliveries">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 7h-1V6a4 4 0 0 0-8 0v1H9a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM12 4a2 2 0 0 1 2 2v1h-4V6a2 2 0 0 1 2-2zm6 15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
                </svg>
              </div>
              <div className="metric-content">
                <h3>Total Deliveries</h3>
                <p className="metric-value">
                  {dashboardData?.deliveries?.total_deliveries || 0}
                </p>
                <p className="metric-label">
                  Completed Deliveries
                </p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon pending">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="metric-content">
                <h3>Pending Deliveries</h3>
                <p className="metric-value">
                  {dashboardData?.deliveries?.pending_deliveries || 0}
                </p>
                <p className="metric-label">
                  Awaiting Confirmation
                </p>
              </div>
            </div>
          </>
        )}

        <div className="metric-card">
          <div className="metric-icon suppliers">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Total Suppliers</h3>
            <p className="metric-value">
              {dashboardData?.suppliers?.total_suppliers || 0}
            </p>
            <p className="metric-label">
              Active Suppliers
            </p>
          </div>
        </div>

        {!isSalesTeam && (
          <div className="metric-card">
            <div className="metric-icon retail">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4V2c0-.55-.45-1-1-1s-1 .45-1 1v2H3c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6h2c.55 0 1-.45 1-1s-.45-1-1-1H7zM21 4h-2V2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6h2c.55 0 1-.45 1-1s-.45-1-1-1z"/>
              </svg>
            </div>
            <div className="metric-content">
              <h3>Retail Value</h3>
              <p className="metric-value">
                {dashboardData?.inventory?.total_retail_value?.toFixed(2) || '0.00'} MGA
              </p>
              <p className="metric-label">
                {dashboardData?.inventory?.low_stock_count || 0} low stock
              </p>
            </div>
          </div>
        )}

        <div className="metric-card">
          <div className="metric-icon alert">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Out of Stock</h3>
            <p className="metric-value">
              {dashboardData?.inventory?.out_of_stock_count || 0}
            </p>
            <p className="metric-label">products need restocking</p>
          </div>
        </div>
      </div>

      {/* Sales Chart - Only for Admin/Manager */}
      {!isSalesTeam && (
        <div className="dashboard-section">
          <h2>{t('dashboard.sales_trend')}</h2>
          <div className="sales-chart">
            {dashboardData?.chart_data?.length > 0 ? (
              <div className="chart-container">
                <div className="chart-bars">
                  {dashboardData.chart_data.map((day, index) => (
                    <div key={index} className="chart-bar">
                      <div className="bar-group">
                        <div 
                          className="bar sales-bar" 
                          style={{ height: `${Math.max(5, (day.sales / Math.max(...dashboardData.chart_data.map(d => d.sales))) * 100)}%` }}
                          title={`${t('dashboard.sales')}: ${day.sales.toFixed(2)} MGA`}
                        ></div>
                        <div 
                          className="bar cost-bar" 
                          style={{ height: `${Math.max(5, (day.cost / Math.max(...dashboardData.chart_data.map(d => d.sales))) * 100)}%` }}
                          title={`${t('dashboard.cost')}: ${day.cost.toFixed(2)} MGA`}
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
                    <span>{t('dashboard.sales')}</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color cost"></div>
                    <span>{t('dashboard.cost')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="no-data">{t('dashboard.no_sales_data')}</p>
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
                    <span>{sale.total_amount.toFixed(2)} MGA</span>
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

      {/* Top Products */}
      <div className="dashboard-section">
        <h2>{t('dashboard.top_selling_products')}</h2>
        <div className="top-products">
          {dashboardData?.top_products?.length > 0 ? (
            <div className="products-list">
              {dashboardData.top_products.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-info">
                    <h4>{product.product__name}</h4>
                    <p>{product.product__sku}</p>
                  </div>
                  <div className="product-stats">
                    <div className="stat-row">
                      <span className="stat-label">{t('dashboard.sold')}:</span>
                      <span className="stat-value">{product.total_sold} {product.unit_symbol || 'piece'}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">{t('dashboard.revenue')}:</span>
                      <span className="stat-value">{product.total_revenue.toFixed(2)} MGA</span>
                    </div>
                    {!isSalesTeam && (
                      <>
                        <div className="stat-row">
                          <span className="stat-label">{t('dashboard.cost')}:</span>
                          <span className="stat-value">{product.total_cost?.toFixed(2) || '0.00'} MGA</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">{t('dashboard.profit')}:</span>
                          <span className="stat-value profit">{product.profit?.toFixed(2) || '0.00'} MGA</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">{t('dashboard.margin')}:</span>
                          <span className="stat-value margin">{product.profit_margin?.toFixed(1) || '0.0'}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No sales data available</p>
          )}
        </div>
      </div>

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
