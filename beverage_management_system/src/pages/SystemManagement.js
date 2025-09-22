import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import Table from '../components/Table';
import './SystemManagement.css';

const SystemManagement = () => {
  const { user } = useAuth();
  const api = useApi();
  
  // State for different management sections
  const [activeTab, setActiveTab] = useState('taxes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tax Classes State
  const [taxClasses, setTaxClasses] = useState([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTaxClass, setEditingTaxClass] = useState(null);
  const [taxFormData, setTaxFormData] = useState({
    name: '',
    description: '',
    tax_rate: '',
    is_active: true
  });
  
  // Categories State
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  
  // Units State
  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitFormData, setUnitFormData] = useState({
    name: '',
    symbol: '',
    is_base_unit: false,
    is_active: true
  });
  
  // Unit Conversions State
  const [unitConversions, setUnitConversions] = useState([]);
  const [filteredConversions, setFilteredConversions] = useState([]);
  const [conversionSearchTerm, setConversionSearchTerm] = useState('');
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [editingConversion, setEditingConversion] = useState(null);
  const [conversionFormData, setConversionFormData] = useState({
    from_unit: '',
    to_unit: '',
    conversion_factor: '',
    is_active: true
  });

  // Check if user has permission to manage
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (canManage) {
      fetchAllData();
    }
  }, [canManage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter conversions based on search term
  useEffect(() => {
    if (!conversionSearchTerm.trim()) {
      setFilteredConversions(unitConversions);
    } else {
      const filtered = unitConversions.filter(conversion => {
        const searchLower = conversionSearchTerm.toLowerCase();
        return (
          (conversion.from_unit_name && conversion.from_unit_name.toLowerCase().includes(searchLower)) ||
          (conversion.from_unit_symbol && conversion.from_unit_symbol.toLowerCase().includes(searchLower)) ||
          (conversion.to_unit_name && conversion.to_unit_name.toLowerCase().includes(searchLower)) ||
          (conversion.to_unit_symbol && conversion.to_unit_symbol.toLowerCase().includes(searchLower)) ||
          conversion.conversion_factor.toString().includes(searchLower)
        );
      });
      setFilteredConversions(filtered);
    }
  }, [unitConversions, conversionSearchTerm]);

  // Filter units based on search term
  useEffect(() => {
    if (!unitSearchTerm.trim()) {
      setFilteredUnits(units);
    } else {
      const filtered = units.filter(unit => {
        const searchLower = unitSearchTerm.toLowerCase();
        return (
          (unit.name && unit.name.toLowerCase().includes(searchLower)) ||
          (unit.symbol && unit.symbol.toLowerCase().includes(searchLower)) ||
          (unit.is_base_unit && 'base unit'.includes(searchLower)) ||
          (unit.is_active && 'active'.includes(searchLower)) ||
          (!unit.is_active && 'inactive'.includes(searchLower))
        );
      });
      setFilteredUnits(filtered);
    }
  }, [units, unitSearchTerm]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTaxClasses(),
        fetchCategories(),
        fetchUnits(),
        fetchUnitConversions()
      ]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Tax Classes Functions
  const fetchTaxClasses = async () => {
    try {
      const response = await api.get('/products/tax-classes/');
      setTaxClasses(response.data.results || response.data);
    } catch (err) {
      console.error('Tax classes error:', err);
    }
  };

  const validateTaxClass = (data) => {
    const errors = [];

    // Check if name is provided
    if (!data.name || data.name.trim() === '') {
      errors.push('Tax class name is required');
    }

    // Check if tax rate is provided and valid
    if (!data.tax_rate || data.tax_rate === '') {
      errors.push('Tax rate is required');
    } else {
      const rate = parseFloat(data.tax_rate);
      if (isNaN(rate)) {
        errors.push('Tax rate must be a valid number');
      } else if (rate < 0) {
        errors.push('Tax rate cannot be negative');
      } else if (rate > 100) {
        errors.push('Tax rate cannot exceed 100%');
      }
    }

    // Check for duplicate name (only for new tax classes)
    if (!editingTaxClass) {
      const existingTaxClass = taxClasses.find(taxClass => 
        taxClass.name.toLowerCase() === data.name.toLowerCase()
      );
      if (existingTaxClass) {
        errors.push('A tax class with this name already exists');
      }
    }

    return errors;
  };

  const handleTaxSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate the tax class data
      const validationErrors = validateTaxClass(taxFormData);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      if (editingTaxClass) {
        await api.put(`/products/tax-classes/${editingTaxClass.id}/`, taxFormData);
      } else {
        await api.post('/products/tax-classes/', taxFormData);
      }
      
      setShowTaxModal(false);
      setEditingTaxClass(null);
      setTaxFormData({ name: '', description: '', tax_rate: '', is_active: true });
      fetchTaxClasses();
    } catch (err) {
      // Handle specific backend errors
      const errorData = err.response?.data;
      let errorMessage = 'Failed to save tax class';
      
      if (errorData) {
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join('. ');
        } else if (errorData.name) {
          errorMessage = `Name: ${errorData.name.join('. ')}`;
        } else if (errorData.tax_rate) {
          errorMessage = `Tax rate: ${errorData.tax_rate.join('. ')}`;
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
    }
  };

  // Categories Functions
  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories/');
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error('Categories error:', err);
    }
  };

  const validateCategory = (data) => {
    const errors = [];

    // Check if name is provided
    if (!data.name || data.name.trim() === '') {
      errors.push('Category name is required');
    }

    // Check for duplicate name (only for new categories)
    if (!editingCategory) {
      const existingCategory = categories.find(category => 
        category.name.toLowerCase() === data.name.toLowerCase()
      );
      if (existingCategory) {
        errors.push('A category with this name already exists');
      }
    }

    return errors;
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate the category data
      const validationErrors = validateCategory(categoryFormData);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      if (editingCategory) {
        await api.put(`/products/categories/${editingCategory.id}/`, categoryFormData);
      } else {
        await api.post('/products/categories/', categoryFormData);
      }
      
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '', is_active: true });
      fetchCategories();
    } catch (err) {
      // Handle specific backend errors
      const errorData = err.response?.data;
      let errorMessage = 'Failed to save category';
      
      if (errorData) {
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join('. ');
        } else if (errorData.name) {
          errorMessage = `Name: ${errorData.name.join('. ')}`;
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
    }
  };

  // Units Functions
  const fetchUnits = async () => {
    try {
      let allUnits = [];
      let nextUrl = '/products/units/';
      
      // Fetch all pages of units to ensure we get all base units (including inactive ones)
      while (nextUrl) {
        const response = await api.get(nextUrl);
        const data = response.data;
        
        if (data.results) {
          // Paginated response
          allUnits = [...allUnits, ...data.results];
          nextUrl = data.next;
        } else {
          // Non-paginated response
          allUnits = data;
          nextUrl = null;
        }
      }
      
      setUnits(allUnits);
    } catch (err) {
      console.error('Units error:', err);
    }
  };

  const validateUnit = (data) => {
    const errors = [];

    // Check if name is provided
    if (!data.name || data.name.trim() === '') {
      errors.push('Unit name is required');
    }

    // Check if symbol is provided
    if (!data.symbol || data.symbol.trim() === '') {
      errors.push('Unit symbol is required');
    }

    // Check for duplicate name (only for new units)
    if (!editingUnit) {
      const existingUnit = units.find(unit => 
        unit.name.toLowerCase() === data.name.toLowerCase()
      );
      if (existingUnit) {
        errors.push('A unit with this name already exists');
      }
    }

    // Check for duplicate symbol (only for new units)
    if (!editingUnit) {
      const existingSymbol = units.find(unit => 
        unit.symbol.toLowerCase() === data.symbol.toLowerCase()
      );
      if (existingSymbol) {
        errors.push('A unit with this symbol already exists');
      }
    }

    // Check if trying to set multiple base units
    if (data.is_base_unit && !editingUnit) {
      const existingBaseUnit = units.find(unit => unit.is_base_unit);
      if (existingBaseUnit) {
        errors.push('Only one base unit is allowed. Please uncheck the existing base unit first.');
      }
    }

    return errors;
  };

  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate the unit data
      const validationErrors = validateUnit(unitFormData);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      if (editingUnit) {
        await api.put(`/products/units/${editingUnit.id}/`, unitFormData);
      } else {
        await api.post('/products/units/', unitFormData);
      }
      
      setShowUnitModal(false);
      setEditingUnit(null);
      setUnitFormData({ name: '', symbol: '', is_base_unit: false, is_active: true });
      fetchUnits();
    } catch (err) {
      // Handle specific backend errors
      const errorData = err.response?.data;
      let errorMessage = 'Failed to save unit';
      
      if (errorData) {
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join('. ');
        } else if (errorData.name) {
          errorMessage = `Name: ${errorData.name.join('. ')}`;
        } else if (errorData.symbol) {
          errorMessage = `Symbol: ${errorData.symbol.join('. ')}`;
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
    }
  };

  // Unit Conversions Functions
  const fetchUnitConversions = async () => {
    try {
      let allConversions = [];
      let nextUrl = '/products/unit-conversions/';
      
      // Fetch all pages of unit conversions
      while (nextUrl) {
        const response = await api.get(nextUrl);
        const data = response.data;
        
        if (data.results) {
          // Paginated response
          allConversions = [...allConversions, ...data.results];
          nextUrl = data.next;
        } else {
          // Non-paginated response
          allConversions = data;
          nextUrl = null;
        }
      }
      
      setUnitConversions(allConversions);
    } catch (err) {
      console.error('Unit conversions error:', err);
    }
  };

  const validateConversion = (data) => {
    const errors = [];

    // Check if from_unit and to_unit are the same
    if (data.from_unit === data.to_unit) {
      errors.push('From unit and To unit cannot be the same');
    }

    // Check if conversion factor is valid
    if (data.conversion_factor <= 0) {
      errors.push('Conversion factor must be greater than 0');
    }

    // Check if conversion factor is reasonable (not too large or too small)
    if (data.conversion_factor > 10000) {
      errors.push('Conversion factor is too large (max: 10,000)');
    }

    if (data.conversion_factor < 0.0001) {
      errors.push('Conversion factor is too small (min: 0.0001)');
    }

    // Find the selected units
    const fromUnit = units.find(unit => unit.id === parseInt(data.from_unit));
    const toUnit = units.find(unit => unit.id === parseInt(data.to_unit));

    // Check that at least one unit is a base unit
    if (fromUnit && toUnit && !fromUnit.is_base_unit && !toUnit.is_base_unit) {
      errors.push('At least one of the units must be a base unit');
    }

    // Check for existing conversion (only for new conversions)
    if (!editingConversion) {
      const existingConversion = unitConversions.find(conv => 
        (conv.from_unit === data.from_unit && conv.to_unit === data.to_unit) ||
        (conv.from_unit === data.to_unit && conv.to_unit === data.from_unit)
      );
      
      if (existingConversion) {
        errors.push('A conversion between these units already exists');
      }
    }

    // Check for circular conversions
    const hasCircularConversion = unitConversions.some(conv => {
      if (editingConversion && conv.id === editingConversion.id) return false;
      
      // Check if this would create a circular conversion
      return (conv.from_unit === data.to_unit && conv.to_unit === data.from_unit);
    });

    if (hasCircularConversion) {
      errors.push('This would create a circular conversion (reverse conversion already exists)');
    }

    // Check that non-base units have only one conversion from base unit
    if (fromUnit && toUnit) {
      // If from_unit is not a base unit, check if it already has a conversion from a base unit
      if (!fromUnit.is_base_unit) {
        const existingBaseConversion = unitConversions.find(conv => {
          if (editingConversion && conv.id === editingConversion.id) return false;
          const convFromUnit = units.find(unit => unit.id === conv.from_unit);
          return convFromUnit && convFromUnit.is_base_unit && conv.to_unit === fromUnit.id;
        });
        
        if (existingBaseConversion) {
          errors.push(`${fromUnit.name} already has a conversion from a base unit`);
        }
      }

      // If to_unit is not a base unit, check if it already has a conversion from a base unit
      if (!toUnit.is_base_unit) {
        const existingBaseConversion = unitConversions.find(conv => {
          if (editingConversion && conv.id === editingConversion.id) return false;
          const convFromUnit = units.find(unit => unit.id === conv.from_unit);
          return convFromUnit && convFromUnit.is_base_unit && conv.to_unit === toUnit.id;
        });
        
        if (existingBaseConversion) {
          errors.push(`${toUnit.name} already has a conversion from a base unit`);
        }
      }
    }

    return errors;
  };

  const handleConversionSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = {
        ...conversionFormData,
        from_unit: parseInt(conversionFormData.from_unit),
        to_unit: parseInt(conversionFormData.to_unit),
        conversion_factor: parseFloat(conversionFormData.conversion_factor)
      };

      // Validate the conversion data
      const validationErrors = validateConversion(data);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      if (editingConversion) {
        await api.put(`/products/unit-conversions/${editingConversion.id}/`, data);
      } else {
        await api.post('/products/unit-conversions/', data);
      }
      
      setShowConversionModal(false);
      setEditingConversion(null);
      setConversionFormData({ from_unit: '', to_unit: '', conversion_factor: '', is_active: true });
      fetchUnitConversions();
    } catch (err) {
      // Handle specific backend errors
      const errorData = err.response?.data;
      let errorMessage = 'Failed to save unit conversion';
      
      if (errorData) {
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join('. ');
        } else if (errorData.from_unit) {
          errorMessage = `From unit: ${errorData.from_unit.join('. ')}`;
        } else if (errorData.to_unit) {
          errorMessage = `To unit: ${errorData.to_unit.join('. ')}`;
        } else if (errorData.conversion_factor) {
          errorMessage = `Conversion factor: ${errorData.conversion_factor.join('. ')}`;
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
    }
  };

  // Delete Functions
  const handleDelete = async (type, item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const endpoints = {
        tax: `/products/tax-classes/${item.id}/`,
        category: `/products/categories/${item.id}/`,
        unit: `/products/units/${item.id}/`,
        conversion: `/products/unit-conversions/${item.id}/`
      };
      
      await api.delete(endpoints[type]);
      
      switch (type) {
        case 'tax':
          fetchTaxClasses();
          break;
        case 'category':
          fetchCategories();
          break;
        case 'unit':
          fetchUnits();
          break;
        case 'conversion':
          fetchUnitConversions();
          break;
        default:
          console.warn('Unknown delete type:', type);
          break;
      }
    } catch (err) {
      setError(`Failed to delete ${type}`);
    }
  };

  // Table Columns
  const taxColumns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'tax_rate', label: 'Tax Rate (%)', render: (value) => `${value}%` },
    { key: 'products_count', label: 'Products' },
    { key: 'is_active', label: 'Status', render: (value) => value ? 'Active' : 'Inactive' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, item) => (
        <div className="action-buttons">
          <Button size="small" variant="outline" onClick={() => {
            setEditingTaxClass(item);
            setTaxFormData({
              name: item.name,
              description: item.description,
              tax_rate: item.tax_rate.toString(),
              is_active: item.is_active
            });
            setShowTaxModal(true);
          }}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => handleDelete('tax', item)}>
            Delete
          </Button>
        </div>
      )
    }
  ];

  const categoryColumns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'products_count', label: 'Products' },
    { key: 'is_active', label: 'Status', render: (value) => value ? 'Active' : 'Inactive' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, item) => (
        <div className="action-buttons">
          <Button size="small" variant="outline" onClick={() => {
            setEditingCategory(item);
            setCategoryFormData({
              name: item.name,
              description: item.description,
              is_active: item.is_active
            });
            setShowCategoryModal(true);
          }}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => handleDelete('category', item)}>
            Delete
          </Button>
        </div>
      )
    }
  ];

  const unitColumns = [
    { key: 'name', label: 'Name' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'is_base_unit', label: 'Base Unit', render: (value) => value ? 'Yes' : 'No' },
    { key: 'products_count', label: 'Products' },
    { key: 'is_active', label: 'Status', render: (value) => value ? 'Active' : 'Inactive' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, item) => (
        <div className="action-buttons">
          <Button size="small" variant="outline" onClick={() => {
            setEditingUnit(item);
            setUnitFormData({
              name: item.name,
              symbol: item.symbol,
              is_base_unit: item.is_base_unit,
              is_active: item.is_active
            });
            setShowUnitModal(true);
          }}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => handleDelete('unit', item)}>
            Delete
          </Button>
        </div>
      )
    }
  ];

  const conversionColumns = [
    { 
      key: 'from_unit_name', 
      label: 'From Unit', 
      render: (value, item) => item.from_unit_name ? `${item.from_unit_name} (${item.from_unit_symbol})` : 'N/A' 
    },
    { 
      key: 'to_unit_name', 
      label: 'To Unit', 
      render: (value, item) => item.to_unit_name ? `${item.to_unit_name} (${item.to_unit_symbol})` : 'N/A' 
    },
    { key: 'conversion_factor', label: 'Conversion Factor' },
    { key: 'is_active', label: 'Status', render: (value) => value ? 'Active' : 'Inactive' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, item) => (
        <div className="action-buttons">
          <Button size="small" variant="outline" onClick={() => {
            setEditingConversion(item);
            setConversionFormData({
              from_unit: item.from_unit || '',
              to_unit: item.to_unit || '',
              conversion_factor: item.conversion_factor.toString(),
              is_active: item.is_active
            });
            setShowConversionModal(true);
          }}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => handleDelete('conversion', item)}>
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (!canManage) {
    return (
      <div className="system-management">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to manage system settings. Only managers and administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="system-management">
      <div className="system-header">
        <h1>System Management</h1>
        <p>Manage taxes, categories, units, and unit conversions</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="system-tabs">
        <button 
          className={`tab-button ${activeTab === 'taxes' ? 'active' : ''}`}
          onClick={() => setActiveTab('taxes')}
        >
          Tax Classes
        </button>
        <button 
          className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button 
          className={`tab-button ${activeTab === 'units' ? 'active' : ''}`}
          onClick={() => setActiveTab('units')}
        >
          Units
        </button>
        <button 
          className={`tab-button ${activeTab === 'conversions' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversions')}
        >
          Unit Conversions
        </button>
      </div>

      <div className="system-content">
        {activeTab === 'taxes' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Tax Classes</h2>
              <Button onClick={() => {
                setEditingTaxClass(null);
                setTaxFormData({ name: '', description: '', tax_rate: '', is_active: true });
                setShowTaxModal(true);
              }}>
                Add New Tax Class
              </Button>
            </div>
            <Table
              data={taxClasses}
              columns={taxColumns}
              loading={loading}
              emptyMessage="No tax classes found"
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Product Categories</h2>
              <Button onClick={() => {
                setEditingCategory(null);
                setCategoryFormData({ name: '', description: '', is_active: true });
                setShowCategoryModal(true);
              }}>
                Add New Category
              </Button>
            </div>
            <Table
              data={categories}
              columns={categoryColumns}
              loading={loading}
              emptyMessage="No categories found"
            />
          </div>
        )}

        {activeTab === 'units' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Units</h2>
              <div className="header-actions">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search units..."
                    value={unitSearchTerm}
                    onChange={(e) => setUnitSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <span className="search-icon">🔍</span>
                </div>
                <Button onClick={() => {
                  setEditingUnit(null);
                  setUnitFormData({ name: '', symbol: '', is_base_unit: false, is_active: true });
                  setShowUnitModal(true);
                }}>
                  Add New Unit
                </Button>
              </div>
            </div>
            <Table
              data={filteredUnits}
              columns={unitColumns}
              loading={loading}
              emptyMessage={unitSearchTerm ? "No units found matching your search" : "No units found"}
            />
          </div>
        )}

        {activeTab === 'conversions' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Unit Conversions</h2>
              <div className="header-actions">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search conversions..."
                    value={conversionSearchTerm}
                    onChange={(e) => setConversionSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <span className="search-icon">🔍</span>
                </div>
                <Button onClick={() => {
                  setEditingConversion(null);
                  setConversionFormData({ from_unit: '', to_unit: '', conversion_factor: '', is_active: true });
                  setShowConversionModal(true);
                }}>
                  Add New Conversion
                </Button>
              </div>
            </div>
            <Table
              data={filteredConversions}
              columns={conversionColumns}
              loading={loading}
              emptyMessage={conversionSearchTerm ? "No conversions found matching your search" : "No unit conversions found"}
            />
          </div>
        )}
      </div>

      {/* Tax Class Modal */}
      {showTaxModal && (
        <div className="modal-overlay" onClick={() => setShowTaxModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTaxClass ? 'Edit Tax Class' : 'Add New Tax Class'}</h2>
              <button className="modal-close" onClick={() => setShowTaxModal(false)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleTaxSubmit} className="system-form">
              <div className="form-group">
                <label htmlFor="tax_name">Name *</label>
                <input
                  type="text"
                  id="tax_name"
                  value={taxFormData.name}
                  onChange={(e) => setTaxFormData({ ...taxFormData, name: e.target.value })}
                  required
                  placeholder="e.g., Standard Rate"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tax_description">Description</label>
                <textarea
                  id="tax_description"
                  value={taxFormData.description}
                  onChange={(e) => setTaxFormData({ ...taxFormData, description: e.target.value })}
                  placeholder="Brief description of this tax class"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tax_rate">Tax Rate (%) *</label>
                <input
                  type="number"
                  id="tax_rate"
                  value={taxFormData.tax_rate}
                  onChange={(e) => setTaxFormData({ ...taxFormData, tax_rate: e.target.value })}
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
                    checked={taxFormData.is_active}
                    onChange={(e) => setTaxFormData({ ...taxFormData, is_active: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Active
                </label>
              </div>

              <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => setShowTaxModal(false)}>
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="system-form">
              <div className="form-group">
                <label htmlFor="category_name">Name *</label>
                <input
                  type="text"
                  id="category_name"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                  placeholder="e.g., Beverages"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category_description">Description</label>
                <textarea
                  id="category_description"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Brief description of this category"
                  rows="3"
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={categoryFormData.is_active}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Active
                </label>
              </div>

              <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="modal-overlay" onClick={() => setShowUnitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</h2>
              <button className="modal-close" onClick={() => setShowUnitModal(false)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleUnitSubmit} className="system-form">
              <div className="form-group">
                <label htmlFor="unit_name">Name *</label>
                <input
                  type="text"
                  id="unit_name"
                  value={unitFormData.name}
                  onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                  required
                  placeholder="e.g., Kilogram"
                />
              </div>

              <div className="form-group">
                <label htmlFor="unit_symbol">Symbol *</label>
                <input
                  type="text"
                  id="unit_symbol"
                  value={unitFormData.symbol}
                  onChange={(e) => setUnitFormData({ ...unitFormData, symbol: e.target.value })}
                  required
                  placeholder="e.g., kg"
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={unitFormData.is_base_unit}
                    onChange={(e) => setUnitFormData({ ...unitFormData, is_base_unit: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Base Unit
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={unitFormData.is_active}
                    onChange={(e) => setUnitFormData({ ...unitFormData, is_active: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Active
                </label>
              </div>

              <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => setShowUnitModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUnit ? 'Update' : 'Create'} Unit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Conversion Modal */}
      {showConversionModal && (
        <div className="modal-overlay" onClick={() => setShowConversionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingConversion ? 'Edit Unit Conversion' : 'Add New Unit Conversion'}</h2>
              <button className="modal-close" onClick={() => setShowConversionModal(false)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleConversionSubmit} className="system-form">
              <div className="form-group">
                <label htmlFor="from_unit">From Unit *</label>
                <select
                  id="from_unit"
                  value={conversionFormData.from_unit}
                  onChange={(e) => setConversionFormData({ ...conversionFormData, from_unit: e.target.value })}
                  required
                >
                  <option value="">Select From Unit</option>
                  {units
                    .sort((a, b) => {
                      // Sort base units first, then by name
                      if (a.is_base_unit && !b.is_base_unit) return -1;
                      if (!a.is_base_unit && b.is_base_unit) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(unit => (
                      <option key={unit.id} value={unit.id} disabled={!unit.is_active}>
                        {unit.name} ({unit.symbol}){unit.is_base_unit ? ' - BASE UNIT' : ''}{!unit.is_active ? ' - INACTIVE' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="to_unit">To Unit *</label>
                <select
                  id="to_unit"
                  value={conversionFormData.to_unit}
                  onChange={(e) => setConversionFormData({ ...conversionFormData, to_unit: e.target.value })}
                  required
                >
                  <option value="">Select To Unit</option>
                  {units
                    .sort((a, b) => {
                      // Sort base units first, then by name
                      if (a.is_base_unit && !b.is_base_unit) return -1;
                      if (!a.is_base_unit && b.is_base_unit) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(unit => (
                      <option key={unit.id} value={unit.id} disabled={!unit.is_active}>
                        {unit.name} ({unit.symbol}){unit.is_base_unit ? ' - BASE UNIT' : ''}{!unit.is_active ? ' - INACTIVE' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="conversion_factor">Conversion Factor *</label>
                <input
                  type="number"
                  id="conversion_factor"
                  value={conversionFormData.conversion_factor}
                  onChange={(e) => setConversionFormData({ ...conversionFormData, conversion_factor: e.target.value })}
                  required
                  min="0.001"
                  step="0.001"
                  placeholder="e.g., 20 (for 1 carton = 20 pieces)"
                />
                <small>How many "to units" equal 1 "from unit"</small>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={conversionFormData.is_active}
                    onChange={(e) => setConversionFormData({ ...conversionFormData, is_active: e.target.checked })}
                  />
                  <span className="checkmark"></span>
                  Active
                </label>
              </div>

              <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => setShowConversionModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingConversion ? 'Update' : 'Create'} Conversion
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemManagement;
