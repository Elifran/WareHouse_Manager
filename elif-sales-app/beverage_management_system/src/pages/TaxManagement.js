import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import Table from '../components/Table';
import './TaxManagement.css';

const TaxManagement = () => {
  const { user } = useAuth();
  const api = useApi();
  const [taxClasses, setTaxClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTaxClass, setEditingTaxClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tax_rate: '',
    is_active: true
  });

  // Check if user has permission to manage tax classes
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (canManage) {
      fetchTaxClasses();
    }
  }, [canManage]);

  const fetchTaxClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/products/tax-classes/');
      setTaxClasses(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load tax classes');
      console.error('Tax classes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingTaxClass) {
        await api.put(`/api/products/tax-classes/${editingTaxClass.id}/`, formData);
      } else {
        await api.post('/api/products/tax-classes/', formData);
      }
      
      setShowModal(false);
      setEditingTaxClass(null);
      setFormData({ name: '', description: '', tax_rate: '', is_active: true });
      fetchTaxClasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save tax class');
      console.error('Save error:', err);
    }
  };

  const handleEdit = (taxClass) => {
    setEditingTaxClass(taxClass);
    setFormData({
      name: taxClass.name,
      description: taxClass.description,
      tax_rate: taxClass.tax_rate.toString(),
      is_active: taxClass.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (taxClass) => {
    if (!window.confirm(`Are you sure you want to delete "${taxClass.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/products/tax-classes/${taxClass.id}/`);
      fetchTaxClasses();
    } catch (err) {
      setError('Failed to delete tax class');
      console.error('Delete error:', err);
    }
  };

  const handleAddNew = () => {
    setEditingTaxClass(null);
    setFormData({ name: '', description: '', tax_rate: '', is_active: true });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTaxClass(null);
    setFormData({ name: '', description: '', tax_rate: '', is_active: true });
    setError('');
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'tax_rate', label: 'Tax Rate (%)', render: (value) => `${value}%` },
    { key: 'products_count', label: 'Products' },
    { key: 'is_active', label: 'Status', render: (value) => value ? 'Active' : 'Inactive' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, taxClass) => (
        <div className="action-buttons">
          <Button size="small" variant="outline" onClick={() => handleEdit(taxClass)}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => handleDelete(taxClass)}>
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (!canManage) {
    return (
      <div className="tax-management">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to manage tax classes. Only managers and administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tax-management">
      <div className="tax-header">
        <h1>Tax Class Management</h1>
        <Button onClick={handleAddNew}>
          Add New Tax Class
        </Button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="tax-content">
        <div className="tax-info">
          <h3>Tax Classes</h3>
          <p>Manage tax rates for different product categories. Tax rates are applied automatically during sales calculations.</p>
        </div>

        <Table
          data={taxClasses}
          columns={columns}
          loading={loading}
          emptyMessage="No tax classes found"
        />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTaxClass ? 'Edit Tax Class' : 'Add New Tax Class'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="tax-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Standard Rate"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this tax class"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tax_rate">Tax Rate (%) *</label>
                <input
                  type="number"
                  id="tax_rate"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="18.00"
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Active
                </label>
              </div>

              <div className="form-actions">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTaxClass ? 'Update' : 'Create'} Tax Class
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxManagement;
