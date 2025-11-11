import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';

export const usePurchaseOrders = () => {
  return useQuery(
    ['purchase-orders'],
    async () => {
      const res = await api.get('/api/purchases/purchase-orders/');
      return res.data.results || res.data || [];
    },
    {
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const useSuppliers = () => {
  return useQuery(
    ['suppliers'],
    async () => {
      const res = await api.get('/api/purchases/suppliers/');
      return res.data.results || res.data || [];
    },
    {
      staleTime: 10 * 60 * 1000,
      cacheTime: 20 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const usePendingDeliveries = () => {
  return useQuery(
    ['deliveries', 'pending'],
    async () => {
      const res = await api.get('/api/purchases/deliveries/pending/');
      return res.data.results || res.data || [];
    },
    {
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const useAllDeliveries = () => {
  return useQuery(
    ['deliveries', 'all'],
    async () => {
      const res = await api.get('/api/purchases/deliveries/');
      return res.data.results || res.data || [];
    },
    {
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const useInvalidatePurchases = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries(['purchase-orders']);
    qc.invalidateQueries(['suppliers']);
    qc.invalidateQueries(['deliveries']);
  };
};


