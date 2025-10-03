import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import { generatePrintContent } from '../components/PrintButton';
import './PointOfSale.css';

const PointOfSale = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userSellableCategories, setUserSellableCategories] = useState(new Set()); // Per-user session sellable categories
  const [cart, setCart] = useState([]);

  // Initialize user sellable categories from localStorage
  const initializeUserSellableCategories = () => {
    return new Promise((resolve) => {
      if (user?.id) {
        const savedCategories = localStorage.getItem(`user-${user.id}-sellable-categories`);
        
        if (savedCategories) {
          try {
            const categoryIds = JSON.parse(savedCategories);
            setUserSellableCategories(new Set(categoryIds));
            resolve(new Set(categoryIds));
          } catch (e) {
            console.warn('Failed to parse saved sellable categories:', e);
            setUserSellableCategories(new Set());
            resolve(new Set());
          }
        } else {
          // If no saved categories, start with empty set (user will need to select categories)
          setUserSellableCategories(new Set());
          resolve(new Set());
        }
      } else {
        resolve(new Set());
      }
    });
  };

  // Initialize all categories as sellable when categories are first loaded (only if no saved preferences)
  const initializeAllCategoriesAsSellable = () => {
    if (user?.id && categories.length > 0 && userSellableCategories.size === 0) {
      // Check if user has any saved preferences first
      const savedCategories = localStorage.getItem(`user-${user.id}-sellable-categories`);
      if (!savedCategories) {
        // Only initialize all categories as sellable if user has no saved preferences
        const allCategoryIds = new Set(categories.map(cat => cat.id));
        setUserSellableCategories(allCategoryIds);
        localStorage.setItem(`user-${user.id}-sellable-categories`, JSON.stringify([...allCategoryIds]));
      } else {
      }
    }
  };
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('full'); // 'full' or 'partial'
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [stockAvailability, setStockAvailability] = useState({});
  // Initialize filters from URL parameters or localStorage
  const getInitialFilters = () => {
    const urlCategory = searchParams.get('category');
    const urlSearch = searchParams.get('search');
    
    // Try URL parameters first, then localStorage, then defaults
    const savedFilters = localStorage.getItem('pos-filters');
    let savedCategory = '';
    let savedSearch = '';
    
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        savedCategory = parsed.category || '';
        savedSearch = parsed.search || '';
      } catch (e) {
        console.warn('Failed to parse saved filters:', e);
      }
    }
    
    return {
      category: urlCategory || savedCategory || '',
      search: urlSearch || savedSearch || ''
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [searchInput, setSearchInput] = useState(getInitialFilters().search); // Initialize from saved filters
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [tempQuantity, setTempQuantity] = useState('');
  const [selectedUnits, setSelectedUnits] = useState({}); // Track selected unit for each product
  const searchInputRef = useRef(null); // Ref for search input
  const searchTimeoutRef = useRef(null); // Ref for search timeout

  // Function to update filters and persist them
  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams();
    if (newFilters.category) newSearchParams.set('category', newFilters.category);
    if (newFilters.search) newSearchParams.set('search', newFilters.search);
    setSearchParams(newSearchParams);
    
    // Save to localStorage
    localStorage.setItem('pos-filters', JSON.stringify(newFilters));
  };
  const [showSellableToggle, setShowSellableToggle] = useState(false); // Show/hide sellable toggle
  const [priceMode, setPriceMode] = useState('standard'); // 'standard' or 'wholesale'
  const [saleMode, setSaleMode] = useState('complete'); // 'complete' or 'pending'
  const [printReceipt, setPrintReceipt] = useState(true); // true or false

  // Function to get the current price based on price mode
  const getCurrentPrice = (product) => {
    if (priceMode === 'wholesale' && product.wholesale_price) {
      return parseFloat(product.wholesale_price);
    }
    return parseFloat(product.price);
  };

  // Calculate total amount
  const calculateTotal = () => {
    const total = cart.reduce((total, item) => {
      const unitPrice = item.unit_price || 0;
      return total + (unitPrice * item.quantity);
    }, 0);
    return total;
  };

  // Update paid amount when payment type changes
  useEffect(() => {
    const total = calculateTotal();
    if (paymentType === 'full') {
      setPaidAmount(total);
    } else if (paymentType === 'partial') {
      // Only reset to 0 if it's currently set to the full amount
      if (paidAmount === total) {
        setPaidAmount(0);
      }
    }
  }, [paymentType, cart]);

  // Function to get the current price for a specific unit
  const getCurrentUnitPrice = (product, unitStockInfo) => {
    if (!unitStockInfo?.price) return 0;
    
    // If we're in standard mode, return the standard unit price
    if (priceMode === 'standard') {
      return unitStockInfo.price;
    }
    
    // If we're in wholesale mode, we need to calculate the wholesale price for this unit
    if (priceMode === 'wholesale' && product.wholesale_price) {
      const standardBasePrice = parseFloat(product.price);
      const wholesaleBasePrice = parseFloat(product.wholesale_price);
      
      // Handle edge cases
      if (!standardBasePrice || standardBasePrice <= 0) {
        console.warn('Invalid standard base price:', standardBasePrice);
        return unitStockInfo.price;
      }
      
      // Calculate the conversion factor from standard to wholesale
      const wholesaleConversionFactor = wholesaleBasePrice / standardBasePrice;
      
      // For wholesale pricing, we need to apply the wholesale conversion factor
      // to the base unit price, then convert to the selected unit
      let wholesaleUnitPrice;
      
      if (unitStockInfo.is_base_unit) {
        // If this is the base unit, apply wholesale factor directly
        wholesaleUnitPrice = standardBasePrice * wholesaleConversionFactor;
      } else {
        // If this is not the base unit, we need to:
        // 1. Get the wholesale base price
        // 2. Convert it to the selected unit using the same conversion factor as the standard price
        const standardUnitPrice = unitStockInfo.price;
        const unitConversionFactor = standardUnitPrice / standardBasePrice;
        wholesaleUnitPrice = wholesaleBasePrice * unitConversionFactor;
      }
      
      // Round to 2 decimal places to avoid floating point precision issues
      const roundedPrice = Math.round(wholesaleUnitPrice * 100) / 100;
      
      // Ensure we return a valid number
      return isNaN(roundedPrice) || roundedPrice < 0 ? unitStockInfo.price : roundedPrice;
    }
    
    // Fallback to standard price
    return unitStockInfo.price;
  };

  useEffect(() => {
    const initializeData = async () => {
      // First load categories
      await fetchCategories();
      // Then initialize user sellable categories (after categories are loaded)
      await initializeUserSellableCategories();
      // Then load products (this will now properly filter by sellable categories)
      await fetchProducts();
    };
    initializeData();
  }, [user?.id]); // Re-initialize when user changes

  // Note: Removed redundant useEffect that was causing double filtering
  // Now categories are loaded first, then products are filtered properly

  // Debounced search effect - simplified to avoid conflicts
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        const newFilters = { ...filters, search: searchInput };
        updateFilters(newFilters);
        fetchProducts(newFilters);
      }
    }, 500);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]); // Only depend on searchInput to avoid loops

  // Effect to handle URL parameter changes
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlSearch = searchParams.get('search');
    
    // Only update if URL parameters are different from current filters
    if (urlCategory !== filters.category || urlSearch !== filters.search) {
      const newFilters = {
        category: urlCategory || '',
        search: urlSearch || ''
      };
      setFilters(newFilters);
      setSearchInput(urlSearch || '');
      // Don't call fetchProducts here to avoid conflicts with debounced search
      // The debounced search effect will handle the API call
    }
  }, [searchParams]); // Only depend on searchParams

  // Effect to initialize all categories as sellable when categories are first loaded
  useEffect(() => {
    initializeAllCategoriesAsSellable();
  }, [categories.length, user?.id]); // Run when categories are loaded or user changes

  // Effect to re-fetch products when user sellable categories change
  useEffect(() => {
    if (categories.length > 0 && userSellableCategories.size >= 0) {
      // Only fetch if we have a meaningful change (not just initialization)
      if (userSellableCategories.size > 0) {
        fetchProducts(filters);
      }
    }
  }, [userSellableCategories]); // Re-fetch when sellable categories change

  useEffect(() => {
    // Fetch stock availability for ALL products in bulk to improve performance
    if (products.length > 0) {
      fetchBulkStockAvailability();
    }
    
    // Set default selected units (default unit first, then base unit) for products with multiple compatible units
    const defaultUnits = {};
    products.forEach(product => {
      if (product.compatible_units && product.compatible_units.length > 1) {
        
        // First try to find the default unit (is_default: true)
        let selectedUnit = product.compatible_units.find(u => u.is_default);
        
        // If no default unit, fall back to base unit (is_base_unit: true)
        if (!selectedUnit) {
          selectedUnit = product.compatible_units.find(u => u.unit.is_base_unit);
        }
        
        // If still no unit found, use the first one
        if (!selectedUnit) {
          selectedUnit = product.compatible_units[0];
        }
        
        if (selectedUnit) {
          defaultUnits[product.id] = selectedUnit.unit?.id || selectedUnit.unit;
        }
      }
    });
    setSelectedUnits(defaultUnits);
  }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBulkStockAvailability = async () => {
    try {
      const productIds = products.map(product => product.id);
      const response = await api.post('/api/products/bulk-stock-availability/', {
        product_ids: productIds
      });
      
      // Convert the response to the format expected by the existing code
      const stockData = {};
      Object.values(response.data).forEach(productStock => {
        stockData[productStock.product_id] = productStock.available_units;
      });
      
      
      
      setStockAvailability(stockData);
    } catch (err) {
      console.error('Bulk stock availability error:', err);
      // Fallback to individual calls if bulk fails
      products.forEach(product => {
        fetchStockAvailability(product.id);
      });
    }
  };

  const refreshStockAvailability = () => {
    // Use bulk fetch for better performance
    if (products.length > 0) {
      fetchBulkStockAvailability();
    }
  };


  const getUpdatedStockAvailability = (productId) => {
    // Get the base stock availability for this product
    const baseStockInfo = stockAvailability[productId];
    if (!baseStockInfo) {
      return null;
    }

    // Calculate total pieces already in cart for this product (convert all units to pieces)
    const totalPiecesInCart = cart
      .filter(item => item.id === productId)
      .reduce((total, item) => {
        // Find the unit info to get conversion factor
        const unitInfo = baseStockInfo.find(u => u.id === item.unit_id);
        if (unitInfo && unitInfo.conversion_factor) {
          // Convert to pieces: if 1 carton = 20 pieces, then quantity * 20
          return total + (item.quantity * unitInfo.conversion_factor);
        } else if (unitInfo && unitInfo.is_base_unit) {
          // If it's the base unit (pieces), no conversion needed
          return total + item.quantity;
        }
        return total;
      }, 0);

    // Calculate remaining pieces in base stock
    const baseUnit = baseStockInfo.find(u => u.is_base_unit);
    const totalBaseStock = baseUnit ? baseUnit.available_quantity : 0;
    const remainingPieces = Math.max(0, totalBaseStock - totalPiecesInCart);


    // Update each unit's available quantity based on remaining pieces
    return baseStockInfo.map(unit => {
      let availableQuantity = 0;
      let isAvailable = false;

      if (unit.is_base_unit) {
        // For base unit (pieces), use remaining pieces directly
        availableQuantity = remainingPieces;
        isAvailable = remainingPieces > 0;
      } else if (unit.conversion_factor) {
        // For other units, calculate how many can be made from remaining pieces
        // If 1 carton = 20 pieces, then remainingPieces / 20 = available cartons
        availableQuantity = Math.floor(remainingPieces / unit.conversion_factor);
        isAvailable = availableQuantity > 0;
      }

      return {
        ...unit,
        available_quantity: availableQuantity,
        is_available: isAvailable
      };
    });
  };

  const fetchProducts = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Always filter for active products
      params.append('is_active', 'true');
      
      // Add filters to params
      if (filterParams.category) params.append('category', filterParams.category);
      if (filterParams.search) params.append('search', filterParams.search);
      
      const url = `/api/products/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      const allProducts = response.data.results || response.data;
      
      // Debug: Log the first product to see its structure
      if (allProducts.length > 0) {
      }
      
      // If categories are not loaded yet, show all products but log a warning
      if (categories.length === 0) {
        console.warn('Categories not loaded yet, showing all products (filtering will be applied once categories load)');
        setProducts(allProducts);
        return;
      }
      
      // If user has no sellable categories selected, show no products
      if (userSellableCategories.size === 0) {
        setProducts([]);
        return;
      }
      
      // Filter products based on user-specific sellable categories
      const sellableProducts = allProducts.filter(product => {
        let categoryId = null;
        
        // Get category ID from product
        if (product.category && typeof product.category === 'number') {
          categoryId = product.category;
        } else if (product.category && product.category.id) {
          categoryId = product.category.id;
        } else if (product.category_name) {
          const category = categories.find(cat => cat.name === product.category_name);
          categoryId = category ? category.id : null;
        }
        
        // If no category ID found, exclude the product
        if (!categoryId) {
          return false;
        }
        
        // Check if this category is in user's sellable categories
        const isSellable = userSellableCategories.has(categoryId);
        
        // Debug: Log filtering decision
        
        return isSellable;
      });

      // Additional check: if a specific category is selected, ensure it's in user's sellable categories
      if (filterParams.category) {
        const categoryId = parseInt(filterParams.category);
        if (!userSellableCategories.has(categoryId)) {
          // If selected category is not in user's sellable categories, return empty array
          setProducts([]);
          return;
        }
      }
      
      setProducts(sellableProducts);
    } catch (err) {
      setError('Failed to load products');
      console.error('Products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/products/categories/');
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error('Categories error:', err);
    }
  };


  const fetchStockAvailability = async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}/stock-availability/`);
      setStockAvailability(prev => ({
        ...prev,
        [productId]: response.data.available_units
      }));
    } catch (err) {
      console.error('Stock availability error:', err);
    }
  };

  const addToCart = (product, selectedUnit = null) => {
    
    // Use the first compatible unit if none selected
    let unit = selectedUnit;
    if (!unit && product.compatible_units && product.compatible_units[0]) {
      const compatibleUnit = product.compatible_units[0];
      unit = {
        id: compatibleUnit.unit?.id || compatibleUnit.unit,
        name: compatibleUnit.unit_name || compatibleUnit.unit?.name || t('common.piece'),
        symbol: compatibleUnit.unit_symbol || compatibleUnit.unit?.symbol || 'piece'
      };
    }
    if (!unit) {
      unit = { id: product.base_unit?.id || product.base_unit, name: t('common.piece'), symbol: 'piece' };
    }
    
    // Skip stock validation for pending sales since stock won't be removed until completion
    if (saleMode === 'complete') {
      // Check if stock availability data is loaded
      if (!stockAvailability[product.id]) {
        setError(t('pos.loading_stock_info'));
        return;
      }

      // Check updated stock availability for the selected unit
      const updatedStockInfo = getUpdatedStockAvailability(product.id);
      const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
      
      
      if (!unitStockInfo) {
        setError(t('pos.unit_not_found', { unitName: unit.name }));
        return;
      }
      
      if (!unitStockInfo.is_available) {
        setError(`${unit.name} is out of stock`);
        return;
      }
      
      // Check if there's enough stock for the selected unit
      if (unitStockInfo.available_quantity <= 0) {
        setError(t('pos.no_stock_left', { unitName: unit.name }));
        return;
      }
    }
    
    const existingItem = cart.find(item => 
      item.id === product.id && 
      item.unit_id === unit.id && 
      item.price_mode === priceMode
    );
    if (existingItem) {
      // Check if adding 1 more would exceed available quantity (only for complete sales)
      if (saleMode === 'complete') {
        const updatedStockInfo = getUpdatedStockAvailability(product.id);
        const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
        if (unitStockInfo && existingItem.quantity + 1 > unitStockInfo.available_quantity) {
          setError(t('pos.not_enough_available', { unitName: unit.name, quantity: unitStockInfo.available_quantity }));
          return;
        }
      }
      setCart(cart.map(item =>
        item.id === product.id && item.unit_id === unit.id && item.price_mode === priceMode
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Check if adding 1 would exceed available quantity (only for complete sales)
      if (saleMode === 'complete') {
        const updatedStockInfo = getUpdatedStockAvailability(product.id);
        const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
        if (unitStockInfo && 1 > unitStockInfo.available_quantity) {
          setError(t('pos.not_enough_available', { unitName: unit.name, quantity: unitStockInfo.available_quantity }));
          return;
        }
      }
      // Get unit stock info for price calculation
      const updatedStockInfo = getUpdatedStockAvailability(product.id);
      const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
      
      const newCartItem = {
        ...product,
        quantity: 1,
        unit_id: unit.id,
        unit_name: unit.name,
        unit_symbol: unit.symbol,
        unit_price: getCurrentUnitPrice(product, unitStockInfo) || getCurrentPrice(product),
        price_mode: priceMode
      };
      setCart([...cart, newCartItem]);
    }
    setError('');
  };

  const updateQuantity = (productId, unitId, quantity, priceMode = null) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)));
    } else {
      // Skip stock validation for pending sales since stock won't be removed until completion
      if (saleMode === 'complete') {
        // Check updated stock availability for the selected unit
        const updatedStockInfo = getUpdatedStockAvailability(productId);
        const unitStockInfo = updatedStockInfo?.find(u => u.id === unitId);
        
        if (!unitStockInfo || !unitStockInfo.is_available) {
          setError(t('pos.unit_out_of_stock'));
          return;
        }
        
        // For updateQuantity, we need to consider the current cart quantity
        const currentCartQuantity = cart
          .filter(item => item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        // Calculate how much we can add (available + what's already in cart)
        const maxAllowed = unitStockInfo.available_quantity + currentCartQuantity;
        
        if (quantity > maxAllowed) {
          setError(t('pos.not_enough_stock_max', { max: maxAllowed }));
          return;
        }
      }
      
      setCart(cart.map(item =>
        item.id === productId && item.unit_id === unitId && item.price_mode === priceMode
          ? { ...item, quantity }
          : item
      ));
      setError('');
    }
  };

  const removeFromCart = (productId, unitId, priceMode = null) => {
    setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    let totalTax = 0;
    cart.forEach(item => {
      if (item.tax_rate && item.tax_rate > 0) {
        // For tax-inclusive pricing: tax = (price × tax_rate) / (100 + tax_rate)
        const itemTax = (item.quantity * item.unit_price * item.tax_rate) / (100 + item.tax_rate);
        totalTax += itemTax;
      }
    });
    return totalTax;
  };

  const calculateCost = () => {
    let totalCost = 0;
    cart.forEach(item => {
      if (item.tax_rate && item.tax_rate > 0) {
        // For tax-inclusive pricing: cost = (price × 100) / (100 + tax_rate)
        const itemCost = (item.quantity * item.unit_price * 100) / (100 + item.tax_rate);
        totalCost += itemCost;
      } else {
        // No tax, full price is cost
        totalCost += item.quantity * item.unit_price;
      }
    });
    return totalCost;
  };


  const autoPrintReceipt = async (saleNumber, saleData, saleStatus = 'completed') => {
    try {
      // Create print content for the sale
      const total = calculateSubtotal();
      const remaining = total - paidAmount;
      
      const printData = {
        sale_number: saleNumber,
        customer_name: customerInfo.name || t('pos.walk_in_customer'),
        customer_phone: customerInfo.phone || '',
        customer_email: customerInfo.email || '',
        user_name: user?.username || t('pos.unknown_user'),
        user_id: user?.id || 'unknown',
        created_at: new Date().toISOString(),
        print_timestamp: new Date().toISOString(),
        print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: saleStatus,
        total_amount: total,
        paid_amount: paidAmount,
        remaining_amount: remaining,
        payment_status: remaining > 0 ? 'partial' : 'paid',
        due_date: remaining > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : null, // 30 days from now
        items: cart.map(item => ({
          product_name: item.name,
          product_sku: item.sku,
          quantity: item.quantity,
          unit_name: item.unit_name || item.unit?.name || 'piece',
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity
        }))
      };

      // Generate print content using the same logic as PrintButton
      const printContent = generatePrintContent(printData, t('pos.sale_receipt'), 'sale', t);
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      const printAfterLoad = () => {
        printWindow.focus();
        printWindow.print();
        // Close the window after a short delay
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };
      
      // Check if window is already loaded
      if (printWindow.document.readyState === 'complete') {
        printAfterLoad();
      } else {
        printWindow.onload = printAfterLoad;
      }
      
    } catch (error) {
      console.error('Auto-print error:', error);
      // Don't show error to user as it's not critical
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError(t('pos.cart_empty'));
      return;
    }

    setProcessing(true);
    setError('');

    // Validate customer name for partial payments
    if (paymentType === 'partial' && (!customerInfo.name || !customerInfo.name.trim())) {
      setError(t('pos.customer_name_required_partial'));
      setProcessing(false);
      return;
    }

    // Validate paid amount
    const total = calculateTotal();
    if (paidAmount > total) {
      setError(t('pos.paid_amount_exceeds_total'));
      setProcessing(false);
      return;
    }

    if (paidAmount < 0) {
      setError(t('pos.paid_amount_negative'));
      setProcessing(false);
      return;
    }

    try {
      const saleData = {
        sale_type: 'sale',
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email,
        payment_method: paymentMethod,
        paid_amount: paidAmount,
          items: cart.map(item => {
            // More robust unit ID extraction
            let unitId = item.unit_id;
            if (typeof unitId === 'object' && unitId !== null) {
              unitId = unitId.id || unitId;
            }
            
            return {
          product: item.id,
              quantity: parseFloat(item.quantity),
              unit: parseInt(unitId),
              unit_price: parseFloat(item.unit_price),
              price_mode: item.price_mode || 'standard'
            };
          })
        };


      // Create the sale
      const response = await api.post('/api/sales/', saleData);
      const saleId = response.data.id;
      const saleNumber = response.data.sale_number;
      
      if (saleMode === 'complete') {
        // Complete the sale immediately
        try {
          await api.post(`/api/sales/${saleId}/complete/`);
          
          // Auto-print the receipt after successful sale completion (only if printReceipt is true)
          if (printReceipt) {
            await autoPrintReceipt(saleNumber, response.data, 'completed');
          }
      
      // Clear cart and customer info
      setCart([]);
      setCustomerInfo({ name: '', phone: '', email: '' });
      
          // Reset price mode to standard after sale
          setPriceMode('standard');
          
          // Wait a moment for the backend to process stock movements
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          
          // Refresh product data to update stock quantities
          await fetchProducts();
          
          // Wait another moment for stock availability to be updated
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds
          
          // Refresh stock availability for all products
          refreshStockAvailability();
          
          alert(t('pos.sale_completed_success', { saleNumber }));
        } catch (completeError) {
          // Sale was created but completion failed
          console.error('Sale completion error:', completeError);
          setError(t('pos.sale_created_but_completion_failed', { 
            saleNumber, 
            error: completeError.response?.data?.error || completeError.message 
          }));
          
          // Still clear the cart since the sale was created
          setCart([]);
          setCustomerInfo({ name: '', phone: '', email: '' });
          
          // Wait for backend to process any completed stock movements
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh data
          await fetchProducts();
          await new Promise(resolve => setTimeout(resolve, 500));
          refreshStockAvailability();
        }
      } else {
        // Create pending sale (don't complete it)
        
        // Print receipt for pending sale if requested
        if (printReceipt) {
          await autoPrintReceipt(saleNumber, response.data, 'pending');
        }
        
        // Clear cart and customer info
        setCart([]);
        setCustomerInfo({ name: '', phone: '', email: '' });
        
        // Reset price mode to standard after sale
        setPriceMode('standard');
        
        alert(t('messages.pending_sale_created', { saleNumber }));
      }
    } catch (err) {
      console.error('Sale creation error:', err);
      console.error('Error response:', err.response?.data);
      
      // Handle different types of errors
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.customer_name) {
        setError(err.response.data.customer_name[0]);
      } else if (err.response?.data?.paid_amount) {
        setError(err.response.data.paid_amount[0]);
      } else {
        setError(t('pos.failed_to_create_sale'));
      }
    } finally {
      setProcessing(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setError('');
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'search') {
      // For search, update the input state immediately (debounced API call will follow)
      setSearchInput(value);
    } else {
      // For other filters (like category), update immediately and persist
      const newFilters = { ...filters, [filterType]: value };
      updateFilters(newFilters);
      fetchProducts(newFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters = { category: '', search: '' };
    updateFilters(clearedFilters);
    setSearchInput(''); // Clear the search input state
    fetchProducts(clearedFilters);
  };

  const toggleCategorySellable = (categoryId, isCurrentlySellable) => {
    try {
      setError(''); // Clear any previous errors
      
      const newSellableCategories = new Set(userSellableCategories);
      
      if (isCurrentlySellable) {
        // Remove from sellable categories
        newSellableCategories.delete(categoryId);
      } else {
        // Add to sellable categories
        newSellableCategories.add(categoryId);
      }
      
      setUserSellableCategories(newSellableCategories);
      
      // Save to localStorage for this user
      if (user?.id) {
        localStorage.setItem(`user-${user.id}-sellable-categories`, JSON.stringify([...newSellableCategories]));
      }
      
      
      // Refresh products to apply new sellable filter
      fetchProducts(filters);
    } catch (err) {
      console.error('Error updating category sellable status:', err);
      setError(t('pos.failed_to_update_category_status', { error: err.message || 'Unknown error' }));
    }
  };

  const resetUserCategories = () => {
    if (user?.id && categories.length > 0) {
      // Set all categories as sellable
      const allCategoryIds = new Set(categories.map(cat => cat.id));
      setUserSellableCategories(allCategoryIds);
      // Save to localStorage
      localStorage.setItem(`user-${user.id}-sellable-categories`, JSON.stringify([...allCategoryIds]));
      // Refresh products (will show all products from all categories)
      fetchProducts(filters);
    }
  };

  const handleQuantityClick = (item) => {
    setEditingQuantity(`${item.id}-${item.unit_id}`);
    setTempQuantity(item.quantity.toString());
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and empty string
    if (value === '' || /^\d+$/.test(value)) {
      setTempQuantity(value);
    }
  };

  const handleQuantitySubmit = (item) => {
    const newQuantity = parseFloat(tempQuantity);
    
    if (tempQuantity === '' || isNaN(newQuantity) || newQuantity < 0) {
      setError(t('pos.enter_valid_quantity'));
      setEditingQuantity(null);
      return;
    }
    
    // Skip stock validation for pending sales since stock won't be removed until completion
    if (saleMode === 'complete') {
      // Check updated stock availability for the selected unit
      const updatedStockInfo = getUpdatedStockAvailability(item.id);
      const unitStockInfo = updatedStockInfo?.find(u => u.id === item.unit_id);
      
      if (!unitStockInfo || !unitStockInfo.is_available) {
        setError(t('pos.unit_out_of_stock'));
        setEditingQuantity(null);
        return;
      }
      
      // For handleQuantitySubmit, we need to consider the current cart quantity
      const currentCartQuantity = cart
        .filter(cartItem => cartItem.id === item.id && cartItem.unit_id === item.unit_id && cartItem.price_mode === item.price_mode)
        .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
      
      // Calculate how much we can add (available + what's already in cart)
      const maxAllowed = unitStockInfo.available_quantity + currentCartQuantity;
      
      if (newQuantity > maxAllowed) {
        setError(t('pos.not_enough_stock_max', { max: maxAllowed }));
        setEditingQuantity(null);
        return;
      }
    }
    
    if (newQuantity === 0) {
      // Remove item from cart if quantity is 0
      removeFromCart(item.id, item.unit_id, item.price_mode);
    } else {
      updateQuantity(item.id, item.unit_id, newQuantity, item.price_mode);
    }
    
    setEditingQuantity(null);
    setTempQuantity('');
    setError('');
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const handleQuantityKeyPress = (e, item) => {
    if (e.key === 'Enter') {
      handleQuantitySubmit(item);
    } else if (e.key === 'Escape') {
      handleQuantityCancel();
    }
  };

  const handleUnitSelection = (productId, unitId) => {
    setSelectedUnits(prev => ({
      ...prev,
      [productId]: unitId
    }));
  };

  const handleProductCardClick = (product) => {
    // Don't allow clicking on out-of-stock products (only for complete sales)
    if (saleMode === 'complete' && product.stock_quantity <= 0) {
      return;
    }
    
    if (product.compatible_units && product.compatible_units.length > 1) {
      // For multi-unit products, add with the currently selected unit
      const selectedUnitId = selectedUnits[product.id];
      
      if (selectedUnitId) {
        const selectedCompatibleUnit = product.compatible_units.find(u => (u.unit?.id || u.unit) === selectedUnitId);
        
        if (selectedCompatibleUnit) {
          // Get the price for this unit from stock availability
          const updatedStockInfo = getUpdatedStockAvailability(product.id);
          const unitStockInfo = updatedStockInfo?.find(u => u.id === (selectedCompatibleUnit.unit?.id || selectedCompatibleUnit.unit));
          const unitPrice = getCurrentUnitPrice(product, unitStockInfo) || getCurrentPrice(product);
          
          // Convert compatible unit to the format expected by addToCart
          const selectedUnit = {
            id: selectedCompatibleUnit.unit?.id || selectedCompatibleUnit.unit,
            name: selectedCompatibleUnit.unit_name,
            symbol: selectedCompatibleUnit.unit_symbol,
            price: unitPrice
          };
          addToCart(product, selectedUnit);
        }
      }
    } else {
      // For single-unit products, add directly
      addToCart(product);
    }
  };

  if (loading) {
    return (
      <div className="pos">
        <div className="pos-loading">
          <div className="spinner"></div>
          <span>Loading products...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pos">
      <div className="pos-header">
        <h1>{t('titles.point_of_sale')}</h1>
        <div className="pos-user">
          <span>Cashier: {user?.username}</span>
        </div>
      </div>

      <div className="pos-content">
        {/* Product Grid */}
        <div className="pos-products">
          <h2>Products</h2>
          
          {/* Filters */}
          <form className="pos-filters">
            <div className="filter-group">
              <label>Category:</label>
              <select 
                value={filters.category} 
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.filter(cat => userSellableCategories.has(cat.id)).map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button 
                variant="outline" 
                size="small" 
                onClick={() => setShowSellableToggle(!showSellableToggle)}
                style={{ marginTop: '0.5rem' }}
              >
                {showSellableToggle ? t('pos.hide_categories') : t('pos.manage_categories')}
              </Button>
            </div>
            
            <div className="filter-group">
              <label>Price Mode:</label>
              <div className="price-mode-toggle">
                <button 
                  type="button"
                  className={`price-mode-btn ${priceMode === 'standard' ? 'active' : ''}`}
                  onClick={() => setPriceMode('standard')}
                >
                  Standard
                </button>
                <button 
                  type="button"
                  className={`price-mode-btn ${priceMode === 'wholesale' ? 'active' : ''}`}
                  onClick={() => setPriceMode('wholesale')}
                >
                  Wholesale
                </button>
              </div>
            </div>
            
            <div className="filter-group">
              <label>Sale Mode:</label>
              <div className="sale-mode-toggle">
                <button 
                  type="button"
                  className={`sale-mode-btn ${saleMode === 'complete' ? 'active' : ''}`}
                  onClick={() => setSaleMode('complete')}
                  title={t('alerts.sale_will_be_completed')}
                >
                  Complete
                </button>
                <button 
                  type="button"
                  className={`sale-mode-btn ${saleMode === 'pending' ? 'active' : ''}`}
                  onClick={() => setSaleMode('pending')}
                  title={t('alerts.sale_will_be_created_pending')}
                >
                  Pending
                </button>
              </div>
            </div>
            
            <div className="filter-group print-receipt-group">
              <label>Print Receipt:</label>
              <div className="sale-mode-toggle print-receipt-toggle">
                <button 
                  type="button"
                  className={`sale-mode-btn print-receipt-btn ${printReceipt ? 'active' : ''}`}
                  onClick={() => setPrintReceipt(true)}
                  title={t('alerts.print_receipt_after_sale')}
                >
                  Yes
                </button>
                <button 
                  type="button"
                  className={`sale-mode-btn print-receipt-btn ${!printReceipt ? 'active' : ''}`}
                  onClick={() => setPrintReceipt(false)}
                  title={t('pos.dont_print_receipt')}
                >
                  No
                </button>
              </div>
            </div>
            
            <div className="filter-group">
              <label>Search:</label>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('pos.search_products')}
                value={searchInput}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <Button variant="outline" size="small" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </form>

          {/* Category Management Section */}
          {showSellableToggle && (
            <div className="category-management" style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f9fafb', 
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>
                Manage Sellable Categories
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '0.5rem' 
              }}>
                {categories.map(category => (
                  <div key={category.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    backgroundColor: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                      {category.name}
                    </span>
                    <button
                      onClick={() => toggleCategorySellable(category.id, userSellableCategories.has(category.id))}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: '0.25rem',
                        border: '1px solid',
                        cursor: 'pointer',
                        backgroundColor: userSellableCategories.has(category.id) ? '#dcfce7' : '#fee2e2',
                        borderColor: userSellableCategories.has(category.id) ? '#16a34a' : '#dc2626',
                        color: userSellableCategories.has(category.id) ? '#15803d' : '#dc2626'
                      }}
                    >
                      {userSellableCategories.has(category.id) ? t('pos.sellable') : t('pos.not_sellable')}
                    </button>
          </div>
                ))}
              </div>
              
              {/* Reset Button */}
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Button 
                  variant="outline" 
                  size="small" 
                  onClick={resetUserCategories}
                  style={{ 
                    backgroundColor: '#dcfce7', 
                    borderColor: '#16a34a', 
                    color: '#15803d',
                    fontWeight: '500'
                  }}
                >
                  Reset to All Categories Sellable
                </Button>
              </div>
            </div>
          )}

          <div className="products-info">
            <p className="products-count">
              {products.length} product{products.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="products-grid">
            {products.map(product => (
              <div
                key={product.id}
                className={`product-card ${product.stock_quantity <= 0 && saleMode === 'complete' ? 'out-of-stock' : ''} clickable`}
                onClick={() => handleProductCardClick(product)}
              >
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-sku">{product.sku}</p>
                  <p className="product-price">
                    {(() => {
                      // Find the actual base unit and get its price
                      const baseUnit = product.compatible_units?.find(u => u.unit.is_base_unit);
                      if (baseUnit && stockAvailability[product.id]) {
                        const updatedStockInfo = getUpdatedStockAvailability(product.id);
                        const baseUnitStockInfo = updatedStockInfo?.find(u => u.id === (baseUnit.unit?.id || baseUnit.unit));
                        if (baseUnitStockInfo) {
                          return getCurrentUnitPrice(product, baseUnitStockInfo).toFixed(2);
                        }
                      }
                      // Fallback to the original price
                      return getCurrentPrice(product).toFixed(2);
                    })()} MGA
                    {product.compatible_units && product.compatible_units.length > 1 && 
                      ` (base unit: ${product.compatible_units.find(u => u.unit.is_base_unit)?.unit.symbol || 'piece'})`
                    }
                  </p>
                  <p className="product-stock">
                    Stock: {product.stock_quantity} {product.unit}
                    {stockAvailability[product.id] && product.compatible_units && product.compatible_units.length > 1 && (
                      <span className="stock-details">
                        {(() => {
                          const updatedStockInfo = getUpdatedStockAvailability(product.id);
                          return product.compatible_units.map(compatibleUnit => {
                            const unitStockInfo = updatedStockInfo?.find(u => u.id === (compatibleUnit.unit?.id || compatibleUnit.unit));
                            if (!unitStockInfo) return null;
                            
                            // Use unit info from stock availability if available, otherwise fallback to compatible unit
                            const unitName = unitStockInfo?.name || compatibleUnit.unit?.name || compatibleUnit.unit_name;
                            
                            return (
                              <span key={compatibleUnit.unit?.id || compatibleUnit.unit} className={`unit-stock ${unitStockInfo.is_available ? 'available' : 'unavailable'}`}>
                                {unitName}: {getCurrentUnitPrice(product, unitStockInfo).toFixed(2)} MGA ({unitStockInfo.available_quantity} available)
                              </span>
                            );
                          }).filter(Boolean);
                        })()}
                      </span>
                    )}
                  </p>
                  
                  {/* Unit Selection - Only show for products with multiple compatible units */}
                  {product.compatible_units && product.compatible_units.length > 1 && (
                    <div className="unit-selection">
                      <label>Unit:</label>
                      <select 
                        className="unit-select"
                        value={selectedUnits[product.id] || ''}
                        onChange={(e) => {
                          const unitId = parseInt(e.target.value);
                          handleUnitSelection(product.id, unitId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Select Unit</option>
                        {product.compatible_units.map((compatibleUnit, index) => {
                          // Use updated stock availability that considers cart contents
                          const updatedStockInfo = getUpdatedStockAvailability(product.id);
                          const unitStockInfo = updatedStockInfo?.find(u => u.id === (compatibleUnit.unit?.id || compatibleUnit.unit));
                          const isAvailable = unitStockInfo ? unitStockInfo.is_available : false;
                          const availableQty = unitStockInfo ? unitStockInfo.available_quantity : 0;
                          
                          // Use unit info from stock availability if available, otherwise fallback to compatible unit
                          const unitName = unitStockInfo?.name || compatibleUnit.unit?.name || compatibleUnit.unit_name;
                          const unitSymbol = unitStockInfo?.symbol || compatibleUnit.unit?.symbol || compatibleUnit.unit_symbol;
                          
                          
                          return (
                            <option 
                              key={compatibleUnit.unit?.id || compatibleUnit.unit} 
                              value={compatibleUnit.unit?.id || compatibleUnit.unit}
                              disabled={saleMode === 'complete' ? !isAvailable : false}
                            >
                              {unitName} ({unitSymbol}) - {getCurrentUnitPrice(product, unitStockInfo).toFixed(2)} MGA
                              {!isAvailable && saleMode === 'complete' ? t('pos.out_of_stock_label') : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  
                  {/* Add to Cart Button - Only show for single unit products */}
                  {(!product.compatible_units || product.compatible_units.length <= 1) && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => addToCart(product)}
                      disabled={(() => {
                        // Skip stock validation for pending sales since stock won't be removed until completion
                        if (saleMode === 'pending') {
                          return false; // Always allow for pending sales
                        }
                        
                        // Check if any unit has available stock
                        if (!stockAvailability[product.id]) {
                          return true; // Disable if stock data not loaded
                        }
                        
                        // For single unit products, check base stock
                        return product.stock_quantity <= 0;
                      })()}
                      className="add-to-cart-btn"
                    >
                      {(() => {
                        if (!stockAvailability[product.id]) {
                          return t('pos.loading');
                        }
                        
                        // For pending sales, always show "Add to Cart" regardless of stock
                        if (saleMode === 'pending') {
                          return t('pos.add_to_cart');
                        }
                        
                        return product.stock_quantity <= 0 ? t('pos.out_of_stock') : t('pos.add_to_cart');
                      })()}
                    </Button>
                  )}
                  
                  {/* For products with multiple units, show instruction */}
                  {product.available_units && product.available_units.length > 1 && (
                    <div className="unit-instruction">
                      <p>Click card or select unit to add to cart</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Cart and Checkout */}
        <div className="pos-cart">
          <div className="cart-header">
            <h2>Shopping Cart</h2>
            {cart.length > 0 && (
              <Button variant="outline" size="small" onClick={clearCart}>
                Clear Cart
              </Button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Cart is empty</p>
                <p className="empty-cart-hint">Add items from the product list to start a sale</p>
              </div>
            ) : (
              <>
                <div className="cart-table-header">
                  <div className="header-product">Product</div>
                  <div className="header-unit">Unit</div>
                  <div className="header-price">Price</div>
                  <div className="header-quantity">Qty</div>
                  <div className="header-total">Total</div>
                  <div className="header-actions">Actions</div>
                </div>
                {cart.map(item => (
                  <div key={`${item.id}-${item.unit_id}-${item.price_mode}`} className="cart-item">
                    <div className="item-product">
                      <h4>{item.name}</h4>
                      <p className="item-sku">SKU: {item.sku}</p>
                      <span className={`price-mode-badge ${item.price_mode}`}>
                        {item.price_mode === 'wholesale' ? t('pos.wholesale_short') : t('pos.standard_short')}
                      </span>
                    </div>
                    <div className="item-unit">
                      {item.unit_symbol || 'piece'}
                    </div>
                    <div className="item-price">
                      {parseFloat(item.unit_price).toFixed(2)} MGA
                    </div>
                    <div className="item-quantity">
                      <div className="quantity-controls">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.unit_id, item.quantity - 1, item.price_mode)}
                        >
                          -
                        </Button>
                        {editingQuantity === `${item.id}-${item.unit_id}` ? (
                          <div className="quantity-edit">
                            <input
                              type="number"
                              value={tempQuantity}
                              onChange={handleQuantityChange}
                              onKeyPress={(e) => handleQuantityKeyPress(e, item)}
                              onBlur={() => handleQuantitySubmit(item)}
                              className="quantity-input"
                              min="0"
                              max={item.stock_quantity}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span 
                            className="quantity clickable"
                            onClick={() => handleQuantityClick(item)}
                            title={t('alerts.click_to_edit_quantity')}
                          >
                            {item.quantity}
                          </span>
                        )}
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.unit_id, item.quantity + 1, item.price_mode)}
                          disabled={(() => {
                            // Skip stock validation for pending sales since stock won't be removed until completion
                            if (saleMode === 'pending') {
                              return false; // Always allow for pending sales
                            }
                            
                            const updatedStockInfo = getUpdatedStockAvailability(item.id);
                            const unitStockInfo = updatedStockInfo?.find(u => u.id === item.unit_id);
                            const currentCartQuantity = cart
                              .filter(cartItem => cartItem.id === item.id && cartItem.unit_id === item.unit_id && cartItem.price_mode === item.price_mode)
                              .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
                            const maxAllowed = (unitStockInfo?.available_quantity || 0) + currentCartQuantity;
                            return item.quantity >= maxAllowed;
                          })()}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="item-total">
                      {(item.quantity * item.unit_price).toFixed(2)} MGA
                    </div>
                    <div className="item-actions">
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => removeFromCart(item.id, item.unit_id, item.price_mode)}
                        title={t('alerts.remove_item')}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Total Amount:</span>
                  <span>{calculateSubtotal().toFixed(2)} MGA</span>
                </div>
                <div className="summary-row cost-breakdown">
                  <span>Cost (excl. tax):</span>
                  <span>{calculateCost().toFixed(2)} MGA</span>
                </div>
                <div className="summary-row tax-breakdown">
                  <span>Tax included:</span>
                  <span>{calculateTax().toFixed(2)} MGA</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>{calculateSubtotal().toFixed(2)} MGA</span>
                </div>
              </div>

              <form className="checkout-form">
              <div className="customer-info">
                <h3>Customer Information</h3>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder={paymentType === 'partial' ? t('pos.customer_name_required') : t('pos.customer_name_optional')}
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className={paymentType === 'partial' && !customerInfo.name ? 'required-field' : ''}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="tel"
                    placeholder={t('pos.phone_optional')}
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder={t('pos.email_optional')}
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="payment-section">
                <h3>Payment Method</h3>
                <div className="payment-methods">
                  {['cash', 'card', 'mobile_money', 'bank_transfer'].map(method => (
                    <label key={method} className="payment-method">
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      <span>{method.replace('_', ' ').toUpperCase()}</span>
                    </label>
                  ))}
                </div>
                
                <h3>Payment Type</h3>
                <div className="payment-types">
                  <label className="payment-type">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={paymentType === 'full'}
                      onChange={(e) => setPaymentType(e.target.value)}
                    />
                    <span>Full Payment (100%)</span>
                  </label>
                  <label className="payment-type">
                    <input
                      type="radio"
                      name="paymentType"
                      value="partial"
                      checked={paymentType === 'partial'}
                      onChange={(e) => setPaymentType(e.target.value)}
                    />
                    <span>Partial Payment (0-99.99%)</span>
                  </label>
                </div>
                
                {paymentType === 'partial' && (
                  <div className="form-group">
                    <label>Amount to Pay</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={calculateTotal()}
                      value={paidAmount || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setPaidAmount(value);
                      }}
                      placeholder={t('forms.enter_amount_to_pay')}
                    />
                    <small>Total: ${calculateTotal().toFixed(2)} | Remaining: ${(calculateTotal() - (paidAmount || 0)).toFixed(2)}</small>
                  </div>
                )}
              </div>
              </form>

              <div className="checkout-actions">
                <Button
                  onClick={handleCheckout}
                  loading={processing}
                  className="validate-button"
                  size="large"
                  variant="primary"
                  disabled={cart.length === 0}
                >
                  {saleMode === 'complete' ? t('pos.complete_sale') : t('pos.create_pending_sale')}
                  {printReceipt && t('pos.print_receipt')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointOfSale;
