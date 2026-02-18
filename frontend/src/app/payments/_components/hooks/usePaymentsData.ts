import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection } from '../types/payments.types';

export const usePaymentsData = () => {
  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {},
    cfoFilter: Set<string> = new Set(),
    linkedOnly: boolean = false,
    paymentStatus: string = '',
    requestStatus: string = ''
  ): Promise<PageResponse | null> => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));

      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
      }

      if (filters.mainId && filters.mainId.trim() !== '') {
        params.append('mainId', filters.mainId.trim());
      }

      if (filters.comment && filters.comment.trim() !== '') {
        params.append('comment', filters.comment.trim());
      }

      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => params.append('cfo', cfo));
      }

      if (paymentStatus && paymentStatus.trim() !== '') {
        params.append('paymentStatus', paymentStatus.trim());
      }

      if (requestStatus && requestStatus.trim() !== '') {
        params.append('requestStatus', requestStatus.trim());
      }

      if (linkedOnly) {
        params.append('linkedOnly', 'true');
      }

      const url = `${getBackendUrl()}/api/payments?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки данных: ${response.status}. ${errorText}`);
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching payments:', err);
      throw err;
    }
  }, []);

  return { fetchData };
};
