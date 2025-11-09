import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';

/**
 * Fetch all categories
 * @returns {Object} Query result with categories data
 */
export const useCategories = () => {
  return useQuery(
    ['categories'],
    async () => {
      const response = await api.get('/api/products/categories/');
      let categoriesData = response.data.results || response.data;
      
      // Load session-based sellable status from sessionStorage
      const sellableStatus = JSON.parse(sessionStorage.getItem('sellableCategories') || '{}');
      
      // Apply session-based sellable status
      categoriesData = categoriesData.map(cat => {
        const isSellable = sellableStatus.hasOwnProperty(cat.id) 
          ? sellableStatus[cat.id] 
          : cat.is_sellable;
        return {
          ...cat,
          is_sellable: isSellable
        };
      });
      
      return categoriesData;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - categories change rarely
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
    }
  );
};

/**
 * Invalidate categories cache
 */
export const useInvalidateCategories = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries(['categories']);
  };
};

