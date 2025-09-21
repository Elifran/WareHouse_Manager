import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Table from '../components/Table';
import Button from '../components/Button';
import './Inventory.css';

const Inventory = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxClasses, setTaxClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    stockStatus: '',
    search: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTaxClasses();
  }, []);

  const fetchProducts = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add filters to params
      if (filterParams.category) params.append('category', filterParams.category);
      if (filterParams.search) params.append('search', filterParams.search);
      if (filterParams.is_active !== undefined) params.append('is_active', filterParams.is_active);
      if (filterParams.stock_quantity !== undefined) params.append('stock_quantity', filterParams.stock_quantity);
      
      const url = `/products/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      let products = response.data.results || response.data;
      
      // Handle low stock filter on frontend since it's a calculated field
      if (filterParams.stockStatus === 'low') {
        products = products.filter(product => product.is_low_stock);
      }
      
      setProducts(products);
    } catch (err) {
      setError('Failed to load products');
      console.error('Products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories/');
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error('Categories error:', err);
    }
  };

  const fetchTaxClasses = async () => {
    try {
      const response = await api.get('/products/tax-classes/');
      setTaxClasses(response.data.results || response.data);
    } catch (err) {
      console.error('Tax classes error:', err);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const handleEditProduct = async (product) => {
    try {
      // Fetch full product details including cost_price and category ID
      const response = await api.get(`/products/${product.id}/`);
      setEditingProduct(response.data);
      setShowAddModal(true);
    } catch (err) {
      setError('Failed to load product details');
      console.error('Product details error:', err);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        await api.delete(`/products/${product.id}/`);
        fetchProducts(filters);
      } catch (err) {
        setError('Failed to delete product');
        console.error('Delete error:', err);
      }
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    // Convert stock status filter to API parameters
    const apiParams = { ...newFilters };
    if (newFilters.stockStatus === 'out') {
      // For out of stock, filter by stock_quantity = 0
      apiParams.stock_quantity = 0;
    }
    
    fetchProducts(apiParams);
  };

  const clearFilters = () => {
    const clearedFilters = { category: '', stockStatus: '', search: '' };
    setFilters(clearedFilters);
    fetchProducts(clearedFilters);
  };

  const columns = [
    {
      key: 'name',
      header: 'Product Name',
      render: (value, row) => (
        <div>
          <div className="product-name">{value}</div>
          <div className="product-sku">{row.sku}</div>
        </div>
      )
    },
    {
      key: 'category_name',
      header: 'Category'
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      render: (value, row) => (
        <div className={`stock-quantity ${row.is_low_stock ? 'low-stock' : ''} ${row.is_out_of_stock ? 'out-of-stock' : ''}`}>
          {value} {row.unit}
          {row.is_low_stock && <span className="stock-warning">Low</span>}
          {row.is_out_of_stock && <span className="stock-warning">Out</span>}
        </div>
      )
    },
    {
      key: 'price',
      header: 'Price',
      render: (value) => `$${parseFloat(value).toFixed(2)}`
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <Button
            size="small"
            variant="outline"
            onClick={() => handleEditProduct(row)}
          >
            Edit
          </Button>
          {user?.role === 'admin' && (
            <Button
              size="small"
              variant="danger"
              onClick={() => handleDeleteProduct(row)}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <Button onClick={handleAddProduct}>
          Add Product
        </Button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="inventory-filters">
        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={filters.category} 
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Stock Status:</label>
          <select 
            value={filters.stockStatus} 
            onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
          >
            <option value="">All</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Button variant="outline" size="small" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      <Table
        data={products}
        columns={columns}
        loading={loading}
        emptyMessage="No products found"
      />

      {showAddModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          taxClasses={taxClasses}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchProducts(filters);
          }}
        />
      )}
    </div>
  );
};

const ProductModal = ({ product, categories, taxClasses, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || '',
    tax_class: product?.tax_class || '',
    sku: product?.sku || '',
    price: product?.price || '',
    cost_price: product?.cost_price || '',
    stock_quantity: product?.stock_quantity || 0,
    min_stock_level: product?.min_stock_level || 10,
    max_stock_level: product?.max_stock_level || 1000,
    unit: product?.unit || 'piece',
    is_active: product?.is_active ?? true
  });

  // Update form data when product changes (for editing)
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        tax_class: product.tax_class || '',
        sku: product.sku || '',
        price: product.price || '',
        cost_price: product.cost_price || '',
        stock_quantity: product.stock_quantity || 0,
        min_stock_level: product.min_stock_level || 10,
        max_stock_level: product.max_stock_level || 1000,
        unit: product.unit || 'piece',
        is_active: product.is_active ?? true
      });
    }
  }, [product]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (product) {
        await api.put(`/products/${product.id}/`, formData);
      } else {
        await api.post('/products/', formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save product');
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'Add Product'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>SKU *</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tax Class</label>
              <select
                name="tax_class"
                value={formData.tax_class}
                onChange={handleChange}
              >
                <option value="">No Tax Class</option>
                {taxClasses.map(taxClass => (
                  <option key={taxClass.id} value={taxClass.id}>
                    {taxClass.name} ({taxClass.tax_rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="piece, liter, kg, etc."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price *</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Cost Price</label>
              <input
                type="number"
                step="0.01"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Stock Quantity</label>
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Min Stock Level</label>
              <input
                type="number"
                name="min_stock_level"
                value={formData.min_stock_level}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Max Stock Level</label>
            <input
              type="number"
              name="max_stock_level"
              value={formData.max_stock_level}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              Active
            </label>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {product ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
