import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';

// Cache keys for localStorage
const PRODUCTS_CACHE_KEY = 'pos_products_cache';
const PRODUCTS_CACHE_TIMESTAMP_KEY = 'pos_products_cache_timestamp';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached products from localStorage
 */
const getCachedProducts = () => {
  try {
    const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
    const timestamp = localStorage.getItem(PRODUCTS_CACHE_TIMESTAMP_KEY);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.error('Error reading products cache:', error);
  }
  return null;
};

/**
 * Save products to localStorage cache
 */
const saveProductsToCache = (products) => {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(PRODUCTS_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving products cache:', error);
  }
};

/**
 * Enhanced products hook for POS with localStorage persistence
 * @param {Object} filters - Filter parameters (category, is_active, etc.)
 * @returns {Object} Query result with products data
 */
export const useProductsPOS = (filters = {}) => {
  // Get cached data for initial state
  const cachedProducts = getCachedProducts();
  const hasValidCache = cachedProducts && (!filters.category || filters.category === '');
  
  return useQuery(
    ['products-pos', filters],
    async () => {
      // Check cache first - if valid and no category filter, return immediately
      const cached = getCachedProducts();
      const isValidCache = cached && (!filters.category || filters.category === '');
      
      if (isValidCache) {
        // Still fetch in background to update cache
        fetchFreshProducts(filters).then(products => {
          if (products && (!filters.category || filters.category === '')) {
            saveProductsToCache(products);
          }
        }).catch(() => {
          // Ignore errors in background fetch
        });
        return cached;
      }
      
      // Fetch fresh data
      const products = await fetchFreshProducts(filters);
      
      // Save to localStorage when data is fetched (only for all products, not filtered)
      if (products && (!filters.category || filters.category === '')) {
        saveProductsToCache(products);
      }
      
      return products;
    },
    {
      staleTime: 30 * 60 * 1000, // 30 minutes - longer cache for POS
      cacheTime: 60 * 60 * 1000, // 1 hour - keep in memory cache longer
      refetchOnWindowFocus: false,
      refetchOnMount: !hasValidCache, // Don't refetch on mount if we have valid cache
      refetchOnReconnect: true,
      // Use cached data as initial data if available
      initialData: hasValidCache ? cachedProducts : undefined,
    }
  );
};

/**
 * Fetch fresh products from API
 */
const fetchFreshProducts = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    // Always filter for active products
    if (filters.is_active !== false) {
      params.append('is_active', 'true');
    }
    
    // Add category filter if provided
    if (filters.category) {
      params.append('category', filters.category);
    }
    
    const baseUrl = `/api/products/${params.toString() ? '?' + params.toString() : ''}`;
    let response = await api.get(baseUrl);
    let aggregatedProducts = Array.isArray(response.data.results) 
      ? response.data.results 
      : (Array.isArray(response.data) ? response.data : []);
    
    // Follow pagination to get all products (DRF-style "next" links)
    let nextUrl = response.data.next;
    while (nextUrl) {
      response = await api.get(nextUrl);
      const pageItems = Array.isArray(response.data.results) 
        ? response.data.results 
        : (Array.isArray(response.data) ? response.data : []);
      aggregatedProducts = aggregatedProducts.concat(pageItems);
      nextUrl = response.data.next;
    }
    
    return aggregatedProducts;
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return cached data if fetch fails
    const cached = getCachedProducts();
    if (cached) {
      return cached;
    }
    throw error;
  }
};

/**
 * Clear products cache
 */
export const clearProductsCache = () => {
  try {
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    localStorage.removeItem(PRODUCTS_CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing products cache:', error);
  }
};

