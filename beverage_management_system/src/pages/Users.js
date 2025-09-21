import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Table from '../components/Table';
import Button from '../components/Button';
import './Users.css';

const Users = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/core/users/');
      setUsers(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load users');
      console.error('Users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setShowAddModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowAddModal(true);
  };

  const handleDeleteUser = async (userToDelete) => {
    if (window.confirm(`Are you sure you want to delete ${userToDelete.username}?`)) {
      try {
        await api.delete(`/core/users/${userToDelete.id}/`);
        fetchUsers();
      } catch (err) {
        setError('Failed to delete user');
        console.error('Delete error:', err);
      }
    }
  };

  const columns = [
    {
      key: 'username',
      header: 'Username',
      render: (value, row) => (
        <div>
          <div className="user-name">{value}</div>
          <div className="user-email">{row.email}</div>
        </div>
      )
    },
    {
      key: 'first_name',
      header: 'Full Name',
      render: (value, row) => `${row.first_name} ${row.last_name}`.trim() || 'N/A'
    },
    {
      key: 'role',
      header: 'Role',
      render: (value) => (
        <span className={`role-badge role-${value}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'phone_number',
      header: 'Phone',
      render: (value) => value || 'N/A'
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (value) => (
        <span className={`status-badge ${value ? 'active' : 'inactive'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <Button
            size="small"
            variant="outline"
            onClick={() => handleEditUser(row)}
          >
            Edit
          </Button>
          {row.id !== user?.id && (
            <Button
              size="small"
              variant="danger"
              onClick={() => handleDeleteUser(row)}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  if (!isAdmin) {
    return (
      <div className="users">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users">
      <div className="users-header">
        <h1>User Management</h1>
        <Button onClick={handleAddUser}>
          Add User
        </Button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="users-filters">
        <div className="filter-group">
          <label>Role:</label>
          <select>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="sales">Sales</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <Table
        data={users}
        columns={columns}
        loading={loading}
        emptyMessage="No users found"
      />

      {showAddModal && (
        <UserModal
          user={editingUser}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

const UserModal = ({ user, onClose, onSave }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    role: user?.role || 'sales',
    phone_number: user?.phone_number || '',
    is_active: user?.is_active ?? true,
    password: '',
    password_confirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'showPasswordFields') {
      // Clear password fields when checkbox is unchecked
      setShowPasswordFields(checked);
      if (!checked) {
        setFormData({
          ...formData,
          password: '',
          password_confirm: ''
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');


    // Client-side validation for password fields
    if (showPasswordFields && formData.password && formData.password_confirm) {
      if (formData.password !== formData.password_confirm) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }
    }

    try {
      if (user) {
        // For editing existing users, only include password fields if they're filled
        const updateData = { ...formData };
        
        // Only include password fields if the checkbox is checked and both fields are filled
        if (!showPasswordFields || !updateData.password || !updateData.password_confirm) {
          // Remove password fields if checkbox not checked or either field is empty
          delete updateData.password;
          delete updateData.password_confirm;
        }
        
        await api.put(`/core/users/${user.id}/`, updateData);
      } else {
        // For new users, we'll need to create them via the registration endpoint
        // or create a separate endpoint for admin user creation
        const userData = {
          ...formData,
          password: formData.password || 'password123', // Default password if not provided
          password_confirm: formData.password_confirm || 'password123'
        };
        await api.post('/core/register/', userData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to save user');
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{user ? 'Edit User' : 'Add User'}</h2>
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
              <label>Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="sales">Sales</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </div>
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

          {/* Password fields for admin users */}
          {currentUser?.role === 'admin' && (
            <>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="showPasswordFields"
                    checked={showPasswordFields}
                    onChange={handleChange}
                  />
                  {user ? 'Change Password' : 'Set Password'}
                </label>
              </div>

              {showPasswordFields && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={showPasswordFields && formData.password.length > 0}
                        minLength="8"
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm Password *</label>
                      <input
                        type="password"
                        name="password_confirm"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        required={showPasswordFields && formData.password_confirm.length > 0}
                        minLength="8"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {!user && !showPasswordFields && (
            <div className="form-group">
              <p className="password-note">
                <strong>Note:</strong> New users will be created with the default password: <code>password123</code>
              </p>
            </div>
          )}

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {user ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Users;
