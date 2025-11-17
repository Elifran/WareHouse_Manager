import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';

// Cache keys for localStorage
const CATEGORIES_CACHE_KEY = 'pos_categories_cache';
const CATEGORIES_CACHE_TIMESTAMP_KEY = 'pos_categories_cache_timestamp';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour - categories change very rarely

/**
 * Get cached categories from localStorage
 */
const getCachedCategories = () => {
  try {
    const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
    const timestamp = localStorage.getItem(CATEGORIES_CACHE_TIMESTAMP_KEY);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.error('Error reading categories cache:', error);
  }
  return null;
};

/**
 * Save categories to localStorage cache
 */
const saveCategoriesToCache = (categories) => {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
    localStorage.setItem(CATEGORIES_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving categories cache:', error);
  }
};

/**
 * Apply session-based sellable overrides to a categories list
 */
const applySessionSellableStatus = (categories) => {
  if (!categories || categories.length === 0) {
    return categories;
  }

  try {
    const sellableStatus = JSON.parse(sessionStorage.getItem('sellableCategories') || '{}');
    return categories.map(cat => ({
      ...cat,
      is_sellable: Object.prototype.hasOwnProperty.call(sellableStatus, cat.id)
        ? sellableStatus[cat.id]
        : cat.is_sellable
    }));
  } catch (error) {
    console.error('Error applying session sellable status:', error);
    return categories;
  }
};

/**
 * Enhanced categories hook for POS with localStorage persistence
 * @returns {Object} Query result with categories data
 */
export const useCategoriesPOS = () => {
  // Get cached data for initial state
  const cachedCategories = getCachedCategories();
  const hasValidCache = !!cachedCategories;
  const cachedWithSession = hasValidCache ? applySessionSellableStatus(cachedCategories) : undefined;
  
  return useQuery(
    ['categories-pos'],
    async () => {
      // Check cache first - if valid, return immediately
      const cached = getCachedCategories();
      if (cached) {
        // Still fetch in background to update cache
        fetchFreshCategories().then(categories => {
          if (categories) {
            saveCategoriesToCache(categories);
          }
        }).catch(() => {
          // Ignore errors in background fetch
        });
        return applySessionSellableStatus(cached);
      }
      
      // Fetch fresh data
      const categories = await fetchFreshCategories();
      
      // Save to localStorage when data is fetched
      if (categories) {
        saveCategoriesToCache(categories);
      }
      
      return applySessionSellableStatus(categories);
    },
    {
      staleTime: 60 * 60 * 1000, // 1 hour - categories change very rarely
      cacheTime: 2 * 60 * 60 * 1000, // 2 hours - keep in memory cache longer
      refetchOnWindowFocus: false,
      refetchOnMount: !hasValidCache, // Don't refetch on mount if we have valid cache
      refetchOnReconnect: true,
      // Use cached data as initial data if available
      initialData: cachedWithSession,
    }
  );
};

/**
 * Fetch fresh categories from API
 */
const fetchFreshCategories = async () => {
  try {
    const response = await api.get('/api/products/categories/');
    const categoriesData = response.data.results || response.data;
    return applySessionSellableStatus(categoriesData);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return cached data if fetch fails
    const cached = getCachedCategories();
    if (cached) {
      return cached;
    }
    throw error;
  }
};

/**
 * Clear categories cache
 */
export const clearCategoriesCache = () => {
  try {
    localStorage.removeItem(CATEGORIES_CACHE_KEY);
    localStorage.removeItem(CATEGORIES_CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing categories cache:', error);
  }
};

