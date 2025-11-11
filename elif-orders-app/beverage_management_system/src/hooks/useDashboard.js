import { useQuery } from 'react-query';
import api from '../services/api';

export const useDashboard = (period = 'month', isSalesTeam = false) => {
  return useQuery(
    ['dashboard', period, isSalesTeam],
    async () => {
      const url = isSalesTeam
        ? '/reports/dashboard/'
        : `/reports/dashboard/?period=${period}`;
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


