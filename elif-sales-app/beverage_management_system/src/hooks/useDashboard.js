import { useQuery } from 'react-query';
import api from '../services/api';

/**
 * Fetch dashboard data
 * @param {string} period - Time period (daily, weekly, monthly)
 * @param {boolean} isSalesTeam - Whether user is sales team
 * @returns {Object} Query result with dashboard data
 */
export const useDashboard = (period = 'daily', isSalesTeam = false) => {
  return useQuery(
    ['dashboard', period, isSalesTeam],
    async () => {
      const url = isSalesTeam 
        ? '/api/reports/dashboard/' 
        : `/api/reports/dashboard/?period=${period}`;
      const response = await api.get(url);
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

/**
 * Fetch top products
 */
export const useTopProducts = (period = 'daily', isSalesTeam = false, offset = 0, limit = 10) => {
  return useQuery(
    ['top-products', period, isSalesTeam, offset, limit],
    async () => {
      const url = isSalesTeam
        ? `/api/reports/top-products/?offset=${offset}&limit=${limit}`
        : `/api/reports/top-products/?period=${period}&offset=${offset}&limit=${limit}`;
      const response = await api.get(url);
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

