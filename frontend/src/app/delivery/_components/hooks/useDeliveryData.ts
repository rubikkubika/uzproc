import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection } from '../types/delivery.types';

export const useDeliveryData = () => {
  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {},
    dateYear: number | null = null,
    dateNull: boolean = false,
    paymentScheme: string = '',
  ): Promise<PageResponse | null> => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));

      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
      }

      const passthroughFields: Array<keyof typeof filters> = [
        'innerId', 'contractInnerId', 'supplierName', 'status',
        'currency', 'comment', 'responsibleName',
      ];
      for (const f of passthroughFields) {
        const v = filters[f];
        if (v && v.trim() !== '') params.append(f, v.trim());
      }

      if (dateNull) {
        params.append('dateNull', 'true');
      } else if (dateYear !== null) {
        params.append('dateYear', String(dateYear));
      }

      if (paymentScheme && paymentScheme.trim() !== '') {
        params.append('paymentScheme', paymentScheme.trim());
      }

      const url = `${getBackendUrl()}/api/deliveries?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки данных: ${response.status}. ${errorText}`);
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      throw err;
    }
  }, []);

  return { fetchData };
};
