import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';

/**
 * Fetch sales with pagination and filters
 * @param {Object} params - Query parameters (page, page_size, filters)
 * @returns {Object} Query result with sales data
 */
export const useSales = (params = {}) => {
  const {
    page = 1,
    pageSize = 20,
    status,
    customer_name,
    start_date,
    end_date,
    sale_number,
    payment_status,
    ...otherParams
  } = params;

  return useQuery(
    ['sales', { page, pageSize, status, customer_name, start_date, end_date, sale_number, payment_status, ...otherParams }],
    async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('page_size', pageSize.toString());
      
      if (status) queryParams.append('status', status);
      if (customer_name) queryParams.append('search', customer_name);
      if (start_date) queryParams.append('created_at__date__gte', start_date);
      if (end_date) queryParams.append('created_at__date__lte', end_date);
      if (sale_number) queryParams.append('sale_number', sale_number);
      if (payment_status) queryParams.append('payment_status', payment_status);
      
      const response = await api.get(`/api/sales/?${queryParams.toString()}`);
      const salesData = response.data.results || response.data;
      
      return {
        sales: Array.isArray(salesData) ? salesData : [],
        count: response.data.count || salesData.length,
        totalPages: response.data.count 
          ? Math.ceil(response.data.count / pageSize) 
          : 1,
        currentPage: page,
      };
    },
    {
      staleTime: 1 * 60 * 1000, // 1 minute - sales change frequently
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

/**
 * Fetch a single sale by ID
 */
export const useSale = (saleId) => {
  return useQuery(
    ['sale', saleId],
    () => api.get(`/api/sales/${saleId}/`).then(res => res.data),
    {
      enabled: !!saleId,
      staleTime: 1 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
    }
  );
};

/**
 * Fetch pending sales
 */
export const usePendingSales = () => {
  return useQuery(
    ['sales', 'pending'],
    () => api.get('/api/sales/pending/').then(res => res.data),
    {
      staleTime: 30 * 1000, // 30 seconds - pending sales change frequently
      cacheTime: 2 * 60 * 1000,
      refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    }
  );
};

/**
 * Invalidate sales cache
 */
export const useInvalidateSales = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries(['sales']);
  };
};

