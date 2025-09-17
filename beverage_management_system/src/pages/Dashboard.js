import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard/');
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.username}!</p>
      </div>

      <div className="dashboard-grid">
        {/* Sales Summary Cards */}
        <div className="metric-card">
          <div className="metric-icon sales">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Today's Sales</h3>
            <p className="metric-value">
              ${dashboardData?.sales?.today?.total_sales?.toFixed(2) || '0.00'}
            </p>
            <p className="metric-label">
              {dashboardData?.sales?.today?.total_count || 0} transactions
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon revenue">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>This Month</h3>
            <p className="metric-value">
              ${dashboardData?.sales?.this_month?.total_sales?.toFixed(2) || '0.00'}
            </p>
            <p className="metric-label">
              {dashboardData?.sales?.this_month?.total_count || 0} transactions
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon inventory">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Total Products</h3>
            <p className="metric-value">
              {dashboardData?.inventory?.total_products || 0}
            </p>
            <p className="metric-label">
              {dashboardData?.inventory?.low_stock_count || 0} low stock
            </p>
          </div>
        </div>

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

      {/* Recent Sales */}
      <div className="dashboard-section">
        <h2>Recent Sales</h2>
        <div className="recent-sales">
          {dashboardData?.recent_sales?.length > 0 ? (
            <div className="sales-list">
              {dashboardData.recent_sales.map((sale, index) => (
                <div key={index} className="sale-item">
                  <div className="sale-info">
                    <h4>{sale.sale_number}</h4>
                    <p>{sale.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  <div className="sale-amount">
                    <span>${sale.total_amount.toFixed(2)}</span>
                    <small>{new Date(sale.created_at).toLocaleDateString()}</small>
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
        <h2>Top Selling Products</h2>
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
                    <span>{product.total_sold} sold</span>
                    <small>${product.total_revenue.toFixed(2)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No sales data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
