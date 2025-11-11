import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';

/**
 * Fetch all products with pagination
 * @param {Object} filters - Filter parameters (category, is_active, etc.)
 * @returns {Object} Query result with products data
 */
export const useProducts = (filters = {}) => {
  return useQuery(
    ['products', filters],
    async () => {
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
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes - products don't change often
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );
};

/**
 * Fetch a single product by ID
 */
export const useProduct = (productId) => {
  return useQuery(
    ['product', productId],
    () => api.get(`/api/products/${productId}/`).then(res => res.data),
    {
      enabled: !!productId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );
};

/**
 * Fetch stock availability for a product
 */
export const useProductStock = (productId) => {
  return useQuery(
    ['product-stock', productId],
    () => api.get(`/api/products/${productId}/stock-availability/`).then(res => res.data),
    {
      enabled: !!productId,
      staleTime: 1 * 60 * 1000, // 1 minute - stock changes more frequently
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

/**
 * Invalidate products cache (useful after mutations)
 */
export const useInvalidateProducts = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries(['products']);
  };
};

