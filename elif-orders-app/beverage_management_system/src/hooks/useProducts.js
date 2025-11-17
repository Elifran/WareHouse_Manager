import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';

export const useProducts = (filters = {}) => {
  return useQuery(
    ['products', filters],
    async () => {
      const params = new URLSearchParams();

      if (filters.is_active !== false) {
        params.append('is_active', 'true');
      }
      if (filters.category) {
        params.append('category', filters.category);
      }

      const baseUrl = `/api/products/${params.toString() ? '?' + params.toString() : ''}`;
      let response = await api.get(baseUrl);
      let aggregatedProducts = Array.isArray(response.data.results)
        ? response.data.results
        : (Array.isArray(response.data) ? response.data : []);

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
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const useCategories = () => {
  return useQuery(
    ['categories'],
    async () => {
      const response = await api.get('/api/products/categories/');
      const data = response.data;
      if (data.results) {
        return data.results;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    },
    {
      staleTime: 10 * 60 * 1000,
      cacheTime: 20 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const useUnits = () => {
  return useQuery(
    ['units'],
    async () => {
      let allUnitsData = [];
      let nextUrl = '/api/products/units/';

      while (nextUrl) {
        const response = await api.get(nextUrl);
        const data = response.data;
        if (data.results) {
          allUnitsData = [...allUnitsData, ...data.results];
          nextUrl = data.next;
        } else {
          allUnitsData = data;
          nextUrl = null;
        }
      }

      const baseUnitsResponse = await api.get('/api/products/base-units/');
      const baseUnitsData = baseUnitsResponse.data.results || baseUnitsResponse.data;

      return { allUnits: allUnitsData, baseUnits: baseUnitsData };
    },
    {
      staleTime: 10 * 60 * 1000,
      cacheTime: 20 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const useTaxClasses = () => {
  return useQuery(
    ['tax-classes'],
    async () => {
      const response = await api.get('/api/products/tax-classes/');
      return response.data.results || response.data || [];
    },
    {
      staleTime: 10 * 60 * 1000,
      cacheTime: 20 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

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

export const useInvalidateProducts = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries(['products']);
  };
};


