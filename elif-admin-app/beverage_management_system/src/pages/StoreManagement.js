import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import './StoreManagement.css';

const StoreManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const api = useApi();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    address: '',
    phone: '',
    email: '',
    is_active: true
  });

  // Check if user has permission to manage stores
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (canManage) {
      fetchStore();
    }
  }, [canManage]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStore = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/core/stores/');
      const stores = response.data.results || response.data;
      
      if (stores && stores.length > 0) {
        // Get the first store (there should only be one)
        const firstStore = stores[0];
        setStore(firstStore);
        setFormData({
          name: firstStore.name || '',
          owner: firstStore.owner || '',
          address: firstStore.address || '',
          phone: firstStore.phone || '',
          email: firstStore.email || '',
          is_active: firstStore.is_active !== undefined ? firstStore.is_active : true
        });
      } else {
        // No store exists yet, show empty form
        setStore(null);
        setFormData({
          name: '',
          owner: '',
          address: '',
          phone: '',
          email: '',
          is_active: true
        });
      }
    } catch (err) {
      setError(t('store_management.errors.failed_to_load') || 'Failed to load store information');
      console.error('Store error:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateStore = (data) => {
    const errors = [];

    // Check if name is provided
    if (!data.name || data.name.trim() === '') {
      errors.push(t('store_management.validation.name_required') || 'Store name is required');
    }

    // Validate email format if provided
    if (data.email && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push(t('store_management.validation.invalid_email') || 'Invalid email format');
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validate the store data
      const validationErrors = validateStore(formData);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      setSaving(true);

      if (store) {
        // Update existing store
        const response = await api.put(`/api/core/stores/${store.id}/`, formData);
        setStore(response.data);
        setSuccess(t('store_management.success.updated') || 'Store information updated successfully');
      } else {
        // Create new store
        const response = await api.post('/api/core/stores/', formData);
        setStore(response.data);
        setSuccess(t('store_management.success.created') || 'Store information created successfully');
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      // Handle specific backend errors
      const errorData = err.response?.data;
      let errorMessage = t('store_management.errors.failed_to_save') || 'Failed to save store information';
      
      if (errorData) {
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join('. ');
        } else if (errorData.name) {
          errorMessage = `Name: ${Array.isArray(errorData.name) ? errorData.name.join('. ') : errorData.name}`;
        } else {
          // Try to extract error from any field
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError.join('. ');
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }
      
      setError(errorMessage);
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="store-management">
        <div className="access-denied">
          <h2>{t('store_management.access_denied.title') || 'Access Denied'}</h2>
          <p>{t('store_management.access_denied.message') || 'You don\'t have permission to manage store information. Only managers and administrators can access this page.'}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="store-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="store-management">
      <div className="store-header">
        <h1>{t('store_management.title') || 'Store Management'}</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="store-content">
        <div className="store-info">
          <h3>{t('store_management.store_information') || 'Store Information'}</h3>
          <p>{t('store_management.description') || 'Manage your store information including name, owner, and address. This information is used throughout the system for receipts and reports.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="store-form">
          <div className="form-group">
            <label htmlFor="name">{t('store_management.form.name') || 'Store Name'} *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder={t('store_management.form.name_placeholder') || 'e.g., ANTATSIMO'}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="owner">{t('store_management.form.owner') || 'Store Owner'}</label>
            <input
              type="text"
              id="owner"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              placeholder={t('store_management.form.owner_placeholder') || 'Owner name'}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">{t('store_management.form.address') || 'Address'}</label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('store_management.form.address_placeholder') || 'Store address'}
              rows="3"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">{t('store_management.form.phone') || 'Phone'}</label>
            <input
              type="text"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('store_management.form.phone_placeholder') || 'Phone number'}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('store_management.form.email') || 'Email'}</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('store_management.form.email_placeholder') || 'email@example.com'}
              disabled={saving}
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                disabled={saving}
              />
              <span className="checkmark"></span>
              {t('common.active') || 'Active'}
            </label>
          </div>

          <div className="form-actions">
            <Button type="submit" disabled={saving}>
              {saving ? (t('common.saving') || 'Saving...') : (store ? (t('store_management.update') || 'Update') : (t('store_management.create') || 'Create'))} {t('store_management.store') || 'Store'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreManagement;
