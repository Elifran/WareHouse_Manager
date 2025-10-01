import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import './SupplierModal.css';

const SupplierModal = ({ supplier, onClose, onSubmit }) => {
  const { t } = useTranslation();
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
      alert(t('modals.please_enter_supplier_name'));
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
          <h2>{supplier ? t('modals.edit_supplier') : t('modals.add_new_supplier')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">{t('modals.supplier_name')} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder={t('modals.enter_supplier_name')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact_person">{t('modals.contact_person')}</label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  placeholder={t('modals.enter_contact_person_name')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">{t('common.email')}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('modals.enter_email_address')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">{t('common.phone')}</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={t('modals.enter_phone_number')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tax_number">{t('modals.tax_number')}</label>
                <input
                  type="text"
                  id="tax_number"
                  name="tax_number"
                  value={formData.tax_number}
                  onChange={handleInputChange}
                  placeholder={t('modals.enter_tax_number')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="payment_terms">{t('modals.payment_terms')}</label>
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
              <label htmlFor="address">{t('modals.address')}</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                placeholder={t('modals.enter_supplier_address')}
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
                <span className="checkbox-text">{t('modals.active_supplier')}</span>
              </label>
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('modals.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? (supplier ? t('modals.updating') : t('modals.creating')) : (supplier ? t('modals.update_supplier') : t('modals.create_supplier'))}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;
