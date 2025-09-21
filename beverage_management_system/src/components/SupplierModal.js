import React, { useState, useEffect } from 'react';
import Button from './Button';
import './SupplierModal.css';

const SupplierModal = ({ supplier, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    payment_terms: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        tax_number: supplier.tax_number || '',
        payment_terms: supplier.payment_terms || '',
        is_active: supplier.is_active !== undefined ? supplier.is_active : true
      });
    }
  }, [supplier]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a supplier name');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content supplier-modal">
        <div className="modal-header">
          <h2>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Supplier Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter supplier name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact_person">Contact Person</label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  placeholder="Enter contact person name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tax_number">Tax Number</label>
                <input
                  type="text"
                  id="tax_number"
                  name="tax_number"
                  value={formData.tax_number}
                  onChange={handleInputChange}
                  placeholder="Enter tax identification number"
                />
              </div>
              <div className="form-group">
                <label htmlFor="payment_terms">Payment Terms</label>
                <input
                  type="text"
                  id="payment_terms"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange}
                  placeholder="e.g., Net 30, COD"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                placeholder="Enter supplier address"
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">Active Supplier</span>
              </label>
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? (supplier ? 'Updating...' : 'Creating...') : (supplier ? 'Update Supplier' : 'Create Supplier')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;
