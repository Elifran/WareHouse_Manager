import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useProductsPOS } from '../hooks/useProductsPOS';
import { useCategoriesPOS } from '../hooks/useCategoriesPOS';
import Button from '../components/Button';
import { 
  isMobileDevice,
  openPrintWindow,
  openPrintPreview,
  downloadReceiptFile,
  generatePrintContent
} from '../utils/printUtils';
import {formatCurrency} from '../utils/helpers';
import './PointOfSale.css';

const POS_ACTIVE_DRAFT_KEY = 'posActiveDraftSale';
const POS_SAVED_DRAFTS_KEY = 'posSavedDraftSales';

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

  const [showSellableToggle, setShowSellableToggle] = useState(false); // Show/hide sellable toggle
  const [priceMode, setPriceMode] = useState('standard'); // 'standard' or 'wholesale'
  const [saleMode, setSaleMode] = useState('complete'); // 'complete' or 'pending'
  const [printReceipt, setPrintReceipt] = useState(true); // true or false
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 24;
  
  // Packaging state
  const [packagingCart, setPackagingCart] = useState([]);
  const [draftInfo, setDraftInfo] = useState({ hasDraft: false, savedAt: null });
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const draftRestoreInProgressRef = useRef(false);
  const draftSaveTimeoutRef = useRef(null);
  const [showSavedSalesModal, setShowSavedSalesModal] = useState(false);
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesSearchResults, setSalesSearchResults] = useState([]);
  const [salesSearchLoading, setSalesSearchLoading] = useState(false);
  const [salesSearchError, setSalesSearchError] = useState('');
  const [importingSaleId, setImportingSaleId] = useState(null);

  // React Query hooks for data fetching with enhanced caching (localStorage persistence)
  const { data: categoriesData = [], isLoading: categoriesLoading, refetch: refetchCategories } = useCategoriesPOS();
  const { data: allProductsData = [], isLoading: productsLoading, refetch: refetchProducts } = useProductsPOS(
    filters.category ? { category: filters.category } : {}
  );

  // Update categories state from query
  useEffect(() => {
    if (categoriesData.length > 0) {
      setCategories(categoriesData);
      setCategoriesLoaded(true);
    }
  }, [categoriesData]);

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

  // Filter products based on sellable categories
  const sellableProducts = useMemo(() => {
    if (!allProductsData || allProductsData.length === 0 || !categories || categories.length === 0) {
      return [];
    }

    return allProductsData.filter(product => {
      let isSellable = false;
      
      // If product has category_name, find the category in our categories list
      if (product.category_name) {
        const category = categories.find(cat => cat.name === product.category_name);
        isSellable = category ? category.is_sellable : false;
      }
      // If product has category ID, find the category in our categories list
      else if (product.category && typeof product.category === 'number') {
        const category = categories.find(cat => cat.id === product.category);
        isSellable = category ? category.is_sellable : false;
      }
      // If product has category object with ID, find the category in our categories list
      else if (product.category && product.category.id) {
        const category = categories.find(cat => cat.id === product.category.id);
        isSellable = category ? category.is_sellable : false;
      }
      
      return isSellable;
    });
  }, [allProductsData, categories]);

  const clearActiveDraftStorage = useCallback(() => {
    sessionStorage.removeItem(POS_ACTIVE_DRAFT_KEY);
    setDraftInfo({ hasDraft: false, savedAt: null });
  }, []);

  const loadSavedDraftsFromStorage = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(POS_SAVED_DRAFTS_KEY);
      if (!stored) {
        setSavedDrafts([]);
        return [];
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setSavedDrafts(parsed);
        return parsed;
      }
      setSavedDrafts([]);
      return [];
    } catch (error) {
      console.error('Failed to load saved drafts:', error);
      setSavedDrafts([]);
      return [];
    }
  }, []);

  const persistSavedDrafts = useCallback((drafts) => {
    try {
      sessionStorage.setItem(POS_SAVED_DRAFTS_KEY, JSON.stringify(drafts));
      setSavedDrafts(drafts);
    } catch (error) {
      console.error('Failed to persist saved drafts:', error);
    }
  }, []);

  const applyDraftState = useCallback((draft) => {
    if (!draft) return;
    draftRestoreInProgressRef.current = true;
    
    setCart(Array.isArray(draft.cart) ? draft.cart : []);
    setPackagingCart(Array.isArray(draft.packagingCart) ? draft.packagingCart : []);
    setCustomerInfo({
      name: draft.customerInfo?.name || '',
      phone: draft.customerInfo?.phone || '',
      email: draft.customerInfo?.email || ''
    });
    setPaymentMethod(draft.paymentMethod || 'cash');
    setPaymentType(draft.paymentType || 'full');
    setPaidAmount(typeof draft.paidAmount === 'number' ? draft.paidAmount : 0);
    setPriceMode(draft.priceMode || 'standard');
    setSaleMode(draft.saleMode || 'complete');
    setFilters(draft.filters ? {
      category: draft.filters.category || '',
      search: draft.filters.search || ''
    } : { category: '', search: '' });
    setSearchInput(draft.searchInput || '');
    setSelectedUnits(draft.selectedUnits || {});
    setShowSellableToggle(!!draft.showSellableToggle);
    
    setTimeout(() => {
      draftRestoreInProgressRef.current = false;
    }, 0);
  }, [
    setCart,
    setPackagingCart,
    setCustomerInfo,
    setPaymentMethod,
    setPaymentType,
    setPaidAmount,
    setPriceMode,
    setSaleMode,
    setFilters,
    setSearchInput,
    setSelectedUnits,
    setShowSellableToggle
  ]);

  const getCurrentDraftState = useCallback(() => ({
    cart,
    packagingCart,
    customerInfo,
    paymentMethod,
    paymentType,
    paidAmount,
    priceMode,
    saleMode,
    filters,
    searchInput,
    selectedUnits,
    showSellableToggle
  }), [
    cart,
    packagingCart,
    customerInfo,
    paymentMethod,
    paymentType,
    paidAmount,
    priceMode,
    saleMode,
    filters,
    searchInput,
    selectedUnits,
    showSellableToggle
  ]);

  const hasMeaningfulDraftData = useCallback(() => {
    return cart.length > 0 ||
      packagingCart.length > 0 ||
      customerInfo.name ||
      customerInfo.phone ||
      customerInfo.email ||
      paidAmount > 0 ||
      paymentType === 'partial';
  }, [cart, packagingCart, customerInfo, paidAmount, paymentType]);

  const restoreDraftFromStorage = useCallback((options = { silent: true }) => {
    const { silent } = options;
    try {
      const stored = sessionStorage.getItem(POS_ACTIVE_DRAFT_KEY);
      if (!stored) {
        clearActiveDraftStorage();
        if (!silent) {
          setError('No draft sale found to restore');
        }
        return false;
      }
      const parsed = JSON.parse(stored);
      if (!parsed) {
        clearActiveDraftStorage();
        if (!silent) {
          setError('Draft data is corrupted');
        }
        return false;
      }
      applyDraftState(parsed);
      const savedAt = parsed.savedAt || new Date().toISOString();
      setDraftInfo({ hasDraft: true, savedAt });
      if (!silent) {
        setSuccess('Draft sale restored');
      }
      return true;
    } catch (draftError) {
      console.error('Failed to restore draft sale:', draftError);
      if (!silent) {
        setError('Failed to restore draft sale');
      }
      return false;
    }
  }, [applyDraftState, clearActiveDraftStorage]);

  const draftTimestampLabel = useMemo(() => {
    if (!draftInfo.savedAt) return '';
    try {
      return new Date(draftInfo.savedAt).toLocaleString();
    } catch (err) {
      return '';
    }
  }, [draftInfo.savedAt]);

  const handleDiscardDraft = useCallback(() => {
    const shouldDiscard = window.confirm('Discard the saved draft sale? This will clear the current cart and customer information.');
    if (!shouldDiscard) {
      return;
    }

    setCart([]);
    setPackagingCart([]);
    setCustomerInfo({ name: '', phone: '', email: '' });
    setPaymentMethod('cash');
    setPaymentType('full');
    setPaidAmount(0);
    setPriceMode('standard');
    setSaleMode('complete');
    setSelectedUnits({});
    setFilters({ category: '', search: '' });
    setSearchInput('');
    setShowSellableToggle(false);
    clearActiveDraftStorage();
    setError('');
    setSuccess('');
  }, [clearActiveDraftStorage]);

  const handleSaveCurrentAsDraft = useCallback(() => {
    if (!hasMeaningfulDraftData()) {
      setError('Add items or customer details before saving a draft.');
      return;
    }

    const defaultName = `Draft ${new Date().toLocaleString()}`;
    const name = window.prompt('Enter a name for this draft sale:', defaultName);
    if (!name) {
      return;
    }

    const snapshot = getCurrentDraftState();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Draft name cannot be empty');
      return;
    }

    const newDraft = {
      id: `draft-${Date.now()}`,
      name: trimmedName,
      savedAt: new Date().toISOString(),
      data: snapshot
    };

    const updatedDrafts = [newDraft, ...savedDrafts];
    persistSavedDrafts(updatedDrafts);
    setSuccess('Draft saved successfully');
  }, [getCurrentDraftState, hasMeaningfulDraftData, persistSavedDrafts, savedDrafts, setError, setSuccess]);

  const handleRestoreSavedDraft = useCallback((draftId) => {
    const target = savedDrafts.find(d => d.id === draftId);
    if (!target) {
      setError('Draft not found');
      return;
    }
    applyDraftState(target.data);
    setDraftInfo({ hasDraft: true, savedAt: target.savedAt });
    setSuccess(`Draft "${target.name}" restored`);
    setShowDraftsModal(false);
    const updated = savedDrafts.filter(d => d.id !== draftId);
    persistSavedDrafts(updated);
  }, [savedDrafts, applyDraftState, setError, setSuccess]);

  const handleDeleteSavedDraft = useCallback((draftId) => {
    const target = savedDrafts.find(d => d.id === draftId);
    if (!target) return;
    const confirmDelete = window.confirm(`Delete draft "${target.name}"?`);
    if (!confirmDelete) return;

    const updated = savedDrafts.filter(d => d.id !== draftId);
    persistSavedDrafts(updated);
  }, [savedDrafts, persistSavedDrafts]);

  const fetchSavedSales = useCallback(async (query = '') => {
    setSalesSearchLoading(true);
    setSalesSearchError('');
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('page_size', '15');
      params.append('status', 'completed');
      if (query) {
        params.append('search', query);
        params.append('sale_number', query);
      }

      const response = await api.get(`/api/sales/?${params.toString()}`);
      const salesData = response.data.results || response.data;
      setSalesSearchResults(Array.isArray(salesData) ? salesData : []);
    } catch (err) {
      console.error('Failed to search saved sales:', err);
      setSalesSearchError('Could not search saved sales. Please try again.');
    } finally {
      setSalesSearchLoading(false);
    }
  }, []);

  const mapSaleItemToCartItem = useCallback((saleItem) => {
    const productId = saleItem.product || saleItem.product_id || saleItem.id;
    const product =
      allProducts.find(p => p.id === productId) ||
      products.find(p => p.id === productId);

    const unitId = saleItem.unit || saleItem.unit_id || saleItem.unit?.id;
    const unitFromProduct = product?.available_units?.find(u => u.id === unitId);
    const unitSymbol = unitFromProduct?.symbol ||
      product?.base_unit?.symbol ||
      saleItem.unit_symbol ||
      saleItem.unit_name ||
      'unit';
    const quantityValue = parseFloat(
      saleItem.quantity_display ?? saleItem.quantity ?? 0
    ) || 0;

    return {
      ...(product || {}),
      id: productId,
      name: product?.name || saleItem.product_name || 'Product',
      sku: product?.sku || saleItem.product_sku || '',
      quantity: quantityValue,
      unit_id: unitId,
      unit_name: saleItem.unit_name || unitFromProduct?.name || unitSymbol,
      unit_symbol: unitSymbol,
      unit_price: parseFloat(saleItem.unit_price || saleItem.price || 0) || 0,
      price_mode: saleItem.price_mode || 'standard'
    };
  }, [allProducts, products]);

  const handleImportSaleIntoPOS = useCallback(async (saleId) => {
    if (cart.length > 0 || packagingCart.length > 0) {
      setSalesSearchError('Clear the POS items before copying a saved sale.');
      return;
    }

    setImportingSaleId(saleId);
    setSalesSearchError('');

    try {
      const response = await api.get(`/api/sales/${saleId}/`);
      const sale = response.data;

      const mappedCart = (sale.items || [])
        .map(mapSaleItemToCartItem)
        .filter(item => item.quantity > 0);

      if (mappedCart.length === 0) {
        setSalesSearchError('Selected sale has no items to copy.');
        return;
      }

      setCart(mappedCart);
      setPackagingCart([]);
      setCustomerInfo({
        name: sale.customer_name || '',
        phone: sale.customer_phone || '',
        email: sale.customer_email || ''
      });
      setPaymentMethod(sale.payment_method || 'cash');

      const totalAmount = parseFloat(sale.total_amount || sale.subtotal || 0) || 0;
      const paid = parseFloat(sale.paid_amount || 0) || 0;
      if (paid > 0 && paid < totalAmount) {
        setPaymentType('partial');
        setPaidAmount(paid);
      } else {
        setPaymentType('full');
        setPaidAmount(totalAmount || 0);
      }

      setSaleMode(sale.status === 'pending' ? 'pending' : 'complete');
      setShowSavedSalesModal(false);
      setSuccess('Sale copied into POS. Review items before completing.');
      setError('');
    } catch (err) {
      console.error('Failed to import sale into POS:', err);
      setSalesSearchError('Failed to load sale details. Please try again.');
    } finally {
      setImportingSaleId(null);
    }
  }, [
    cart.length,
    packagingCart.length,
    mapSaleItemToCartItem,
    setCart,
    setPackagingCart,
    setCustomerInfo,
    setPaymentMethod,
    setPaymentType,
    setPaidAmount,
    setSaleMode
  ]);

  useEffect(() => {
    restoreDraftFromStorage({ silent: true });
    
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [restoreDraftFromStorage]);

  useEffect(() => {
    loadSavedDraftsFromStorage();
  }, [loadSavedDraftsFromStorage]);

  useEffect(() => {
    if (showSavedSalesModal && salesSearchResults.length === 0 && !salesSearchLoading) {
      fetchSavedSales();
    }
  }, [showSavedSalesModal, salesSearchResults.length, salesSearchLoading, fetchSavedSales]);

  // Update allProducts when sellableProducts change
  useEffect(() => {
    if (sellableProducts.length > 0) {
      setAllProducts(sellableProducts);
    }
  }, [sellableProducts]);

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
      refetchProducts(); // React Query handles caching
    }
  }, [categoriesLoaded, categories.length, filters, refetchProducts]);

  

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
      const printContent = generatePrintContent(printData, title, 'sale', t);

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

  // Calculate total amount (products only, excluding packaging)
  const calculateTotal = () => {
    const cartTotal = cart.reduce((total, item) => {
      const unitPrice = item.unit_price || 0;
      return total + (unitPrice * item.quantity);
    }, 0);
    return cartTotal;
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

  // Update loading states based on query loading
  useEffect(() => {
    if (categoriesLoading || productsLoading) {
      setLoading(true);
      setInitialLoading(true);
    } else {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [categoriesLoading, productsLoading]);

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
    if (draftRestoreInProgressRef.current) {
      return;
    }

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = setTimeout(() => {
      if (!hasMeaningfulDraftData()) {
        clearActiveDraftStorage();
        return;
      }

      const draftPayload = {
        ...getCurrentDraftState(),
        savedAt: new Date().toISOString()
      };

      sessionStorage.setItem(POS_ACTIVE_DRAFT_KEY, JSON.stringify(draftPayload));
      setDraftInfo({ hasDraft: true, savedAt: draftPayload.savedAt });
    }, 400);

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
        draftSaveTimeoutRef.current = null;
      }
    };
  }, [
    getCurrentDraftState,
    hasMeaningfulDraftData,
    clearActiveDraftStorage
  ]);

  useEffect(() => {
    // Fetch stock availability for ALL products in bulk to improve performance
    if (allProducts.length > 0) {
      fetchBulkStockAvailability();
    }
    
    // Set default selected units/prices based on products
    // For standard mode: prioritize setting first price for products with standard prices
    // For wholesale mode: prioritize setting default unit for products with multiple units
    const defaultUnits = {};
    allProducts.forEach(product => {
      // For standard mode: set default first price for products with multiple standard prices
      if (product.standard_prices_list && product.standard_prices_list.length > 0) {
        defaultUnits[product.id] = 'price-0';
      }
      // For wholesale mode: set default unit for products with multiple compatible units
      // Only set if not already set by standard prices (products can have both)
      else if (product.compatible_units && product.compatible_units.length > 1) {
        
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

  // Recalculate packaging quantities whenever cart changes
  useEffect(() => {
    if (packagingCart.length > 0) {
      recalculateAllPackagingQuantities();
    }
  }, [cart]); // Depend on cart changes

  // Update selected units/prices when priceMode changes
  useEffect(() => {
    if (allProducts.length === 0) return;
    
    setSelectedUnits(prev => {
      const updated = { ...prev };
      
      allProducts.forEach(product => {
        if (priceMode === 'standard' && product.standard_prices_list && product.standard_prices_list.length > 0) {
          // When switching to standard mode, set first price if not already a price selection
          if (!updated[product.id] || !updated[product.id].toString().startsWith('price-')) {
            updated[product.id] = 'price-0';
          }
        } else if (priceMode === 'wholesale' && product.compatible_units && product.compatible_units.length > 1) {
          // When switching to wholesale mode, set default unit if currently a price selection
          if (updated[product.id] && updated[product.id].toString().startsWith('price-')) {
            // Find default unit
            let selectedUnit = product.compatible_units.find(u => u.is_default);
            if (!selectedUnit) {
              selectedUnit = product.compatible_units.find(u => u.unit.is_base_unit);
            }
            if (!selectedUnit) {
              selectedUnit = product.compatible_units[0];
            }
            if (selectedUnit) {
              updated[product.id] = selectedUnit.unit?.id || selectedUnit.unit;
            }
          }
        }
      });
      
      return updated;
    });
  }, [priceMode, allProducts]);

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

  // Refetch products when category filter changes (React Query handles caching)
  useEffect(() => {
    if (categoriesLoaded) {
      refetchProducts();
    }
  }, [filters.category, categoriesLoaded, refetchProducts]);

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
      refetchProducts(); // React Query handles caching
      
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
      
      // Clear session storage to reset to database defaults
      sessionStorage.removeItem('sellableCategories');
      
      // Refetch categories from database (which will use DB defaults since sessionStorage is cleared)
      const freshCategories = await refetchCategories();
      
      // Update categories state with fresh data from database
      if (freshCategories.data && freshCategories.data.length > 0) {
        setCategories(freshCategories.data);
      }
      
      // Immediately refetch products to apply the new filter
      refetchProducts(); // React Query handles caching
      
      setSuccess('Categories have been reset to database defaults');
      
      // Reset updating state after a short delay
      setTimeout(() => setCategoryUpdating(false), 500);
    } catch (err) {
      setError('Failed to reset categories');
      console.error('Category reset error:', err);
      setCategoryUpdating(false);
    }
  }, [refetchCategories, refetchProducts]); // Depend on refetch functions

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
    
    // In standard mode, prevent adding the same product with different prices
    if (priceMode === 'standard') {
      const existingProductInCart = cart.find(item => 
        item.id === product.id && 
        item.price_mode === 'standard'
      );
      
      if (existingProductInCart) {
        // If product exists with a different price, prevent adding
        if (existingProductInCart.unit_price !== unitPrice) {
          setError(`This product is already in cart with a different price. Please update the existing item or remove it first.`);
          return;
        }
        // If same product with same price exists, use existing item logic below
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
    if (product.packaging) {
      setTimeout(() => {
        addPackagingAutomatically(product, unit);
      }, 0);
    }
    
    setError('');
  };

  const updateQuantity = (productId, unitId, quantity, priceMode = null) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)));
      // Also remove packaging if sales item is removed - check if any other products with same packaging remain
      const removedProduct = allProducts.find(p => p.id === productId);
      if (removedProduct && removedProduct.packaging) {
        // Check if any other products in cart have the same packaging
        const hasOtherProductsWithSamePackaging = cart.some(item => 
          item.id !== productId && 
          allProducts.find(p => p.id === item.id)?.packaging === removedProduct.packaging
        );
        if (!hasOtherProductsWithSamePackaging) {
          setPackagingCart(packagingCart.filter(item => item.packaging_id !== removedProduct.packaging));
        }
      }
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
      if (product && product.packaging) {
        const unit = { id: unitId };
        updatePackagingQuantityAutomatically(product, unit, quantity);
      }
      
      setError('');
    }
  };

  const removeFromCart = (productId, unitId, priceMode = null) => {
    setCart(cart.filter(item => !(item.id === productId && item.unit_id === unitId && item.price_mode === priceMode)));
  };

  // Packaging functions - now groups by packaging_id instead of product_id
  const addPackagingAutomatically = (product, unit) => {
    if (!product.packaging) {
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

      // Update packaging cart - group by packaging_id
      setPackagingCart(currentPackagingCart => {
        const packagingId = product.packaging;
        // Look for existing packaging with the same packaging_id (not product_id)
        const existingPackaging = currentPackagingCart.find(item => item.packaging_id === packagingId);
        
        if (existingPackaging) {
          // Calculate total packaging quantity from all products with the same packaging in cart
          const totalSalesQuantity = currentCart
            .filter(item => {
              const cartProduct = allProducts.find(p => p.id === item.id);
              return cartProduct && cartProduct.packaging === packagingId;
            })
            .reduce((sum, item) => {
              // Get unit information for conversion
              const cartProduct = allProducts.find(p => p.id === item.id);
              if (!cartProduct) return sum;
              
              const updatedStockInfo = getUpdatedStockAvailability(cartProduct.id);
              const unitStockInfo = updatedStockInfo?.find(u => u.id === item.unit_id);
              
              let quantity = item.quantity;
              // Convert to base unit (pieces) if needed
              if (unitStockInfo && !unitStockInfo.is_base_unit && unitStockInfo.conversion_factor) {
                quantity = item.quantity * unitStockInfo.conversion_factor;
              }
              return sum + quantity;
            }, 0);
          
          // Update existing packaging quantity to match total sales quantity
          return currentPackagingCart.map(item =>
            item.packaging_id === packagingId
              ? { 
                  ...item, 
                  quantity: totalSalesQuantity,
                  total_price: parseFloat(item.unit_price) * totalSalesQuantity
                }
              : item
          );
        } else {
          // Create new packaging item - use packaging info instead of product info
          const packagingPrice = product.packaging_price_display || product.packaging_price || 0;
          const newPackagingItem = {
            packaging_id: packagingId,
            packaging_name: product.packaging_name || 'Packaging',
            quantity: packagingQuantity,
            unit_price: parseFloat(packagingPrice),
            total_price: parseFloat(packagingPrice) * packagingQuantity,
            status: 'consignation', // Default status
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone
          };
          return [...currentPackagingCart, newPackagingItem];
        }
      });

      return currentCart;
    });
  };

  const updatePackagingQuantityAutomatically = (product, unit, salesQuantity) => {
    if (!product.packaging) {
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
      const packagingId = product.packaging;
      // Look for existing packaging with the same packaging_id (not product_id)
      const existingPackaging = currentPackagingCart.find(item => item.packaging_id === packagingId);
      
      if (existingPackaging) {
        // Calculate total packaging quantity from all products with the same packaging in cart
        const totalSalesQuantity = cart
          .filter(item => {
            const cartProduct = allProducts.find(p => p.id === item.id);
            return cartProduct && cartProduct.packaging === packagingId;
          })
          .reduce((sum, item) => {
            // Get unit information for conversion
            const cartProduct = allProducts.find(p => p.id === item.id);
            if (!cartProduct) return sum;
            
            const updatedStockInfo = getUpdatedStockAvailability(cartProduct.id);
            const unitStockInfo = updatedStockInfo?.find(u => u.id === item.unit_id);
            
            let quantity = item.quantity;
            // Convert to base unit (pieces) if needed
            if (unitStockInfo && !unitStockInfo.is_base_unit && unitStockInfo.conversion_factor) {
              quantity = item.quantity * unitStockInfo.conversion_factor;
            }
            return sum + quantity;
          }, 0);
        
        // Update existing packaging quantity to match total sales quantity
        return currentPackagingCart.map(item =>
          item.packaging_id === packagingId
            ? { 
                ...item, 
                quantity: totalSalesQuantity,
                total_price: parseFloat(item.unit_price) * totalSalesQuantity
              }
            : item
        );
      } else {
        // Create new packaging item if it doesn't exist
        const packagingPrice = product.packaging_price_display || product.packaging_price || 0;
        const newPackagingItem = {
          packaging_id: packagingId,
          packaging_name: product.packaging_name || 'Packaging',
          quantity: packagingQuantity,
          unit_price: parseFloat(packagingPrice),
          total_price: parseFloat(packagingPrice) * packagingQuantity,
          status: 'consignation', // Default status
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone
        };
        return [...currentPackagingCart, newPackagingItem];
      }
    });
  };

  const updatePackagingStatus = (packagingId, status) => {
    setPackagingCart(packagingCart.map(item =>
      item.packaging_id === packagingId
        ? { ...item, status }
        : item
    ));
  };

  const removeFromPackagingCart = (packagingId) => {
    setPackagingCart(packagingCart.filter(item => item.packaging_id !== packagingId));
  };

  // Function to recalculate packaging quantities - now groups by packaging_id
  const recalculateAllPackagingQuantities = () => {
    setPackagingCart(currentPackagingCart => {
      // Group cart items by packaging_id
      const packagingGroups = {};
      
      cart.forEach(cartItem => {
        const cartProduct = allProducts.find(p => p.id === cartItem.id);
        if (cartProduct && cartProduct.packaging) {
          const packagingId = cartProduct.packaging;
          
          if (!packagingGroups[packagingId]) {
            packagingGroups[packagingId] = {
              packaging_id: packagingId,
              packaging_name: cartProduct.packaging_name || 'Packaging',
              unit_price: parseFloat(cartProduct.packaging_price_display || cartProduct.packaging_price || 0),
              quantity: 0
            };
          }
          
          // Get unit information for conversion
          const updatedStockInfo = getUpdatedStockAvailability(cartProduct.id);
          const unitStockInfo = updatedStockInfo?.find(u => u.id === cartItem.unit_id);
          
          let quantity = cartItem.quantity;
          // Convert to base unit (pieces) if needed
          if (unitStockInfo && !unitStockInfo.is_base_unit && unitStockInfo.conversion_factor) {
            quantity = cartItem.quantity * unitStockInfo.conversion_factor;
          }
          
          packagingGroups[packagingId].quantity += quantity;
        }
      });
      
      // Convert groups to array and preserve status/customer info from existing items
      return Object.values(packagingGroups).map(group => {
        const existingItem = currentPackagingCart.find(item => item.packaging_id === group.packaging_id);
        return {
          ...group,
          total_price: group.unit_price * group.quantity,
          status: existingItem?.status || 'consignation',
          customer_name: existingItem?.customer_name || customerInfo.name,
          customer_phone: existingItem?.customer_phone || customerInfo.phone
        };
      });
    });
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
    const subtotal = calculateSubtotal();
    
    // Calculate packaging total only for "consignation" items
    const packagingTotal = packagingCart.reduce((total, item) => {
      if (item.status === 'consignation') {
        return total + (item.total_price || 0);
      }
      return total;
    }, 0);
    
    const grandTotal = subtotal + packagingTotal;
    const remaining = grandTotal - paidAmount;
    
    return {
      sale_number: saleNumber,
      customer_name: customerInfo.name || t('customer.walk_in'),
      customer_phone: customerInfo.phone || '',
      customer_email: customerInfo.email || '',
      user_name: user?.username || 'Unknown User',
      user_id: user?.id || 'unknown',
      created_at: new Date().toISOString(),
      print_timestamp: new Date().toISOString(),
      print_id: `PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: saleStatus,
      subtotal : subtotal,
      total_amount: grandTotal,
      packaging_total: packagingTotal,
      grand_total: grandTotal,
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
      })),
      packaging_items: packagingCart.map(item => ({
        packaging_name: item.packaging_name || 'Packaging',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price || (item.quantity * item.unit_price),
        status: item.status
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
          packaging: item.packaging_id, // Use packaging_id instead of product
          quantity: parseFloat(item.quantity),
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
          clearActiveDraftStorage();
          
          // Wait a moment for the backend to process stock movements
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 1 second
          
          // Refresh product data to update stock quantities
          await refetchProducts();
          
          // Wait another moment for stock availability to be updated
          await new Promise(resolve => setTimeout(resolve, 250)); // Wait 0.5 seconds
          
          // Refresh stock availability for all products
          refreshStockAvailability();
          
          // Show success message with packaging transaction info if created
          let successMessage = `Sale completed successfully! Sale Number: ${saleNumber}`;
          if (completionResponse.data.packaging_transaction) {
            const pkgTransaction = completionResponse.data.packaging_transaction;
            successMessage += `\n\nPackaging transaction automatically created:\nTransaction: ${pkgTransaction.transaction_number}\nAmount: ${formatCurrency(pkgTransaction.total_amount)}`;
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
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh data
          await refetchProducts();
          await new Promise(resolve => setTimeout(resolve, 250));
          refreshStockAvailability();
          clearActiveDraftStorage();
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
        clearActiveDraftStorage();
        
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
    clearActiveDraftStorage();
  };

  const handleFilterChange = useCallback((filterType, value) => {
    if (filterType === 'search') {
      // For search, update the input state immediately (no API call)
      setSearchInput(value);
    } else {
      // For other filters (like category), update immediately and fetch from server
      const newFilters = { ...filtersRef.current, [filterType]: value };
      setFilters(newFilters);
      // React Query will automatically refetch when filters change
    }
  }, []); // No dependencies needed since we use ref

  const clearFilters = useCallback(() => {
    const clearedFilters = { category: '', search: '' };
    setFilters(clearedFilters);
    setSearchInput(''); // Clear the search input state
    
    // React Query will automatically refetch when filters change
    if (categoriesLoadedRef.current && categoriesRef.current.length > 0) {
      refetchProducts();
    }
  }, [categoriesLoaded, categories.length]);

  const handleQuantityClick = (item) => {
    setEditingQuantity(`${item.id}-${item.unit_id}`);
    setTempQuantity(item.quantity.toString());
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Allow digits with optional decimal separator (dot or comma), or empty string
    if (value === '' || /^\d*(?:[.,]\d{0,1})?$/.test(value)) {
      setTempQuantity(value);
    }
  };

  const handleQuantitySubmit = (item) => {
    const normalized = (tempQuantity || '').replace(',', '.');
    const newQuantity = parseFloat(normalized);
    
    // Enforce: minimum 1, at most one digit after decimal
    const isValidFormat = /^\d+(?:\.\d)?$/.test(normalized);
    if (tempQuantity === '' || isNaN(newQuantity) || newQuantity < .5 || !isValidFormat) {
      setError('Quantity must be >= 0.5 and have at most 1 decimal digit');
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
    
    if ((product.available_units && product.available_units.length > 0 && priceMode === 'wholesale') ||
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
            }else{
              // console.log("No unit selected : " + selectedAvailableUnit);
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

      <div className="pos-draft-actions" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        <Button
          variant="primary"
          size="small"
          onClick={handleSaveCurrentAsDraft}
        >
          Save Draft
        </Button>
        <Button
          variant="outline"
          size="small"
          onClick={() => setShowDraftsModal(true)}
        >
          Manage Drafts ({savedDrafts.length})
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            setSalesSearchError('');
            setShowSavedSalesModal(true);
          }}
        >
          Copy Saved Sale
        </Button>
      </div>

      {draftInfo.hasDraft && (
        <div className="pos-draft-banner" style={{
          backgroundColor: '#fef9c3',
          border: '1px solid #fcd34d',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div>
            <strong>Draft sale in progress</strong>
            {draftTimestampLabel && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#92400e' }}>
                Last saved: {draftTimestampLabel}
              </span>
            )}
          </div>

        </div>
      )}

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
                    {product.available_units && product.available_units.length > 0 && priceMode === 'wholesale' && (
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
                              {unit.name}: {formatCurrency(price)} ({availableQuantity.toFixed(1)} available)
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
                              Standard Price {index + 1} - {formatCurrency(price)}
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
                                {unit.name} ({unit.symbol}) - {formatCurrency(price)}
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
                  {product.packaging_name && (
                    <div className="packaging-info">
                      <small className="packaging-price">
                        Packaging: {product.packaging_name} - {formatCurrency(product.packaging_price_display || product.packaging_price || 0)} (Auto-added)
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
                      {formatCurrency(item.unit_price)}
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
                              type="text"
                              inputMode="decimal"
                              pattern="^\\d+([.,]\\d)?$"
                              value={tempQuantity}
                              onChange={handleQuantityChange}
                              onKeyPress={(e) => handleQuantityKeyPress(e, item)}
                              onBlur={() => handleQuantitySubmit(item)}
                              className="quantity-input"
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
                      {formatCurrency(item.quantity * item.unit_price)}
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
                      <div key={`packaging-${item.packaging_id}`} className="cart-item packaging-item">
                        <div className="item-product">
                          <h4>{item.packaging_name || 'Packaging'}</h4>
                          <p className="item-sku">Packaging Type</p>
                        </div>
                        <div className="item-unit">
                          piece
                        </div>
                        <div className="item-price">
                          {formatCurrency(item.unit_price)}
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
                            onChange={(e) => updatePackagingStatus(item.packaging_id, e.target.value)}
                            className="packaging-status-select"
                          >
                            <option value="consignation">Consigned (Paid)</option>
                            <option value="exchange">Exchange</option>
                            <option value="due">Due (Return Required)</option>
                          </select>
                        </div>
                        <div className="item-total">
                          {formatCurrency(item.total_price || (item.quantity * item.unit_price))}
                        </div>
                        <div className="item-actions">
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => removeFromPackagingCart(item.packaging_id)}
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
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                {packagingCart.length > 0 && (
                  <div className="summary-row packaging-breakdown">
                    <span>Packaging Total:</span>
                    <span>{formatCurrency(calculatePackagingTotal())} </span>
                  </div>
                )}
                <div className="summary-row cost-breakdown">
                  <span>Cost (excl. tax):</span>
                  <span>{formatCurrency(calculateCost())}</span>
                </div>
                <div className="summary-row tax-breakdown">
                  <span>Tax included:</span>
                  <span>{formatCurrency(calculateTax())} </span>
                </div>
                <div className="summary-row">
                  <span>Products Total:</span>
                  <span>{formatCurrency(calculateTotal())} </span>
                </div>
                {packagingCart.length > 0 && (
                  <div className="summary-row">
                    <span>Packaging Total:</span>
                    <span>{formatCurrency(calculatePackagingTotal())}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total (Products Only):</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                  <span>{parseFloat(calculateTotal()*5)}(fmg)</span>
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

      {showSavedSalesModal && (
        <div
          className="drafts-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowSavedSalesModal(false)}
        >
          <div
            className="drafts-modal"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              width: 'min(95vw, 720px)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Copy a Saved Sale</h3>
              <button
                onClick={() => setShowSavedSalesModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <p style={{ marginTop: 0, marginBottom: '0.75rem', color: '#374151' }}>
              Search a saved sale and copy its items into POS. This action is available only when the cart is empty.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchSavedSales(salesSearchTerm.trim());
              }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}
            >
              <input
                type="text"
                placeholder="Sale number or customer name"
                value={salesSearchTerm}
                onChange={(e) => setSalesSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '240px',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db'
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  type="submit"
                  size="small"
                  variant="primary"
                  loading={salesSearchLoading}
                >
                  Search
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="outline"
                  onClick={() => {
                    setSalesSearchTerm('');
                    fetchSavedSales('');
                  }}
                  disabled={salesSearchLoading}
                >
                  Reset
                </Button>
              </div>
            </form>

            {salesSearchError && (
              <div className="error-message" style={{ marginTop: '0.75rem' }}>
                {salesSearchError}
              </div>
            )}

            {salesSearchLoading ? (
              <p style={{ marginTop: '0.75rem' }}>Searching sales...</p>
            ) : (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {salesSearchResults.length === 0 ? (
                  <p style={{ marginBottom: 0 }}>No sales found. Try a different search.</p>
                ) : (
                  salesSearchResults.map((sale) => {
                    const saleDateLabel = sale.created_at
                      ? new Date(sale.created_at).toLocaleString()
                      : '—';
                    const cartNotEmpty = cart.length > 0 || packagingCart.length > 0;
                    return (
                      <div
                        key={sale.id}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          padding: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <strong>{sale.sale_number || `Sale #${sale.id}`}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                              {saleDateLabel}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.95rem', color: '#111827' }}>
                            {sale.customer_name || 'Walk-in Customer'}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            Total: {formatCurrency(sale.total_amount || sale.subtotal || 0)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                          <Button
                            size="small"
                            variant="primary"
                            onClick={() => handleImportSaleIntoPOS(sale.id)}
                            disabled={cartNotEmpty}
                            loading={importingSaleId === sale.id}
                          >
                            Copy to POS
                          </Button>
                          {cartNotEmpty && (
                            <small style={{ color: '#b91c1c' }}>Clear POS items first</small>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showDraftsModal && (
        <div
          className="drafts-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDraftsModal(false)}
        >
          <div
            className="drafts-modal"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              width: 'min(90vw, 600px)',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Saved Drafts</h3>
              <button
                onClick={() => setShowDraftsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            {savedDrafts.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No saved drafts yet. Use "Save Draft" to store the current sale.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {savedDrafts.map(draft => (
                  <div
                    key={draft.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <strong>{draft.name}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        Saved: {new Date(draft.savedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        size="small"
                        onClick={() => handleRestoreSavedDraft(draft.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleDeleteSavedDraft(draft.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PointOfSale;