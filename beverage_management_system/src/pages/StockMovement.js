import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import Table from '../components/Table';
import './StockMovement.css';

const StockMovement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const api = useApi();
  const [stockMovements, setStockMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    product: '',
    movement_type: '',
    date_from: '',
    date_to: '',
    search: ''
  });

  // Check if user has permission to view stock movements
  const canView = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (canView) {
      fetchStockMovements();
      fetchProducts();
    }
  }, [canView]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStockMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.product) params.append('product', filters.product);
      if (filters.movement_type) params.append('movement_type', filters.movement_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search);
      
      const response = await api.get(`/products/stock-movements/?${params.toString()}`);
      setStockMovements(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load stock movements');
      console.error('Stock movements error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(response.data.results || response.data);
    } catch (err) {
      console.error('Products error:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    fetchStockMovements();
  };

  const handleClearFilters = () => {
    setFilters({
      product: '',
      movement_type: '',
      date_from: '',
      date_to: '',
      search: ''
    });
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

  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'in':
        return 'text-green-600 bg-green-100';
      case 'out':
        return 'text-red-600 bg-red-100';
      case 'adjustment':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMovementTypeLabel = (type) => {
    switch (type) {
      case 'in':
        return 'Stock In';
      case 'out':
        return 'Stock Out';
      case 'adjustment':
        return 'Adjustment';
      default:
        return type;
    }
  };

  const columns = [
    { 
      key: 'created_at', 
      label: 'Date & Time',
      render: (value) => formatDate(value)
    },
    { 
      key: 'product', 
      label: 'Product',
      render: (value) => value?.name || 'N/A'
    },
    { 
      key: 'movement_type', 
      label: 'Type',
      render: (value) => (
        <span className={`movement-type-badge ${getMovementTypeColor(value)}`}>
          {getMovementTypeLabel(value)}
        </span>
      )
    },
    { 
      key: 'quantity', 
      label: 'Quantity',
      render: (value, item) => {
        const sign = item.movement_type === 'in' ? '+' : '-';
        return (
          <span className={`quantity ${item.movement_type === 'in' ? 'positive' : 'negative'}`}>
            {sign}{value} {item.unit?.symbol || ''}
          </span>
        );
      }
    },
    { 
      key: 'reference_number', 
      label: 'Reference',
      render: (value) => value || '-'
    },
    { 
      key: 'notes', 
      label: 'Notes',
      render: (value) => value || '-'
    },
    { 
      key: 'created_by', 
      label: 'Created By',
      render: (value) => value?.username || 'System'
    }
  ];

  if (!canView) {
    return (
      <div className="stock-movement">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to view stock movements. Only managers and administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-movement">
      <div className="stock-header">
        <h1>{t('titles.stock_movement_history')}</h1>
        <p>Track all stock movements including purchases, sales, and adjustments</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="stock-filters">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Product:</label>
            <select 
              value={filters.product} 
              onChange={(e) => handleFilterChange('product', e.target.value)}
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Movement Type:</label>
            <select 
              value={filters.movement_type} 
              onChange={(e) => handleFilterChange('movement_type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date From:</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date To:</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by reference or notes..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-actions">
          <Button onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="stock-content">
        <div className="content-header">
          <h2>{t('titles.stock_movements')}</h2>
          <div className="movement-summary">
            <div className="summary-item">
              <span className="summary-label">Total Movements:</span>
              <span className="summary-value">{stockMovements.length}</span>
            </div>
          </div>
        </div>

        <Table
          data={stockMovements}
          columns={columns}
          loading={loading}
          emptyMessage="No stock movements found"
        />
      </div>
    </div>
  );
};

export default StockMovement;
