import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import PackagingManager from '../components/PackagingManager';
import { 
  isMobileDevice,
  openPrintWindow,
  openPrintPreview,
  downloadReceiptFile,
  generateXprinterPrintContent,
  generateMobilePrintContent,
  generatePrintContent
} from '../utils/printUtils';
import './PointOfSale.css';

const PointOfSale = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Store all products for client-side filtering
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products for display
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('full'); // 'full' or 'partial'
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true); // Separate state for initial load
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stockAvailability, setStockAvailability] = useState({});
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoryUpdating, setCategoryUpdating] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });
  const [searchInput, setSearchInput] = useState(''); // Separate state for search input
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [tempQuantity, setTempQuantity] = useState('');
  const [selectedUnits, setSelectedUnits] = useState({}); // Track selected unit for each product
  const searchInputRef = useRef(null); // Ref for search input
  const filtersRef = useRef(filters); // Ref to store current filters
  const searchTimeoutRef = useRef(null); // Ref for search timeout
  const categoriesRef = useRef(categories); // Ref to store current categories
  const categoriesLoadedRef = useRef(categoriesLoaded); // Ref to store categories loaded state

  // Update refs whenever state changes
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    categoriesLoadedRef.current = categoriesLoaded;
  }, [categoriesLoaded]);

  // Client-side filtering function
  const applyClientSideFilters = useCallback((productsToFilter, searchTerm = '', categoryId = '') => {
    let filtered = [...productsToFilter];

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categoryId && categoryId !== '') {
      const categoryIdNum = parseInt(categoryId);
      filtered = filtered.filter(product => {
        // Check different ways category might be stored
        if (product.category_name) {
          const category = categoriesRef.current.find(cat => cat.name === product.category_name);
          return category && category.id === categoryIdNum;
        } else if (product.category && typeof product.category === 'number') {
          return product.category === categoryIdNum;
        } else if (product.category && product.category.id) {
          return product.category.id === categoryIdNum;
        }
        return false;
      });
    }

    return filtered;
  }, []);

  // Effect to apply client-side filtering when allProducts, search, or category changes
  useEffect(() => {
    if (allProducts.length > 0) {
      const filtered = applyClientSideFilters(allProducts, searchInput, filters.category);
      setFilteredProducts(filtered);
      setProducts(filtered); // Keep products state for backward compatibility
    }
  }, [allProducts, searchInput, filters.category, applyClientSideFilters]);

  // Function to sync session storage with categories state
  const syncSessionStorage = useCallback(() => {
    const sellableStatus = {};
    categories.forEach(cat => {
      sellableStatus[cat.id] = cat.is_sellable;
    });
    sessionStorage.setItem('sellableCategories', JSON.stringify(sellableStatus));
  }, [categories]);

  // Sync session storage whenever categories change
  useEffect(() => {
    if (categories.length > 0) {
      syncSessionStorage();
    }
  }, [categories, syncSessionStorage]);

  // Handle case where filters are cleared but categories aren't loaded yet
  useEffect(() => {
    if (categoriesLoadedRef.current && categoriesRef.current.length > 0 && filtersRef.current.category === '' && filtersRef.current.search === '') {
      fetchProducts(filtersRef.current);
    }
  }, [categoriesLoaded, categories.length, filters]);

  const [showSellableToggle, setShowSellableToggle] = useState(false); // Show/hide sellable toggle
  const [priceMode, setPriceMode] = useState('standard'); // 'standard' or 'wholesale'
  const [saleMode, setSaleMode] = useState('complete'); // 'complete' or 'pending'
  const [printReceipt, setPrintReceipt] = useState(true); // true or false
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 24;
  
  // Packaging state
  const [packagingCart, setPackagingCart] = useState([]);
  const [showPackagingManager, setShowPackagingManager] = useState(false);

  const handlePrintReceipt = async (printData, title = 'Sale Receipt', usePreview = false) => {
    try {
      // Validate data structure
      if (!printData) {
        console.error('No data provided for printing');
        window.alert('No data available to print.');
        return false;
      }

      const isMobile = isMobileDevice();
      
      // Generate optimized content for thermal printers
      // const printContent = generateThermalOptimizedContent(printData, title, 'sale');
      const printContent = generatePrintContent(printData, title, 'sale');

      // Handle print preview
      if (usePreview) {
        const previewSuccess = openPrintPreview(printContent, title);
        if (previewSuccess) {
          return true;
        } else {
          throw new Error('Failed to open print preview window.');
        }
      }

      // Use mobile-friendly printing for mobile devices
      if (isMobile) {
        // Try direct print window for mobile
        const success = await openPrintWindow(printContent, title);
        if (!success) {
          // If mobile printing fails, offer receipt app option
          const useReceiptApp = window.confirm('Mobile printing failed. Would you like to download a file for receipt printer apps instead?');
          if (useReceiptApp) {
            const downloadSuccess = downloadReceiptFile(printData, title);
            if (downloadSuccess) {
              window.alert('Receipt file downloaded! You can now open it with any receipt printer app to print directly to your Xprinter.');
              return true;
            }
          }
          throw new Error('Mobile printing failed. Please try again or check your printer connection.');
        }
        return true;
      } else {
        // Desktop printing - use direct thermal printing method
        const success = await printThermalReceipt(printContent, title);
        if (!success) {
          // Fallback to preview
          const previewSuccess = openPrintPreview(printContent, title);
          if (!previewSuccess) {
            throw new Error('Failed to print receipt. Please try print preview instead.');
          }
        }
        return true;
      }
      
    } catch (error) {
      console.error('Print error:', error);
      window.alert('Failed to print receipt. Please try print preview or check your printer settings.');
      return false;
    }
  };

  const printThermalReceipt = (printContent, title) => {
    return new Promise((resolve) => {
      try {
        // Create a hidden iframe for printing
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        printFrame.style.visibility = 'hidden';
        
        document.body.appendChild(printFrame);
        
        let printDocument = printFrame.contentWindow || printFrame.contentDocument;
        if (printDocument.document) {
          printDocument = printDocument.document;
        }
        
        // Write the content to the iframe
        printDocument.open();
        printDocument.write(printContent);
        printDocument.close();
        
        // Wait for content to load then trigger print
        const printTimeout = setTimeout(() => {
          try {
            printFrame.contentWindow.focus();
            
            // Use a longer timeout to ensure CSS is applied
            setTimeout(() => {
              printFrame.contentWindow.print();
              
              // Clean up
              setTimeout(() => {
                if (document.body.contains(printFrame)) {
                  document.body.removeChild(printFrame);
                }
                resolve(true);
              }, 1000);
            }, 500);
          } catch (printError) {
            console.error('Print error:', printError);
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
            resolve(false);
          }
        }, 1000);
        
        // Fallback if onload doesn't fire
        printFrame.onload = function() {
          clearTimeout(printTimeout);
          try {
            printFrame.contentWindow.focus();
            setTimeout(() => {
              printFrame.contentWindow.print();
              setTimeout(() => {
                if (document.body.contains(printFrame)) {
                  document.body.removeChild(printFrame);
                }
                resolve(true);
              }, 1000);
            }, 500);
          } catch (error) {
            console.error('Print error:', error);
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
            resolve(false);
          }
        };
        
      } catch (error) {
        console.error('Print setup error:', error);
        resolve(false);
      }
    });
  };

  // Update the print preview button in the checkout actions
  const handlePrintPreview = async () => {
    const printData = preparePrintData(`PREVIEW-${Date.now()}`, saleMode === 'pending' ? 'pending' : 'completed');
    await handlePrintReceipt(printData, t('titles.sale_receipt'), true);
  };

  // Function to get the current price based on price mode
  const getCurrentPrice = (product) => {
    if (priceMode === 'wholesale' && product.wholesale_price) {
      return parseFloat(product.wholesale_price);
    }
    return parseFloat(product.price);
  };

  // Calculate total amount (products only, excluding packaging)
  const calculateTotal = () => {
    const cartTotal = cart.reduce((total, item) => {
      const unitPrice = item.unit_price || 0;
      return total + (unitPrice * item.quantity);
    }, 0);
    return cartTotal;
  };

  // Calculate total amount including packaging (for display purposes)
  const calculateTotalWithPackaging = () => {
    const cartTotal = cart.reduce((total, item) => {
      const unitPrice = item.unit_price || 0;
      return total + (unitPrice * item.quantity);
    }, 0);
    const packagingTotal = calculatePackagingTotal();
    return cartTotal + packagingTotal;
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
  }, [paymentType, cart, packagingCart]);

  // Function to get the current price for a specific unit using new pricing structure
  const getCurrentUnitPrice = (product, unitStockInfo) => {
    if (!unitStockInfo) return 0;
    
    // If we're in standard mode, use standard prices
    if (priceMode === 'standard') {
      // Check if this unit has unit-specific standard price
      if (unitStockInfo.unit_specific_standard_price) {
        return unitStockInfo.unit_specific_standard_price;
      }
      
      // Use the first available standard price from the product's standard prices list
      if (product.standard_prices_list && product.standard_prices_list.length > 0) {
        return product.standard_prices_list[0];
      }
      
      // Fallback to legacy price
      return unitStockInfo.price || 0;
    }
    
    // If we're in wholesale mode, use wholesale prices
    if (priceMode === 'wholesale') {
      // Check if this unit has unit-specific wholesale price
      if (unitStockInfo.unit_specific_wholesale_price) {
        return unitStockInfo.unit_specific_wholesale_price;
      }
      
      // Use the main wholesale price
      if (product.wholesale_price) {
        return parseFloat(product.wholesale_price);
      }
      
      // Fallback to legacy wholesale calculation
      if (product.wholesale_price && product.price) {
        const standardBasePrice = parseFloat(product.price);
        const wholesaleBasePrice = parseFloat(product.wholesale_price);
        
        if (standardBasePrice > 0) {
          const wholesaleConversionFactor = wholesaleBasePrice / standardBasePrice;
          return standardBasePrice * wholesaleConversionFactor;
        }
      }
    }
    
    // Fallback to standard price
    return unitStockInfo.price || 0;
  };

  useEffect(() => {
    const initializeData = async () => {
      // Load categories first
      await fetchCategories();
      // Load all products immediately after categories are loaded
      await fetchProducts({});
      // Set initial loading to false after everything is loaded
      setInitialLoading(false);
    };
    initializeData();
  }, []);

  // Re-apply sellable filtering when categories are loaded
  useEffect(() => {
    if (categoriesLoaded && allProducts.length > 0) {
      // Re-apply sellable filtering to all products
      const sellableProducts = allProducts.filter(product => {
        let isSellable = false;
        
        // If product has category_name, find the category in our categories list
        if (product.category_name) {
          const category = categoriesRef.current.find(cat => cat.name === product.category_name);
          isSellable = category ? category.is_sellable : false;
        }
        // If product has category ID, find the category in our categories list
        else if (product.category && typeof product.category === 'number') {
          const category = categoriesRef.current.find(cat => cat.id === product.category);
          isSellable = category ? category.is_sellable : false;
        }
        // If product has category object with ID, find the category in our categories list
        else if (product.category && product.category.id) {
          const category = categoriesRef.current.find(cat => cat.id === product.category.id);
          isSellable = category ? category.is_sellable : false;
        }
        // If no category information, exclude the product (safer approach)
        else {
          isSellable = false;
        }
        
        return isSellable;
      });
      
      // Update allProducts with sellable filtering
      setAllProducts(sellableProducts);
    }
  }, [categoriesLoaded, allProducts.length]);

  // Search effect - now only updates filters state, no database calls
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only set timeout if searchInput is not empty or if it was cleared
    if (searchInput !== '') {
      searchTimeoutRef.current = setTimeout(() => {
        const newFilters = { ...filtersRef.current, search: searchInput };
        setFilters(newFilters);
        // No fetchProducts call - client-side filtering will handle this
      }, 300); // Reduced debounce time since it's now client-side
    } else if (filtersRef.current.search !== '') {
      // If search input is cleared, immediately update filters
      const newFilters = { ...filtersRef.current, search: '' };
      setFilters(newFilters);
      // No fetchProducts call - client-side filtering will handle this
    }

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]); // Only depend on searchInput to prevent re-renders

  useEffect(() => {
    // Fetch stock availability for ALL products in bulk to improve performance
    if (allProducts.length > 0) {
      fetchBulkStockAvailability();
    }
    
    // Set default selected units (default unit first, then base unit) for products with multiple compatible units
    const defaultUnits = {};
    allProducts.forEach(product => {
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
  }, [allProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBulkStockAvailability = async () => {
    try {
      const productIds = allProducts.map(product => product.id);
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
      // Fallback to individual calls if bulk fails
      allProducts.forEach(product => {
        fetchStockAvailability(product.id);
      });
    }
  };

  const refreshStockAvailability = () => {
    // Use bulk fetch for better performance
    if (allProducts.length > 0) {
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

  // const fetchProducts = useCallback(async (filterParams = {}) => {
  //   try {
  //     setLoading(true);
  //     const params = new URLSearchParams();
      
  //     // Add filters to params
  //     if (filterParams.category) params.append('category', filterParams.category);
  //     if (filterParams.search) params.append('search', filterParams.search);
      
  //     // Use the regular products API
  //     const baseUrl = `/api/products/${params.toString() ? '?' + params.toString() : ''}`;
  //     const response = await api.get(baseUrl);
      
  //     // Handle both paginated and non-paginated responses
  //     let allProducts = [];
  //     const data = response.data;
  //     if (data.results) {
  //       // Paginated response - fetch all pages
  //       allProducts = data.results;
  //       let nextUrl = data.next;
  //       while (nextUrl) {
  //         // Extract the path from the full URL for the API call
  //         const url = new URL(nextUrl);
  //         const path = url.pathname + url.search;
  //         const nextResponse = await api.get(path);
  //         const nextData = nextResponse.data;
  //         allProducts = [...allProducts, ...nextData.results];
  //         nextUrl = nextData.next;
  //       }
  //     } else if (Array.isArray(data)) {
  //       // Direct array response
  //       allProducts = data;
  //     }
      
  //     // Filter for sellable products (is_active = true and stock > 0 for complete sales)
  //     const sellableProducts = allProducts.filter(product => {
  //       if (!product.is_active) return false;
  //       // if (saleMode === 'complete' && product.stock_quantity <= 0) return false;
  //       return true;
  //     });
      
  //     setProducts(sellableProducts);
  //     setCurrentPage(1);
  //   } catch (err) {
  //     setError('Failed to load products');
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [saleMode]); // Only depend on saleMode

  const fetchProducts = useCallback(async (filterParams = {}) => {
    try {
      // Only show loading for initial load or category changes, not for search
      if (allProducts.length === 0) {
        setInitialLoading(true);
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      
      // Always filter for active products
      params.append('is_active', 'true');
      
      // Only add category filter to API call, not search (search is now client-side)
      if (filterParams.category) params.append('category', filterParams.category);
      
      const baseUrl = `/api/products/${params.toString() ? '?' + params.toString() : ''}`;
      let response = await api.get(baseUrl);
      let aggregatedProducts = Array.isArray(response.data.results) ? response.data.results : (Array.isArray(response.data) ? response.data : []);
      
      // Follow pagination to get all products (DRF-style "next" links)
      let nextUrl = response.data.next;
      while (nextUrl) {
        // Support absolute or relative next URLs
        response = await api.get(nextUrl);
        const pageItems = Array.isArray(response.data.results) ? response.data.results : (Array.isArray(response.data) ? response.data : []);
        aggregatedProducts = aggregatedProducts.concat(pageItems);
        nextUrl = response.data.next;
      }
      
      const fetchedProducts = aggregatedProducts;
      
      // If categories are not loaded yet, store products but don't filter yet
      if (categoriesRef.current.length === 0 || !categoriesLoadedRef.current) {
        setAllProducts(fetchedProducts);
        // Apply client-side filtering immediately even without categories
        const filtered = applyClientSideFilters(fetchedProducts, searchInput, filters.category);
        setFilteredProducts(filtered);
        setProducts(filtered);
        return;
      }
      
      // ALWAYS filter out products from non-sellable categories
      const sellableProducts = fetchedProducts.filter(product => {
        let isSellable = false;
        
        // If product has category_name, find the category in our categories list
        if (product.category_name) {
          const category = categoriesRef.current.find(cat => cat.name === product.category_name);
          isSellable = category ? category.is_sellable : false; // Default to false if category not found (safer)
        }
        // If product has category ID, find the category in our categories list
        else if (product.category && typeof product.category === 'number') {
          const category = categoriesRef.current.find(cat => cat.id === product.category);
          isSellable = category ? category.is_sellable : false; // Default to false if category not found (safer)
        }
        // If product has category object with ID, find the category in our categories list
        else if (product.category && product.category.id) {
          const category = categoriesRef.current.find(cat => cat.id === product.category.id);
          isSellable = category ? category.is_sellable : false; // Default to false if category not found (safer)
        }
        // If no category information, exclude the product (safer approach)
        else {
          isSellable = false;
        }
        
        return isSellable;
      });

      // Additional check: if a specific category is selected, ensure it's sellable
      if (filterParams.category) {
        const selectedCategory = categoriesRef.current.find(cat => cat.id === parseInt(filterParams.category));
        if (selectedCategory && !selectedCategory.is_sellable) {
          // If selected category is not sellable, return empty array
          setAllProducts([]);
          return;
        }
      }
      
      // Store all sellable products for client-side filtering
      setAllProducts(sellableProducts);
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [allProducts.length]); // Add allProducts.length as dependency

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/api/products/categories/');
      let categoriesData = response.data.results || response.data;
      
      // Load session-based sellable status from sessionStorage
      const sellableStatus = JSON.parse(sessionStorage.getItem('sellableCategories') || '{}');
      
      // Apply session-based sellable status
      categoriesData = categoriesData.map(cat => {
        const isSellable = sellableStatus.hasOwnProperty(cat.id) ? sellableStatus[cat.id] : cat.is_sellable;
        return {
          ...cat,
          is_sellable: isSellable
        };
      });
      
      setCategories(categoriesData);
      setCategoriesLoaded(true);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []); // No dependencies needed for fetchCategories

  const toggleCategorySellable = useCallback(async (categoryId, currentStatus) => {
    try {
      setCategoryUpdating(true);
      const newStatus = !currentStatus;
      
      // Update session storage
      const sellableStatus = JSON.parse(sessionStorage.getItem('sellableCategories') || '{}');
      sellableStatus[categoryId] = newStatus;
      sessionStorage.setItem('sellableCategories', JSON.stringify(sellableStatus));
      
      // Update categories state immediately for UI feedback
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === categoryId ? { ...cat, is_sellable: newStatus } : cat
        )
      );
      
      // Immediately refetch products to apply the new filter
      fetchProducts(filters); // Don't await - let it run in background for immediate UI response
      
      // Reset updating state after a short delay
      setTimeout(() => setCategoryUpdating(false), 500);
    } catch (err) {
      setError('Failed to update category status');
      console.error('Category toggle error:', err);
      setCategoryUpdating(false);
    }
  }, [categories]); // Only depend on categories

  const resetAllCategoriesToSellable = useCallback(async () => {
    try {
      setCategoryUpdating(true);
      
      // Create a sellable status object with all categories set to true
      const allSellableStatus = {};
      categoriesRef.current.forEach(cat => {
        allSellableStatus[cat.id] = true;
      });
      
      // Save to session storage
      sessionStorage.setItem('sellableCategories', JSON.stringify(allSellableStatus));
      
      // Update categories state immediately
      setCategories(prevCategories => 
        prevCategories.map(cat => ({ ...cat, is_sellable: true }))
      );
      
      // Immediately refetch products to apply the new filter
      fetchProducts(filters); // Don't await - let it run in background for immediate UI response
      
      setSuccess('All categories have been set to sellable');
      
      // Reset updating state after a short delay
      setTimeout(() => setCategoryUpdating(false), 500);
    } catch (err) {
      setError('Failed to reset categories');
      console.error('Category reset error:', err);
      setCategoryUpdating(false);
    }
  }, [categories]); // Only depend on categories

  const fetchStockAvailability = async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}/stock-availability/`);
      setStockAvailability(prev => ({
        ...prev,
        [productId]: response.data.available_units
      }));
    } catch (err) {
    }
  };

  const addToCart = (product, selectedUnit = null, customPrice = null) => {
    
    // Use the first available unit if none selected
    let unit = selectedUnit;
    if (!unit && product.available_units && product.available_units[0]) {
      const availableUnit = product.available_units[0];
      unit = {
        id: availableUnit.id,
        name: availableUnit.name,
        symbol: availableUnit.symbol
      };
    }
    if (!unit) {
      unit = { id: product.base_unit?.id || product.base_unit, name: 'Piece', symbol: 'piece' };
    }
    
    // Skip stock validation for pending sales since stock won't be removed until completion
    if (saleMode === 'complete') {
      // Check if stock availability data is loaded
      if (!stockAvailability[product.id]) {
        setError('Loading stock information... Please try again.');
        return;
      }

      // Check updated stock availability for the selected unit
      const updatedStockInfo = getUpdatedStockAvailability(product.id);
      const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
      
      
      if (!unitStockInfo) {
        setError(`Unit ${unit.name} not found in stock information`);
        return;
      }
      
      if (!unitStockInfo.is_available) {
        setError(`${unit.name} is out of stock`);
        return;
      }
      
      // Check if there's enough stock for the selected unit
      if (unitStockInfo.available_quantity <= 0) {
        setError(`No ${unit.name} stock left`);
        return;
      }
    }
    
    // Calculate the price first to use in the existing item check
    const availableUnit = product.available_units?.find(u => u.id === unit.id);
    let unitPrice = 0;
    
    if (customPrice) {
      // Use custom price if provided (for standard price selection)
      unitPrice = parseFloat(customPrice);
    } else if (availableUnit) {
      if (priceMode === 'standard') {
        // For standard mode, only use base unit price (no compatible units in standard mode)
        unitPrice = parseFloat(product.price || 0);
      } else {
        // For wholesale mode, use unit-specific wholesale price or calculated price from base unit
        if (availableUnit.unit_specific_wholesale_price) {
          unitPrice = availableUnit.unit_specific_wholesale_price;
        } else {
          // Calculate wholesale price based on conversion factor
          const baseWholesalePrice = parseFloat(product.wholesale_price || 0);
          if (availableUnit.conversion_factor && availableUnit.conversion_factor > 0) {
            unitPrice = baseWholesalePrice * availableUnit.conversion_factor;
          } else {
            unitPrice = baseWholesalePrice;
          }
        }
      }
    }
    
    const existingItem = cart.find(item => 
      item.id === product.id && 
      item.unit_id === unit.id && 
      item.price_mode === priceMode &&
      item.unit_price === unitPrice
    );
    
    // Update cart first
    if (existingItem) {
      // Check if adding 1 more would exceed available quantity (only for complete sales)
      if (saleMode === 'complete') {
        const updatedStockInfo = getUpdatedStockAvailability(product.id);
        const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
        if (unitStockInfo && existingItem.quantity + 1 > unitStockInfo.available_quantity) {
          setError(`Not enough ${unit.name} available. Only ${unitStockInfo.available_quantity} left.`);
          return;
        }
      }
      setCart(prevCart => prevCart.map(item =>
        item.id === product.id && item.unit_id === unit.id && item.price_mode === priceMode && item.unit_price === unitPrice
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Check if adding 1 would exceed available quantity (only for complete sales)
      if (saleMode === 'complete') {
        const updatedStockInfo = getUpdatedStockAvailability(product.id);
        const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
        if (unitStockInfo && 1 > unitStockInfo.available_quantity) {
          setError(`Not enough ${unit.name} available. Only ${unitStockInfo.available_quantity} left.`);
          return;
        }
      }
      
      const newCartItem = {
        ...product,
        quantity: 1,
        unit_id: unit.id,
        unit_name: unit.name,
        unit_symbol: unit.symbol,
        unit_price: unitPrice,
        price_mode: priceMode
      };
      setCart(prevCart => [...prevCart, newCartItem]);
    }

    // Automatically add packaging if product has packaging - use setTimeout to ensure cart is updated first
    if (product.has_packaging && product.packaging_price) {
      setTimeout(() => {
        addPackagingAutomatically(product, unit);
      }, 0);
    }
    
    setError('');
  };

  const updateQuantity = (productId, unitId, quantity, priceMode = null) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)));
      // Also remove packaging if sales item is removed
      setPackagingCart(packagingCart.filter(item => item.id !== productId));
    } else {
      // Skip stock validation for pending sales since stock won't be removed until completion
      if (saleMode === 'complete') {
        // Check updated stock availability for the selected unit
        const updatedStockInfo = getUpdatedStockAvailability(productId);
        const unitStockInfo = updatedStockInfo?.find(u => u.id === unitId);
        
        if (!unitStockInfo || !unitStockInfo.is_available) {
          setError(`Unit is out of stock`);
          return;
        }
        
        // For updateQuantity, we need to consider the current cart quantity
        const currentCartQuantity = cart
          .filter(item => item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        // Calculate how much we can add (available + what's already in cart)
        const maxAllowed = unitStockInfo.available_quantity + currentCartQuantity;
        
        if (quantity > maxAllowed) {
          setError(`Not enough stock available. Max: ${maxAllowed}`);
          return;
        }
      }
      
      setCart(cart.map(item =>
        item.id === productId && item.unit_id === unitId && item.price_mode === priceMode
          ? { ...item, quantity }
          : item
      ));

      // Update packaging quantity automatically if product has packaging
      const product = products.find(p => p.id === productId);
      if (product && product.has_packaging && product.packaging_price) {
        const unit = { id: unitId };
        updatePackagingQuantityAutomatically(product, unit, quantity);
      }
      
      setError('');
    }
  };

  const removeFromCart = (productId, unitId, priceMode = null) => {
    setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)));
  };

  // Packaging functions
  const addPackagingAutomatically = (product, unit) => {
    if (!product.has_packaging || !product.packaging_price) {
      return;
    }

    // Use a callback to get the current cart state
    setCart(currentCart => {
      // Calculate packaging quantity based on sales quantity
      const salesItem = currentCart.find(item => 
        item.id === product.id && 
        item.unit_id === unit.id && 
        item.price_mode === priceMode
      );
      
      if (!salesItem) return currentCart;

      // Get unit information from stock availability
      const updatedStockInfo = getUpdatedStockAvailability(product.id);
      const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
      
      // For packaging, we use the base unit (pieces) to calculate quantity
      // If the sales unit is not the base unit, we need to convert to pieces
      let packagingQuantity = salesItem.quantity;
      
      // If the sales unit is not the base unit, convert to pieces
      if (unitStockInfo && !unitStockInfo.is_base_unit && unitStockInfo.conversion_factor) {
        packagingQuantity = salesItem.quantity * unitStockInfo.conversion_factor;
      }

      // Update packaging cart
      setPackagingCart(currentPackagingCart => {
        const existingPackaging = currentPackagingCart.find(item => item.id === product.id);
        if (existingPackaging) {
          // Update existing packaging quantity to match sales quantity
          return currentPackagingCart.map(item =>
            item.id === product.id
              ? { 
                  ...item, 
                  quantity: packagingQuantity,
                  total_price: parseFloat(product.packaging_price) * packagingQuantity
                }
              : item
          );
        } else {
          // Create new packaging item
          const newPackagingItem = {
            ...product,
            quantity: packagingQuantity,
            unit_price: parseFloat(product.packaging_price),
            total_price: parseFloat(product.packaging_price) * packagingQuantity,
            status: 'consignation', // Default status
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            sales_unit_id: unit.id, // Track which sales unit this packaging is for
            sales_unit_name: unit.name,
            sales_unit_symbol: unit.symbol
          };
          return [...currentPackagingCart, newPackagingItem];
        }
      });

      return currentCart;
    });
  };

  const addToPackagingCart = (product) => {
    if (!product.has_packaging || !product.packaging_price) {
      setError('This product does not have packaging consignation');
      return;
    }

    const existingPackaging = packagingCart.find(item => item.id === product.id);
    if (existingPackaging) {
      setPackagingCart(packagingCart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newPackagingItem = {
        ...product,
        quantity: 1,
        unit_price: parseFloat(product.packaging_price),
        total_price: parseFloat(product.packaging_price),
        status: 'consignation',
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone
      };
      setPackagingCart([...packagingCart, newPackagingItem]);
    }
    setError('');
  };

  const updatePackagingQuantityAutomatically = (product, unit, salesQuantity) => {
    if (!product.has_packaging || !product.packaging_price) {
      return;
    }

    // Get unit information from stock availability
    const updatedStockInfo = getUpdatedStockAvailability(product.id);
    const unitStockInfo = updatedStockInfo?.find(u => u.id === unit.id);
    
    // Calculate packaging quantity based on sales quantity
    let packagingQuantity = salesQuantity;
    
    // If the sales unit is not the base unit, convert to pieces
    if (unitStockInfo && !unitStockInfo.is_base_unit && unitStockInfo.conversion_factor) {
      packagingQuantity = salesQuantity * unitStockInfo.conversion_factor;
    }

    setPackagingCart(currentPackagingCart => {
      const existingPackaging = currentPackagingCart.find(item => item.id === product.id);
      if (existingPackaging) {
        // Update existing packaging quantity to match sales quantity
        return currentPackagingCart.map(item =>
          item.id === product.id
            ? { 
                ...item, 
                quantity: packagingQuantity,
                total_price: parseFloat(product.packaging_price) * packagingQuantity
              }
            : item
        );
      } else {
        // Create new packaging item if it doesn't exist
        const newPackagingItem = {
          ...product,
          quantity: packagingQuantity,
          unit_price: parseFloat(product.packaging_price),
          total_price: parseFloat(product.packaging_price) * packagingQuantity,
          status: 'consignation', // Default status
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          sales_unit_id: unit.id,
          sales_unit_name: unit.name,
          sales_unit_symbol: unit.symbol
        };
        return [...currentPackagingCart, newPackagingItem];
      }
    });
  };

  const updatePackagingQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setPackagingCart(packagingCart.filter(item => item.id !== productId));
    } else {
      setPackagingCart(packagingCart.map(item =>
        item.id === productId
          ? { ...item, quantity, total_price: item.unit_price * quantity }
          : item
      ));
    }
  };

  const updatePackagingStatus = (productId, status) => {
    setPackagingCart(packagingCart.map(item =>
      item.id === productId
        ? { ...item, status }
        : item
    ));
  };

  const removeFromPackagingCart = (productId) => {
    setPackagingCart(packagingCart.filter(item => item.id !== productId));
  };

  const calculatePackagingTotal = () => {
    return packagingCart.reduce((total, item) => {
      // Only "consignation" (paid) packaging should be included in the total
      // "exchange" and "due" packaging are not payable
      if (item.status === 'consignation') {
        return total + (item.total_price || 0);
      }
      return total;
    }, 0);
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

  // Prepare print data for printing
  const preparePrintData = (saleNumber, saleStatus = 'completed') => {
    const total = calculateSubtotal();
    const remaining = total - paidAmount;
    
    return {
      sale_number: saleNumber,
      customer_name: customerInfo.name || 'Walk-in Customer',
      customer_phone: customerInfo.phone || '',
      customer_email: customerInfo.email || '',
      user_name: user?.username || 'Unknown User',
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
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError(t('pos.cart_empty'));
      return;
    }

    setProcessing(true);
    setError('');

    // Validate customer name for partial payments
    if ((saleMode !== 'complete' || paymentType === 'partial') && (!customerInfo.name || !customerInfo.name.trim())) {
      setError('Customer name is required for partial/uncompleted payments');
      setProcessing(false);
      return;
    }

    // Validate paid amount
    const total = calculateTotal();
    if (paidAmount > total) {
      setError('Paid amount cannot exceed the total amount');
      setProcessing(false);
      return;
    }

    if (paidAmount < 0) {
      setError('Paid amount cannot be negative');
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
        }),
        packaging_items: packagingCart.map(item => ({
          product: item.id,
          quantity: parseFloat(item.quantity),
          unit: 7, // Use the correct piece unit ID (7) for packaging
          unit_price: parseFloat(item.unit_price),
          status: item.status || 'consignation',
          customer_name: item.customer_name || customerInfo.name,
          customer_phone: item.customer_phone || customerInfo.phone,
          notes: item.notes || ''
        }))
      };

      // Create the sale
      const response = await api.post('/api/sales/', saleData);
      const saleId = response.data.id;
      const saleNumber = response.data.sale_number;
      
      if (saleMode === 'complete') {
        // Complete the sale immediately
        try {
          const completionResponse = await api.post(`/api/sales/${saleId}/complete/`);
          
          // Auto-print the receipt after successful sale completion (only if printReceipt is true)
          if (printReceipt) {
            // Use the improved printing logic for completed sale
            const printData = preparePrintData(saleNumber, 'completed');
            await handlePrintReceipt(printData, t('titles.sale_receipt'));
          }
      
          // Clear cart and customer info
          setCart([]);
          setPackagingCart([]);
          setCustomerInfo({ name: '', phone: '', email: '' });
          setPaidAmount(0);
      
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
          
          // Show success message with packaging transaction info if created
          let successMessage = `Sale completed successfully! Sale Number: ${saleNumber}`;
          if (completionResponse.data.packaging_transaction) {
            const pkgTransaction = completionResponse.data.packaging_transaction;
            successMessage += `\n\nPackaging transaction automatically created:\nTransaction: ${pkgTransaction.transaction_number}\nAmount: ${pkgTransaction.total_amount} MGA`;
          }
          alert(successMessage);
        } catch (completeError) {
          // Sale was created but completion failed
          setError(`Sale created (${saleNumber}) but completion failed: ${completeError.response?.data?.error || completeError.message}`);
          
          // Still clear the cart since the sale was created
          setCart([]);
          setPackagingCart([]);
          setCustomerInfo({ name: '', phone: '', email: '' });
          setPaidAmount(0);
          
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
          // Use the improved printing logic for pending sale
          const printData = preparePrintData(saleNumber, 'pending');
          await handlePrintReceipt(printData, t('titles.sale_receipt'));
        }
        
        // Clear cart and customer info
        setCart([]);
        setPackagingCart([]);
        setCustomerInfo({ name: '', phone: '', email: '' });
        setPaidAmount(0);
        
        // Reset price mode to standard after sale
        setPriceMode('standard');
        
        alert(`Pending sale created successfully! Sale Number: ${saleNumber}`);
      }
    } catch (err) {
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
        setError('Failed to create sale. Please check the console for details.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setPackagingCart([]);
    setError('');
  };

  const handleFilterChange = useCallback((filterType, value) => {
    if (filterType === 'search') {
      // For search, update the input state immediately (no API call)
      setSearchInput(value);
    } else {
      // For other filters (like category), update immediately and fetch from server
      const newFilters = { ...filtersRef.current, [filterType]: value };
      setFilters(newFilters);
      fetchProducts(newFilters);
    }
  }, []); // No dependencies needed since we use ref

  const clearFilters = useCallback(() => {
    const clearedFilters = { category: '', search: '' };
    setFilters(clearedFilters);
    setSearchInput(''); // Clear the search input state
    
    // Only fetch products if categories are loaded
    if (categoriesLoadedRef.current && categoriesRef.current.length > 0) {
      fetchProducts(clearedFilters);
    }
  }, [categoriesLoaded, categories.length]);

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
      setError('Please enter a valid quantity');
      setEditingQuantity(null);
      return;
    }
    
    // Skip stock validation for pending sales since stock won't be removed until completion
    if (saleMode === 'complete') {
      // Check updated stock availability for the selected unit
      const updatedStockInfo = getUpdatedStockAvailability(item.id);
      const unitStockInfo = updatedStockInfo?.find(u => u.id === item.unit_id);
      
      if (!unitStockInfo || !unitStockInfo.is_available) {
        setError(`Unit is out of stock`);
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
        setError(`Not enough stock available. Max: ${maxAllowed}`);
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

  // const handleProductCardClick = (product) => {
  //   // Don't allow clicking on out-of-stock products (only for complete sales)
  //   if (saleMode === 'complete' && product.available_units && product.available_units.every(u => {
  //     let availableQuantity = product.stock_quantity;
  //     if (u.conversion_factor && u.conversion_factor > 0) {
  //       availableQuantity = product.stock_quantity / u.conversion_factor;
  //     }
  //     return availableQuantity <= 0;
  //   })) {
  //     return;
  //   }
    
  //   if ((product.available_units && product.available_units.length > 1 && priceMode === 'wholesale') ||
  //       (priceMode === 'standard' && product.standard_prices_list && product.standard_prices_list.length > 0)) {
  //     // For multi-unit products or multiple standard prices, add with the currently selected option
  //     const selectedUnitId = selectedUnits[product.id];
      
  //     if (selectedUnitId) {
  //       if (priceMode === 'standard' && selectedUnitId.startsWith('price-')) {
  //         // Handle standard price selection
  //         const priceIndex = parseInt(selectedUnitId.split('-')[1]);
  //         const selectedPrice = product.standard_prices_list[priceIndex];
          
  //         // Add to cart with base unit but specific price
  //         const baseUnit = {
  //           id: product.base_unit?.id || product.base_unit,
  //           name: product.base_unit?.name || 'Piece',
  //           symbol: product.base_unit?.symbol || 'piece'
  //         };
  //         addToCart(product, baseUnit, selectedPrice);
  //       } else {
  //         // Handle wholesale unit selection
  //         const selectedAvailableUnit = product.available_units.find(u => u.id === selectedUnitId);
          
  //         if (selectedAvailableUnit) {
  //           // Convert available unit to the format expected by addToCart
  //           const selectedUnit = {
  //             id: selectedAvailableUnit.id,
  //             name: selectedAvailableUnit.name,
  //             symbol: selectedAvailableUnit.symbol
  //           };
  //           addToCart(product, selectedUnit);
  //         }
  //       }
  //     }
  //   } else {
  //     // For single-unit products or single price, add directly with base unit
  //     addToCart(product);
  //   }
  // };

  const handleProductCardClick = (product) => {
      // console.log(product);
    // Don't allow clicking on out-of-stock products (only for complete sales)
    if (saleMode === 'complete' && product.available_units && product.available_units.every(u => {
      let availableQuantity = product.stock_quantity;
      if (u.conversion_factor && u.conversion_factor > 0) {
        availableQuantity = product.stock_quantity / u.conversion_factor;
      }
      return availableQuantity <= 0;
    })) {
      return;
    }
    
    if ((product.available_units && product.available_units.length > 1 && priceMode === 'wholesale') ||
        (priceMode === 'standard' && product.standard_prices_list && product.standard_prices_list.length > 0)) {
      // For multi-unit products or multiple standard prices, add with the currently selected option
      const selectedUnitId = selectedUnits[product.id];
      
      if (selectedUnitId) {
        try{
          if (priceMode === 'standard' && selectedUnitId.startsWith('price-')) {
            // Handle standard price selection
            const priceIndex = parseInt(selectedUnitId.split('-')[1]);
            const selectedPrice = product.standard_prices_list[priceIndex];
            
            // Add to cart with base unit but specific price
            const baseUnit = {
              id: product.base_unit?.id || product.base_unit,
              name: product.base_unit?.name || 'Piece',
              symbol: product.base_unit?.symbol || 'piece'
            };
            addToCart(product, baseUnit, selectedPrice);
          } else {
            // Handle wholesale unit selection
            const selectedAvailableUnit = product.available_units.find(u => u.id === parseInt(selectedUnitId));

            if (selectedAvailableUnit) {
              // Convert available unit to the format expected by addToCart
              const selectedUnit = {
                id: selectedAvailableUnit.id,
                name: selectedAvailableUnit.name,
                symbol: selectedAvailableUnit.symbol
              };
              addToCart(product, selectedUnit);
            } 
          }
        }
        catch(error){
          setError(`Please select unit from the drop-down or see : `, error);
        }
        
      }else{
        setError(`Please select unit from the drop-down`);
      }
    } else {
      // For single-unit products or single price, add directly with base unit
      addToCart(product);
    }
  };

  // if (initialLoading) {
  //   return (
  //     <div className="pos">
  //       <div className="pos-loading">
  //         <div className="spinner"></div>
  //         <span>Loading products...</span>
  //       </div>
  //     </div>
  //   );
  // }

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
                {categories.filter(cat => cat.is_sellable).map(category => (
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
                {showSellableToggle ? 'Hide' : 'Manage'} Categories
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
                key="search-input"
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
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: '0', fontSize: '1rem', fontWeight: '600' }}>
                  Manage Sellable Categories
                  {categoryUpdating && <span style={{ marginLeft: '0.5rem', color: '#3b82f6' }}>⟳</span>}
                </h3>
                <button
                  onClick={resetAllCategoriesToSellable}
                  disabled={categoryUpdating}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #3b82f6',
                    cursor: categoryUpdating ? 'not-allowed' : 'pointer',
                    backgroundColor: categoryUpdating ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    fontWeight: '500',
                    opacity: categoryUpdating ? 0.6 : 1
                  }}
                >
                  Reset All to Sellable
                </button>
              </div>
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
                      onClick={() => toggleCategorySellable(category.id, category.is_sellable)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: '0.25rem',
                        border: '1px solid',
                        cursor: 'pointer',
                        backgroundColor: category.is_sellable ? '#dcfce7' : '#fee2e2',
                        borderColor: category.is_sellable ? '#16a34a' : '#dc2626',
                        color: category.is_sellable ? '#15803d' : '#dc2626'
                      }}
                    >
                      {category.is_sellable ? 'Sellable' : 'Not Sellable'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="products-info">
            <p className="products-count">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="products-grid">
            {filteredProducts
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map(product => (
              <div
                key={product.id}
                className={`product-card ${product.stock_quantity <= 0 && saleMode === 'complete' ? 'out-of-stock' : ''} clickable`}
                onClick={() => handleProductCardClick(product)}
              >
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-sku">{product.sku}</p>
                  <p className="product-price">
                    {/* {(() => {
                      if (priceMode === 'standard') {
                        // For standard mode, show the legacy price (which is the actual standard price)
                        return parseFloat(product.price || 0).toFixed(2);
                      } else {
                        // For wholesale mode, show the wholesale price
                        return parseFloat(product.wholesale_price || 0).toFixed(2);
                      }
                    })()} MGA */}
                    {product.available_units && product.available_units.length > 1 && 
                      ` (Base Unit: ${product.base_unit_symbol})`
                    }
                  </p>
                  <p className="product-stock">
                    Stock: {product.stock_quantity} {product.unit}
                    {product.available_units && product.available_units.length > 1 && priceMode === 'wholesale' && (
                      <span className="stock-details">
                        {product.available_units.map(unit => {
                          let price = 0;
                          let isAvailable = true;
                          
                          // For wholesale mode, use unit-specific wholesale price or calculated price from base unit
                          if (unit.unit_specific_wholesale_price) {
                            price = unit.unit_specific_wholesale_price;
                          } else {
                            // Calculate wholesale price based on conversion factor
                            const baseWholesalePrice = parseFloat(product.wholesale_price || 0);
                            if (unit.conversion_factor && unit.conversion_factor > 0) {
                              price = baseWholesalePrice * unit.conversion_factor;
                            } else {
                              price = baseWholesalePrice;
                            }
                          }
                          
                          // Calculate available quantity for this unit
                          let availableQuantity = product.stock_quantity;
                          if (unit.conversion_factor && unit.conversion_factor > 0) {
                            availableQuantity = product.stock_quantity / unit.conversion_factor;
                          }
                          isAvailable = availableQuantity > 0;
                            
                            return (
                            <span key={unit.id} className={`unit-stock ${isAvailable ? 'available' : 'unavailable'}`}>
                              {unit.name}: {price.toFixed(2)} MGA ({availableQuantity.toFixed(1)} available)
                              </span>
                            );
                        })}
                      </span>
                    )}
                  </p>
                  
                  {/* Unit Selection - Show for products with multiple available units or multiple standard prices */}
                  {((product.available_units && product.available_units.length > 1 && priceMode === 'wholesale') || 
                    (priceMode === 'standard' && product.standard_prices_list && product.standard_prices_list.length > 0)) && (
                    <div className="unit-selection">
                      <label>Unit:</label>
                      <select 
                        className="unit-select"
                        value={selectedUnits[product.id] || ''}
                        onChange={(e) => {
                          const unitId = e.target.value;
                          handleUnitSelection(product.id, unitId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Select Unit</option>
                        {priceMode === 'standard' && product.standard_prices_list && product.standard_prices_list.length > 0 ? (
                          // For standard mode with multiple prices, show price options
                          product.standard_prices_list.map((price, index) => (
                            <option key={`price-${index}`} value={`price-${index}`}>
                              Standard Price {index + 1} - {parseFloat(price).toFixed(2)} MGA
                            </option>
                          ))
                        ) : (
                          // For wholesale mode, show unit options
                          product.available_units.map((unit) => {
                            let price = 0;
                            let isAvailable = true;
                            
                            // For wholesale mode, use unit-specific wholesale price or calculated price from base unit
                            if (unit.unit_specific_wholesale_price) {
                              price = unit.unit_specific_wholesale_price;
                            } else {
                              // Calculate wholesale price based on conversion factor
                              const baseWholesalePrice = parseFloat(product.wholesale_price || 0);
                              if (unit.conversion_factor && unit.conversion_factor > 0) {
                                price = baseWholesalePrice * unit.conversion_factor;
                              } else {
                                price = baseWholesalePrice;
                              }
                            }
                            
                            // Calculate available quantity for this unit
                            let availableQuantity = product.stock_quantity;
                            if (unit.conversion_factor && unit.conversion_factor > 0) {
                              availableQuantity = product.stock_quantity / unit.conversion_factor;
                            }
                            isAvailable = availableQuantity > 0;
                            
                            return (
                              <option 
                                key={unit.id} 
                                value={unit.id}
                                disabled={saleMode === 'complete' ? !isAvailable : false}
                              >
                                {unit.name} ({unit.symbol}) - {price.toFixed(2)} MGA
                                {!isAvailable && saleMode === 'complete' ? ' - OUT OF STOCK' : ''}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                  )}
                  
                  {/* Add to Cart Button - Show when no unit selection is needed */}
                  {!((product.available_units && product.available_units.length > 1 && priceMode === 'wholesale') || 
                     (priceMode === 'standard' && product.standard_prices_list && product.standard_prices_list.length > 0)) && (
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
                          return 'Loading...';
                        }
                        
                        // For pending sales, always show "Add to Cart" regardless of stock
                        if (saleMode === 'pending') {
                          return 'Add to Cart';
                        }
                        
                        return product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart';
                      })()}
                    </Button>
                  )}
                  
                  {/* Packaging Info - Show for products with packaging */}
                  {product.has_packaging && product.packaging_price && (
                    <div className="packaging-info">
                      <small className="packaging-price">
                        Packaging: {product.packaging_price} MGA (Auto-added)
                      </small>
                    </div>
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

          {/* Pagination Controls */}
          {filteredProducts.length > PAGE_SIZE && (
            <div className="products-pagination" style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
              <Button
                variant="outline"
                size="small"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <span style={{ alignSelf: 'center' }}>
                Page {currentPage} of {Math.ceil(filteredProducts.length / PAGE_SIZE)}
              </span>
              <Button
                variant="outline"
                size="small"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProducts.length / PAGE_SIZE), p + 1))}
                disabled={currentPage >= Math.ceil(filteredProducts.length / PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          )}
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
                  <div className="header-status">Status</div>
                  <div className="header-total">Total</div>
                  <div className="header-actions">Actions</div>
                </div>
                {cart.map(item => (
                  <div key={`${item.id}-${item.unit_id}-${item.price_mode}`} className="cart-item">
                    <div className="item-product">
                      <h4>{item.name}</h4>
                      <p className="item-sku">SKU: {item.sku}</p>
                      <span className={`price-mode-badge ${item.price_mode}`}>
                        {item.price_mode === 'wholesale' ? 'WS' : 'STD'}
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
                    <div className="item-status">
                      <span className="sales-item-status">-</span>
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
                
                {/* Packaging Items */}
                {packagingCart.length > 0 && (
                  <>
                    <div className="packaging-section-header">
                      <h4>Packaging Items (Auto-calculated)</h4>
                    </div>
                    {packagingCart.map(item => (
                      <div key={`packaging-${item.id}`} className="cart-item packaging-item">
                        <div className="item-product">
                          <h4>{item.name} (Packaging)</h4>
                          <p className="item-sku">SKU: {item.sku}</p>
                          {item.sales_unit_name && (
                            <p className="packaging-source">
                              From: {item.quantity} {item.sales_unit_symbol || 'piece'}
                            </p>
                          )}
                        </div>
                        <div className="item-unit">
                          piece
                        </div>
                        <div className="item-price">
                          {parseFloat(item.unit_price).toFixed(2)} MGA
                        </div>
                        <div className="item-quantity">
                          <span className="quantity auto-calculated">
                            {item.quantity}
                          </span>
                          <small className="auto-label">Auto</small>
                        </div>
                        <div className="item-status">
                          <select
                            value={item.status}
                            onChange={(e) => updatePackagingStatus(item.id, e.target.value)}
                            className="packaging-status-select"
                          >
                            <option value="consignation">Consigned (Paid)</option>
                            <option value="exchange">Exchange</option>
                            <option value="due">Due (Return Required)</option>
                          </select>
                        </div>
                        <div className="item-total">
                          {(item.quantity * item.unit_price).toFixed(2)} MGA
                        </div>
                        <div className="item-actions">
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => removeFromPackagingCart(item.id)}
                            title="Remove packaging item"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Items Total:</span>
                  <span>{calculateSubtotal().toFixed(2)} MGA</span>
                </div>
                {packagingCart.length > 0 && (
                  <div className="summary-row packaging-breakdown">
                    <span>Packaging Total:</span>
                    <span>{calculatePackagingTotal().toFixed(2)} MGA</span>
                  </div>
                )}
                <div className="summary-row cost-breakdown">
                  <span>Cost (excl. tax):</span>
                  <span>{calculateCost().toFixed(2)} MGA</span>
                </div>
                <div className="summary-row tax-breakdown">
                  <span>Tax included:</span>
                  <span>{calculateTax().toFixed(2)} MGA</span>
                </div>
                <div className="summary-row">
                  <span>Products Total:</span>
                  <span>{calculateTotal().toFixed(2)} MGA</span>
                </div>
                {packagingCart.length > 0 && (
                  <div className="summary-row">
                    <span>Packaging Total:</span>
                    <span>{calculatePackagingTotal().toFixed(2)} MGA</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total (Products Only):</span>
                  <span>{calculateTotal().toFixed(2)} MGA</span>
                </div>
              </div>

              <form className="checkout-form">
              <div className="customer-info">
                <h3>Customer Information</h3>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder={(saleMode !== 'complete' || paymentType === 'partial' )? "Customer Name (Required for Partial Payment)" : "Customer Name (Optional)"}
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className={(saleMode !== 'complete' || paymentType === 'partial') && !customerInfo.name ? 'required-field' : ''}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder="Email (Optional)"
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
                    <small>Products Total: ${calculateTotal().toFixed(2)} | Remaining: ${(calculateTotal() - (paidAmount || 0)).toFixed(2)}</small>
                  </div>
                )}
              </div>
              </form>

              <div className="checkout-actions">
                {/* Print Preview Button - Using the improved printing logic */}
                <Button
                  variant="outline"
                  size="large"
                  onClick={handlePrintPreview}
                  className="print-preview-btn"
                >
                  🖨️ Print Preview
                </Button>
                
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