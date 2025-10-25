import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import Button from './Button';
import PrintButton from './PrintButton';
import './PurchaseOrderModal.css';

const PurchaseOrderModal = ({ suppliers, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_delivery_date: getTodayDate(),
    notes: '',
    items: []
  });
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [taxClasses, setTaxClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    fetchProductsAndTaxes();
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter products based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const fetchProductsAndTaxes = async () => {
    try {
      let allProducts = [];
      let nextUrl = '/api/products/';
      
      // Fetch all products by paginating through all pages
      while (nextUrl) {
        const productsResponse = await api.get(nextUrl);
        const data = productsResponse.data;
        const pageProducts = data.results || data;
        
        // If it's the first page and there's no pagination (no results property), break
        if (!data.results && allProducts.length > 0) {
          break;
        }
        
        allProducts = [...allProducts, ...pageProducts];
        
        // Check if there's a next page
        nextUrl = data.next;
        
        // If the API doesn't use standard pagination, break
        if (!data.next && !data.results) {
          break;
        }
      }
      
      // Fetch tax classes
      const taxResponse = await api.get('/api/products/tax-classes/');
      
      // Fetch unit costs for each product
      const productsWithUnitCosts = await Promise.all(
        allProducts.map(async (product) => {
          try {
            const unitCostsResponse = await api.get(`/api/products/${product.id}/unit-costs/`);
            return {
              ...product,
              unit_costs: unitCostsResponse.data.unit_costs || []
            };
          } catch (error) {
            console.error(`Error fetching unit costs for product ${product.id}:`, error);
            return {
              ...product,
              unit_costs: []
            };
          }
        })
      );
      
      setProducts(productsWithUnitCosts);
      setFilteredProducts(productsWithUnitCosts);
      
      const taxData = taxResponse.data;
      setTaxClasses(taxData.results || taxData);
    } catch (error) {
      console.error('Error fetching products and tax classes:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: '',
        quantity_ordered: 1,
        unit_id: '',
        unit_cost: 0,
        tax_class_id: '',
        notes: ''
      }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // When product is selected, set default unit and unit cost
          if (field === 'product_id' && value) {
            const selectedProduct = products.find(p => p.id === parseInt(value));
            if (selectedProduct?.compatible_units?.length > 0) {
              // Find the default unit (is_default: true) or fallback to base unit
              let defaultUnit = selectedProduct.compatible_units.find(u => u.is_default);
              if (!defaultUnit) {
                defaultUnit = selectedProduct.compatible_units.find(u => u.unit?.is_base_unit || u.unit_is_base);
              }
              if (!defaultUnit) {
                defaultUnit = selectedProduct.compatible_units[0];
              }
              
              if (defaultUnit) {
                // Handle both ProductUnit structure (with nested unit) and direct unit structure
                const unit = defaultUnit.unit || defaultUnit;
                const unitId = unit?.id || unit; // unit might be just an ID
                
                // For compatible_units structure, unit is just the ID number
                const actualUnitId = typeof unitId === 'number' ? unitId : (unit?.id || unitId);
                
                if (actualUnitId) {
                  updatedItem.unit_id = actualUnitId;
                  
                  // Use the unit costs from the API response
                  // The unit_costs array contains the correct cost for each unit
                  const unitCostData = selectedProduct?.unit_costs?.find(uc => uc.id === actualUnitId);
                  if (unitCostData) {
                    updatedItem.unit_cost = parseFloat(unitCostData.cost_price).toFixed(2);
                  } else {
                    // Fallback to the stored cost_price if unit_costs not available
                    updatedItem.unit_cost = parseFloat(selectedProduct?.cost_price || 0).toFixed(2);
                  }
                }
              }
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!formData.supplier_id || formData.items.length === 0) {
      alert(t('modals.please_select_supplier_add_item'));
      return;
    }

    // Validate that all items have required fields
    const invalidItems = formData.items.filter(item => 
      !item.product_id || !item.quantity_ordered || !item.unit_cost
    );
    
    if (invalidItems.length > 0) {
      alert('Please fill in all required fields for all items (product, quantity, unit cost)');
      return;
    }

    // Convert data types to ensure proper API format
    const processedData = {
      ...formData,
      supplier_id: parseInt(formData.supplier_id),
      items: formData.items.map(item => ({
        ...item,
        product_id: parseInt(item.product_id),
        quantity_ordered: parseFloat(item.quantity_ordered),
        unit_id: item.unit_id ? parseInt(item.unit_id) : null,
        unit_cost: parseFloat(item.unit_cost),
        tax_class_id: item.tax_class_id ? parseInt(item.tax_class_id) : null
      }))
    };

    setLoading(true);
    try {
      await onSubmit(processedData);
    } catch (error) {
      console.error('Error submitting purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item) => {
    const quantity = parseFloat(item.quantity_ordered) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    
    // Since unit cost is now the cost for the selected unit, just multiply by quantity
    return quantity * unitCost;
  };

  const calculateTaxAmount = (item) => {
    const lineTotal = calculateItemTotal(item);
    const taxClass = taxClasses.find(tc => tc.id === parseInt(item.tax_class_id));
    if (taxClass) {
      return lineTotal * (taxClass.tax_rate / 100);
    }
    return 0;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const taxAmount = formData.items.reduce((sum, item) => sum + calculateTaxAmount(item), 0);
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const totals = calculateTotals();

  // Mobile Item Card Component
  const MobileItemCard = ({ item, index }) => {
    const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
    
    return (
      <div className="mobile-item-card">
        <div className="mobile-item-header">
          <div className="item-product">
            <label>{t('common.name')} *</label>
            <select
              value={item.product_id}
              onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
              required
            >
              <option value="">{t('modals.select_product')}</option>
              {filteredProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="remove-button"
            onClick={() => removeItem(index)}
          >
            {t('modals.remove')}
          </button>
        </div>
        
        <div className="mobile-item-details">
          <div className="detail-row">
            <div className="field-group">
              <label>{t('common.quantity')} *</label>
              <input
                type="number"
                min="1"
                value={item.quantity_ordered}
                onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label>{t('modals.unit_cost')} *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_cost}
                onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="field-group full-width">
            <label>{t('common.unit')}</label>
            <select
              value={item.unit_id}
              onChange={(e) => {
                const unitId = e.target.value;
                handleItemChange(index, 'unit_id', unitId);
                
                // Auto-set unit cost based on selected unit's cost from API
                if (unitId) {
                  const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
                  if (selectedProduct?.unit_costs) {
                    const unitCostData = selectedProduct.unit_costs.find(uc => uc.id === parseInt(unitId));
                    if (unitCostData) {
                      handleItemChange(index, 'unit_cost', parseFloat(unitCostData.cost_price).toFixed(2));
                    }
                  }
                }
              }}
            >
              <option value="">{t('modals.select_unit')}</option>
              {(() => {
                if (!selectedProduct?.compatible_units || selectedProduct.compatible_units.length === 0) {
                  return <option value="">{t('modals.no_compatible_units')}</option>;
                }
                
                return selectedProduct.compatible_units.map(compatibleUnit => {
                  const unit = compatibleUnit.unit || compatibleUnit;
                  const unitId = unit?.id || unit;
                  const unitName = unit?.name || compatibleUnit.unit_name;
                  const unitSymbol = unit?.symbol || compatibleUnit.unit_symbol;
                  
                  const actualUnitId = typeof unitId === 'number' ? unitId : (unit?.id || unitId);
                  
                  if (!unitName || !unitSymbol) {
                    console.warn('Invalid unit data:', compatibleUnit);
                    return null;
                  }
                  
                  const unitCostData = selectedProduct?.unit_costs?.find(uc => uc.id === actualUnitId);
                  const unitCost = unitCostData ? unitCostData.cost_price : 0;
                  
                  return (
                    <option key={actualUnitId} value={actualUnitId}>
                      {unitName} ({unitSymbol}) - {parseFloat(unitCost).toFixed(2)} MGA
                    </option>
                  );
                }).filter(Boolean);
              })()}
            </select>
          </div>
          
          <div className="field-group full-width">
            <label>{t('modals.tax_class')}</label>
            <select
              value={item.tax_class_id}
              onChange={(e) => handleItemChange(index, 'tax_class_id', e.target.value)}
            >
              <option value="">{t('modals.no_tax')}</option>
              {taxClasses.map(taxClass => (
                <option key={taxClass.id} value={taxClass.id}>
                  {taxClass.name} ({taxClass.tax_rate}%)
                </option>
              ))}
            </select>
          </div>
          
          <div className="mobile-item-totals">
            <div className="total-line">
              <span>{t('modals.line_total')}:</span>
              <span>{calculateItemTotal(item).toFixed(2)} MGA</span>
            </div>
            {item.tax_class_id && (
              <div className="total-line tax-line">
                <span>{t('modals.tax_amount')}:</span>
                <span>+ {calculateTaxAmount(item).toFixed(2)} MGA</span>
              </div>
            )}
            <div className="total-line grand-total">
              <span>{t('modals.total')}:</span>
              <span>{(calculateItemTotal(item) + calculateTaxAmount(item)).toFixed(2)} MGA</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-content purchase-order-modal ${isMobile ? 'mobile-modal' : ''}`}>
        <div className="modal-header">
          <h2>{t('modals.create_purchase_order')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <h3>{t('modals.order_details')}</h3>
            <div className={`form-layout ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
              <div className="form-group">
                <label htmlFor="supplier_id">{t('modals.supplier')} *</label>
                <select
                  id="supplier_id"
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">{t('modals.select_supplier')}</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="expected_delivery_date">{t('modals.expected_delivery_date')}</label>
                <input
                  type="date"
                  id="expected_delivery_date"
                  name="expected_delivery_date"
                  value={formData.expected_delivery_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="form-group full-width">
              <label htmlFor="notes">{t('common.notes')}</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={isMobile ? 2 : 3}
                placeholder="Additional notes for this purchase order..."
              />
            </div>
          </div>

          <div className="form-section">
            {formData.items.length === 0 ? (
              <div className="empty-items">
                <p>{t('modals.no_items_added_yet')}</p>
              </div>
            ) : isMobile ? (
              // Mobile Items List
              <div className="mobile-items-list">
                {formData.items.map((item, index) => (
                  <MobileItemCard key={index} item={item} index={index} />
                ))}
              </div>
            ) : (
              // Desktop Items Table
              <div className="desktop-items-table">
                <div className="items-header">
                  <span>{t('common.name')}</span>
                  <span>{t('common.quantity')}</span>
                  <span>{t('common.unit')}</span>
                  <span>{t('modals.unit_cost')}</span>
                  <span>{t('modals.tax_class')}</span>
                  <span>{t('modals.line_total')}</span>
                  <span>{t('actions.actions')}</span>
                </div>
                {formData.items.map((item, index) => {
                  const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
                  
                  return (
                    <div key={index} className="item-row">
                      <div className="item-product">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">{t('modals.select_product')}</option>
                          {filteredProducts.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="item-quantity">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                          required
                        />
                      </div>
                      <div className="item-unit">
                        <select
                          value={item.unit_id}
                          onChange={(e) => {
                            const unitId = e.target.value;
                            handleItemChange(index, 'unit_id', unitId);
                            
                            if (unitId) {
                              const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
                              if (selectedProduct?.unit_costs) {
                                const unitCostData = selectedProduct.unit_costs.find(uc => uc.id === parseInt(unitId));
                                if (unitCostData) {
                                  handleItemChange(index, 'unit_cost', parseFloat(unitCostData.cost_price).toFixed(2));
                                }
                              }
                            }
                          }}
                        >
                          <option value="">{t('modals.select_unit')}</option>
                          {(() => {
                            if (!selectedProduct?.compatible_units || selectedProduct.compatible_units.length === 0) {
                              return <option value="">{t('modals.no_compatible_units')}</option>;
                            }
                            
                            return selectedProduct.compatible_units.map(compatibleUnit => {
                              const unit = compatibleUnit.unit || compatibleUnit;
                              const unitId = unit?.id || unit;
                              const unitName = unit?.name || compatibleUnit.unit_name;
                              const unitSymbol = unit?.symbol || compatibleUnit.unit_symbol;
                              const actualUnitId = typeof unitId === 'number' ? unitId : (unit?.id || unitId);
                              
                              if (!unitName || !unitSymbol) {
                                return null;
                              }
                              
                              const unitCostData = selectedProduct?.unit_costs?.find(uc => uc.id === actualUnitId);
                              const unitCost = unitCostData ? unitCostData.cost_price : 0;
                              
                              return (
                                <option key={actualUnitId} value={actualUnitId}>
                                  {unitName} ({unitSymbol}) - {parseFloat(unitCost).toFixed(2)} MGA
                                </option>
                              );
                            }).filter(Boolean);
                          })()}
                        </select>
                      </div>
                      <div className="item-cost">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                          required
                        />
                      </div>
                      <div className="item-tax">
                        <select
                          value={item.tax_class_id}
                          onChange={(e) => handleItemChange(index, 'tax_class_id', e.target.value)}
                        >
                          <option value="">{t('modals.no_tax')}</option>
                          {taxClasses.map(taxClass => (
                            <option key={taxClass.id} value={taxClass.id}>
                              {taxClass.name} ({taxClass.tax_rate}%)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="item-total">
                        <div className="total-display">
                          {calculateItemTotal(item).toFixed(2)} MGA
                          {item.tax_class_id && (
                            <span className="tax-amount">
                              + {calculateTaxAmount(item).toFixed(2)} MGA {t('modals.tax')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeItem(index)}
                        >
                          {t('modals.remove')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="section-header">
              <h3>{t('modals.order_items')}</h3>
              <div className="items-controls">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder={t('modals.search_products')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="product-search-input"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addItem} size={isMobile ? "small" : "medium"}>
                  {isMobile ? '+' : t('modals.add_item')}
                </Button>
              </div>
            </div>

          </div>

          {formData.items.length > 0 && (
            <div className="totals-section">
              <div className="totals-grid">
                <div className="totals-row">
                  <span>{t('modals.subtotal')}:</span>
                  <span>{totals.subtotal.toFixed(2)} MGA</span>
                </div>
                <div className="totals-row">
                  <span>{t('modals.tax_amount')}:</span>
                  <span>{totals.taxAmount.toFixed(2)} MGA</span>
                </div>
                <div className="totals-row total-row">
                  <span>{t('modals.total_amount')}:</span>
                  <span>{totals.total.toFixed(2)} MGA</span>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <div className="footer-left">
            <PrintButton
              data={formData}
              title={t('titles.purchase_order')}
              type="purchase_order"
              printText={isMobile ? "📄" : t('buttons.print_order')}
              validateText={t('modals.validate_print')}
              showValidateOption={true}
              onValidate={handleSubmit}
              disabled={!formData.supplier_id || formData.items.length === 0}
              size={isMobile ? "small" : "medium"}
            />
          </div>
          <div className="footer-right">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              {t('modals.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !formData.supplier_id || formData.items.length === 0}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              {loading ? t('modals.creating') : t('modals.create_purchase_order')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
// import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
// import { useApi } from '../hooks/useApi';
// import Button from './Button';
// import PrintButton from './PrintButton';
// import './PurchaseOrderModal.css';

// const PurchaseOrderModal = ({ suppliers, onClose, onSubmit }) => {
//   const { t } = useTranslation();
//   const [isMobile, setIsMobile] = useState(false);
  
//   // Helper function to get today's date in YYYY-MM-DD format
//   const getTodayDate = () => {
//     const today = new Date();
//     return today.toISOString().split('T')[0];
//   };
  
//   const [formData, setFormData] = useState({
//     supplier_id: '',
//     expected_delivery_date: getTodayDate(),
//     notes: '',
//     items: []
//   });
//   const [products, setProducts] = useState([]);
//   const [taxClasses, setTaxClasses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const api = useApi();

//   useEffect(() => {
//     const checkScreenSize = () => {
//       setIsMobile(window.innerWidth < 768);
//     };
    
//     checkScreenSize();
//     window.addEventListener('resize', checkScreenSize);
    
//     fetchProductsAndTaxes();
    
//     return () => window.removeEventListener('resize', checkScreenSize);
//   }, []); // eslint-disable-line react-hooks/exhaustive-deps

//   const fetchProductsAndTaxes = async () => {
//     try {
//       const [productsResponse, taxResponse] = await Promise.all([
//         api.get('/api/products/'),
//         api.get('/api/products/tax-classes/')
//       ]);
      
//       const data = productsResponse.data;
//       const products = data.results || data;
      
//       // Fetch unit costs for each product
//       const productsWithUnitCosts = await Promise.all(
//         products.map(async (product) => {
//           try {
//             const unitCostsResponse = await api.get(`/api/products/${product.id}/unit-costs/`);
//             return {
//               ...product,
//               unit_costs: unitCostsResponse.data.unit_costs || []
//             };
//           } catch (error) {
//             console.error(`Error fetching unit costs for product ${product.id}:`, error);
//             return {
//               ...product,
//               unit_costs: []
//             };
//           }
//         })
//       );
      
//       setProducts(productsWithUnitCosts);
//       const taxData = taxResponse.data;
//       setTaxClasses(taxData.results || taxData);
//     } catch (error) {
//       console.error('Error fetching products and tax classes:', error);
//     }
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const addItem = () => {
//     setFormData(prev => ({
//       ...prev,
//       items: [...prev.items, {
//         product_id: '',
//         quantity_ordered: 1,
//         unit_id: '',
//         unit_cost: 0,
//         tax_class_id: '',
//         notes: ''
//       }]
//     }));
//   };

//   const removeItem = (index) => {
//     setFormData(prev => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index)
//     }));
//   };

//   const handleItemChange = (index, field, value) => {
//     setFormData(prev => ({
//       ...prev,
//       items: prev.items.map((item, i) => {
//         if (i === index) {
//           const updatedItem = { ...item, [field]: value };
          
//           // When product is selected, set default unit and unit cost
//           if (field === 'product_id' && value) {
//             const selectedProduct = products.find(p => p.id === parseInt(value));
//             if (selectedProduct?.compatible_units?.length > 0) {
//               // Find the default unit (is_default: true) or fallback to base unit
//               let defaultUnit = selectedProduct.compatible_units.find(u => u.is_default);
//               if (!defaultUnit) {
//                 defaultUnit = selectedProduct.compatible_units.find(u => u.unit?.is_base_unit || u.unit_is_base);
//               }
//               if (!defaultUnit) {
//                 defaultUnit = selectedProduct.compatible_units[0];
//               }
              
//               if (defaultUnit) {
//                 // Handle both ProductUnit structure (with nested unit) and direct unit structure
//                 const unit = defaultUnit.unit || defaultUnit;
//                 const unitId = unit?.id || unit; // unit might be just an ID
                
//                 // For compatible_units structure, unit is just the ID number
//                 const actualUnitId = typeof unitId === 'number' ? unitId : (unit?.id || unitId);
                
//                 if (actualUnitId) {
//                   updatedItem.unit_id = actualUnitId;
                  
//                   // Use the unit costs from the API response
//                   // The unit_costs array contains the correct cost for each unit
//                   const unitCostData = selectedProduct?.unit_costs?.find(uc => uc.id === actualUnitId);
//                   if (unitCostData) {
//                     updatedItem.unit_cost = parseFloat(unitCostData.cost_price).toFixed(2);
//                   } else {
//                     // Fallback to the stored cost_price if unit_costs not available
//                     updatedItem.unit_cost = parseFloat(selectedProduct?.cost_price || 0).toFixed(2);
//                   }
//                 }
//               }
//             }
//           }
          
//           return updatedItem;
//         }
//         return item;
//       })
//     }));
//   };

//   const handleSubmit = async (e) => {
//     if (e && e.preventDefault) {
//       e.preventDefault();
//     }
//     if (!formData.supplier_id || formData.items.length === 0) {
//       alert(t('modals.please_select_supplier_add_item'));
//       return;
//     }

//     // Validate that all items have required fields
//     const invalidItems = formData.items.filter(item => 
//       !item.product_id || !item.quantity_ordered || !item.unit_cost
//     );
    
//     if (invalidItems.length > 0) {
//       alert('Please fill in all required fields for all items (product, quantity, unit cost)');
//       return;
//     }

//     // Convert data types to ensure proper API format
//     const processedData = {
//       ...formData,
//       supplier_id: parseInt(formData.supplier_id),
//       items: formData.items.map(item => ({
//         ...item,
//         product_id: parseInt(item.product_id),
//         quantity_ordered: parseFloat(item.quantity_ordered),
//         unit_id: item.unit_id ? parseInt(item.unit_id) : null,
//         unit_cost: parseFloat(item.unit_cost),
//         tax_class_id: item.tax_class_id ? parseInt(item.tax_class_id) : null
//       }))
//     };

//     setLoading(true);
//     try {
//       await onSubmit(processedData);
//     } catch (error) {
//       console.error('Error submitting purchase order:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const calculateItemTotal = (item) => {
//     const quantity = parseFloat(item.quantity_ordered) || 0;
//     const unitCost = parseFloat(item.unit_cost) || 0;
    
//     // Since unit cost is now the cost for the selected unit, just multiply by quantity
//     return quantity * unitCost;
//   };

//   const calculateTaxAmount = (item) => {
//     const lineTotal = calculateItemTotal(item);
//     const taxClass = taxClasses.find(tc => tc.id === parseInt(item.tax_class_id));
//     if (taxClass) {
//       return lineTotal * (taxClass.tax_rate / 100);
//     }
//     return 0;
//   };

//   const calculateTotals = () => {
//     const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
//     const taxAmount = formData.items.reduce((sum, item) => sum + calculateTaxAmount(item), 0);
//     const total = subtotal + taxAmount;
    
//     return { subtotal, taxAmount, total };
//   };

//   const totals = calculateTotals();

//   // Mobile Item Card Component
//   const MobileItemCard = ({ item, index }) => {
//     const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
    
//     return (
//       <div className="mobile-item-card">
//         <div className="mobile-item-header">
//           <div className="item-product">
//             <label>{t('common.name')} *</label>
//             <select
//               value={item.product_id}
//               onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
//               required
//             >
//               <option value="">{t('modals.select_product')}</option>
//               {products.map(product => (
//                 <option key={product.id} value={product.id}>
//                   {product.name} ({product.sku})
//                 </option>
//               ))}
//             </select>
//           </div>
//           <button
//             type="button"
//             className="remove-button"
//             onClick={() => removeItem(index)}
//           >
//             {t('modals.remove')}
//           </button>
//         </div>
        
//         <div className="mobile-item-details">
//           <div className="detail-row">
//             <div className="field-group">
//               <label>{t('common.quantity')} *</label>
//               <input
//                 type="number"
//                 min="1"
//                 value={item.quantity_ordered}
//                 onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
//                 required
//               />
//             </div>
//             <div className="field-group">
//               <label>{t('modals.unit_cost')} *</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={item.unit_cost}
//                 onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
//                 required
//               />
//             </div>
//           </div>
          
//           <div className="field-group full-width">
//             <label>{t('common.unit')}</label>
//             <select
//               value={item.unit_id}
//               onChange={(e) => {
//                 const unitId = e.target.value;
//                 handleItemChange(index, 'unit_id', unitId);
                
//                 // Auto-set unit cost based on selected unit's cost from API
//                 if (unitId) {
//                   const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
//                   if (selectedProduct?.unit_costs) {
//                     const unitCostData = selectedProduct.unit_costs.find(uc => uc.id === parseInt(unitId));
//                     if (unitCostData) {
//                       handleItemChange(index, 'unit_cost', parseFloat(unitCostData.cost_price).toFixed(2));
//                     }
//                   }
//                 }
//               }}
//             >
//               <option value="">{t('modals.select_unit')}</option>
//               {(() => {
//                 if (!selectedProduct?.compatible_units || selectedProduct.compatible_units.length === 0) {
//                   return <option value="">{t('modals.no_compatible_units')}</option>;
//                 }
                
//                 return selectedProduct.compatible_units.map(compatibleUnit => {
//                   const unit = compatibleUnit.unit || compatibleUnit;
//                   const unitId = unit?.id || unit;
//                   const unitName = unit?.name || compatibleUnit.unit_name;
//                   const unitSymbol = unit?.symbol || compatibleUnit.unit_symbol;
                  
//                   const actualUnitId = typeof unitId === 'number' ? unitId : (unit?.id || unitId);
                  
//                   if (!unitName || !unitSymbol) {
//                     console.warn('Invalid unit data:', compatibleUnit);
//                     return null;
//                   }
                  
//                   const unitCostData = selectedProduct?.unit_costs?.find(uc => uc.id === actualUnitId);
//                   const unitCost = unitCostData ? unitCostData.cost_price : 0;
                  
//                   return (
//                     <option key={actualUnitId} value={actualUnitId}>
//                       {unitName} ({unitSymbol}) - {parseFloat(unitCost).toFixed(2)} MGA
//                     </option>
//                   );
//                 }).filter(Boolean);
//               })()}
//             </select>
//           </div>
          
//           <div className="field-group full-width">
//             <label>{t('modals.tax_class')}</label>
//             <select
//               value={item.tax_class_id}
//               onChange={(e) => handleItemChange(index, 'tax_class_id', e.target.value)}
//             >
//               <option value="">{t('modals.no_tax')}</option>
//               {taxClasses.map(taxClass => (
//                 <option key={taxClass.id} value={taxClass.id}>
//                   {taxClass.name} ({taxClass.tax_rate}%)
//                 </option>
//               ))}
//             </select>
//           </div>
          
//           <div className="mobile-item-totals">
//             <div className="total-line">
//               <span>{t('modals.line_total')}:</span>
//               <span>{calculateItemTotal(item).toFixed(2)} MGA</span>
//             </div>
//             {item.tax_class_id && (
//               <div className="total-line tax-line">
//                 <span>{t('modals.tax_amount')}:</span>
//                 <span>+ {calculateTaxAmount(item).toFixed(2)} MGA</span>
//               </div>
//             )}
//             <div className="total-line grand-total">
//               <span>{t('modals.total')}:</span>
//               <span>{(calculateItemTotal(item) + calculateTaxAmount(item)).toFixed(2)} MGA</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="modal-overlay">
//       <div className={`modal-content purchase-order-modal ${isMobile ? 'mobile-modal' : ''}`}>
//         <div className="modal-header">
//           <h2>{t('modals.create_purchase_order')}</h2>
//           <button className="close-button" onClick={onClose}>×</button>
//         </div>

//         <form onSubmit={handleSubmit} className="modal-body">
//           <div className="form-section">
//             <h3>{t('modals.order_details')}</h3>
//             <div className={`form-layout ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
//               <div className="form-group">
//                 <label htmlFor="supplier_id">{t('modals.supplier')} *</label>
//                 <select
//                   id="supplier_id"
//                   name="supplier_id"
//                   value={formData.supplier_id}
//                   onChange={handleInputChange}
//                   required
//                 >
//                   <option value="">{t('modals.select_supplier')}</option>
//                   {suppliers.map(supplier => (
//                     <option key={supplier.id} value={supplier.id}>
//                       {supplier.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div className="form-group">
//                 <label htmlFor="expected_delivery_date">{t('modals.expected_delivery_date')}</label>
//                 <input
//                   type="date"
//                   id="expected_delivery_date"
//                   name="expected_delivery_date"
//                   value={formData.expected_delivery_date}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>
//             <div className="form-group full-width">
//               <label htmlFor="notes">{t('common.notes')}</label>
//               <textarea
//                 id="notes"
//                 name="notes"
//                 value={formData.notes}
//                 onChange={handleInputChange}
//                 rows={isMobile ? 2 : 3}
//                 placeholder="Additional notes for this purchase order..."
//               />
//             </div>
//           </div>

//           <div className="form-section">

//             {formData.items.length === 0 ? (
//               <div className="empty-items">
//                 <p>{t('modals.no_items_added_yet')}</p>
//               </div>
//             ) : isMobile ? (
//               // Mobile Items List
//               <div className="mobile-items-list">
//                 {formData.items.map((item, index) => (
//                   <MobileItemCard key={index} item={item} index={index} />
//                 ))}
//               </div>
//             ) : (
//               // Desktop Items Table
//               <div className="desktop-items-table">
//                 <div className="items-header">
//                   <span>{t('common.name')}</span>
//                   <span>{t('common.quantity')}</span>
//                   <span>{t('common.unit')}</span>
//                   <span>{t('modals.unit_cost')}</span>
//                   <span>{t('modals.tax_class')}</span>
//                   <span>{t('modals.line_total')}</span>
//                   <span>{t('actions.actions')}</span>
//                 </div>
//                 {formData.items.map((item, index) => {
//                   const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
                  
//                   return (
//                     <div key={index} className="item-row">
//                       <div className="item-product">
//                         <select
//                           value={item.product_id}
//                           onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
//                           required
//                         >
//                           <option value="">{t('modals.select_product')}</option>
//                           {products.map(product => (
//                             <option key={product.id} value={product.id}>
//                               {product.name} ({product.sku})
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                       <div className="item-quantity">
//                         <input
//                           type="number"
//                           min="1"
//                           value={item.quantity_ordered}
//                           onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
//                           required
//                         />
//                       </div>
//                       <div className="item-unit">
//                         <select
//                           value={item.unit_id}
//                           onChange={(e) => {
//                             const unitId = e.target.value;
//                             handleItemChange(index, 'unit_id', unitId);
                            
//                             if (unitId) {
//                               const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
//                               if (selectedProduct?.unit_costs) {
//                                 const unitCostData = selectedProduct.unit_costs.find(uc => uc.id === parseInt(unitId));
//                                 if (unitCostData) {
//                                   handleItemChange(index, 'unit_cost', parseFloat(unitCostData.cost_price).toFixed(2));
//                                 }
//                               }
//                             }
//                           }}
//                         >
//                           <option value="">{t('modals.select_unit')}</option>
//                           {(() => {
//                             if (!selectedProduct?.compatible_units || selectedProduct.compatible_units.length === 0) {
//                               return <option value="">{t('modals.no_compatible_units')}</option>;
//                             }
                            
//                             return selectedProduct.compatible_units.map(compatibleUnit => {
//                               const unit = compatibleUnit.unit || compatibleUnit;
//                               const unitId = unit?.id || unit;
//                               const unitName = unit?.name || compatibleUnit.unit_name;
//                               const unitSymbol = unit?.symbol || compatibleUnit.unit_symbol;
//                               const actualUnitId = typeof unitId === 'number' ? unitId : (unit?.id || unitId);
                              
//                               if (!unitName || !unitSymbol) {
//                                 return null;
//                               }
                              
//                               const unitCostData = selectedProduct?.unit_costs?.find(uc => uc.id === actualUnitId);
//                               const unitCost = unitCostData ? unitCostData.cost_price : 0;
                              
//                               return (
//                                 <option key={actualUnitId} value={actualUnitId}>
//                                   {unitName} ({unitSymbol}) - {parseFloat(unitCost).toFixed(2)} MGA
//                                 </option>
//                               );
//                             }).filter(Boolean);
//                           })()}
//                         </select>
//                       </div>
//                       <div className="item-cost">
//                         <input
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={item.unit_cost}
//                           onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
//                           required
//                         />
//                       </div>
//                       <div className="item-tax">
//                         <select
//                           value={item.tax_class_id}
//                           onChange={(e) => handleItemChange(index, 'tax_class_id', e.target.value)}
//                         >
//                           <option value="">{t('modals.no_tax')}</option>
//                           {taxClasses.map(taxClass => (
//                             <option key={taxClass.id} value={taxClass.id}>
//                               {taxClass.name} ({taxClass.tax_rate}%)
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                       <div className="item-total">
//                         <div className="total-display">
//                           {calculateItemTotal(item).toFixed(2)} MGA
//                           {item.tax_class_id && (
//                             <span className="tax-amount">
//                               + {calculateTaxAmount(item).toFixed(2)} MGA {t('modals.tax')}
//                             </span>
//                           )}
//                         </div>
//                       </div>
//                       <div className="item-actions">
//                         <button
//                           type="button"
//                           className="remove-button"
//                           onClick={() => removeItem(index)}
//                         >
//                           {t('modals.remove')}
//                         </button>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//             <div className="section-header">
//               <h3>{t('modals.order_items')}</h3>
//               <Button type="button" variant="secondary" onClick={addItem} size={isMobile ? "small" : "medium"}>
//                 {isMobile ? '+' : t('modals.add_item')}
//               </Button>
//             </div>

//           </div>

//           {formData.items.length > 0 && (
//             <div className="totals-section">
//               <div className="totals-grid">
//                 <div className="totals-row">
//                   <span>{t('modals.subtotal')}:</span>
//                   <span>{totals.subtotal.toFixed(2)} MGA</span>
//                 </div>
//                 <div className="totals-row">
//                   <span>{t('modals.tax_amount')}:</span>
//                   <span>{totals.taxAmount.toFixed(2)} MGA</span>
//                 </div>
//                 <div className="totals-row total-row">
//                   <span>{t('modals.total_amount')}:</span>
//                   <span>{totals.total.toFixed(2)} MGA</span>
//                 </div>
//               </div>
//             </div>
//           )}
//         </form>

//         <div className="modal-footer">
//           <div className="footer-left">
//             <PrintButton
//               data={formData}
//               title={t('titles.purchase_order')}
//               type="purchase_order"
//               printText={isMobile ? "📄" : t('buttons.print_order')}
//               validateText={t('modals.validate_print')}
//               showValidateOption={true}
//               onValidate={handleSubmit}
//               disabled={!formData.supplier_id || formData.items.length === 0}
//               size={isMobile ? "small" : "medium"}
//             />
//           </div>
//           <div className="footer-right">
//             <Button 
//               type="button" 
//               variant="secondary" 
//               onClick={onClose}
//               size={isMobile ? "small" : "medium"}
//               fullWidth={isMobile}
//             >
//               {t('modals.cancel')}
//             </Button>
//             <Button
//               type="submit"
//               variant="primary"
//               onClick={handleSubmit}
//               disabled={loading || !formData.supplier_id || formData.items.length === 0}
//               size={isMobile ? "small" : "medium"}
//               fullWidth={isMobile}
//             >
//               {loading ? t('modals.creating') : t('modals.create_purchase_order')}
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PurchaseOrderModal;