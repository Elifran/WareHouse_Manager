import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import Table from '../components/Table';
import SupplierModal from '../components/SupplierModal';
import './Suppliers.css';

const Suppliers = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const api = useApi();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/purchases/suppliers/');
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (supplierData) => {
    try {
      await api.post('/api/purchases/suppliers/', supplierData);
      fetchSuppliers();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating supplier:', error);
    }
  };

  const handleUpdateSupplier = async (supplierData) => {
    try {
      await api.put(`/api/purchases/suppliers/${editingSupplier.id}/`, supplierData);
      fetchSuppliers();
      setEditingSupplier(null);
    } catch (error) {
      console.error('Error updating supplier:', error);
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.delete(`/api/purchases/suppliers/${supplierId}/`);
        fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  const supplierColumns = [
    {
      key: 'name',
      label: 'Supplier Name',
      render: (value, row) => (
        <div>
          <div className="supplier-name">{value}</div>
          {row.contact_person && (
            <div className="contact-person">{row.contact_person}</div>
          )}
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => value || '-'
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) => value || '-'
    },
    {
      key: 'payment_terms',
      label: 'Payment Terms',
      render: (value) => value || '-'
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <span className={`status-badge ${value ? 'status-active' : 'status-inactive'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <Button
            size="small"
            variant="secondary"
            onClick={() => setEditingSupplier(row)}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="danger"
            onClick={() => handleDeleteSupplier(row.id)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <span>Loading suppliers...</span>
      </div>
    );
  }

  return (
    <div className="suppliers">
      <div className="page-header">
        <h1>{t('titles.suppliers_management')}</h1>
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            Add New Supplier
          </Button>
        </div>
      </div>

      <div className="content-section">
        <Table
          data={suppliers}
          columns={supplierColumns}
          emptyMessage="No suppliers found"
        />
      </div>

      {showCreateModal && (
        <SupplierModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSupplier}
        />
      )}

      {editingSupplier && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSubmit={handleUpdateSupplier}
        />
      )}
    </div>
  );
};

export default Suppliers;
