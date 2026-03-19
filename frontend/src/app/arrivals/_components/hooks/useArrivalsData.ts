import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection } from '../types/arrivals.types';

export const useArrivalsData = () => {
  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {},
    incomingDateYear: number | null = null,
    incomingDateNull: boolean = false,
  ): Promise<PageResponse | null> => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));

      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
      }

      if (filters.number && filters.number.trim() !== '') {
        params.append('number', filters.number.trim());
      }
      if (filters.supplierName && filters.supplierName.trim() !== '') {
        params.append('supplierName', filters.supplierName.trim());
      }
      if (filters.invoice && filters.invoice.trim() !== '') {
        params.append('invoice', filters.invoice.trim());
      }
      if (filters.warehouse && filters.warehouse.trim() !== '') {
        params.append('warehouse', filters.warehouse.trim());
      }
      if (filters.operationType && filters.operationType.trim() !== '') {
        params.append('operationType', filters.operationType.trim());
      }
      if (filters.department && filters.department.trim() !== '') {
        params.append('department', filters.department.trim());
      }
      if (filters.incomingNumber && filters.incomingNumber.trim() !== '') {
        params.append('incomingNumber', filters.incomingNumber.trim());
      }
      if (filters.comment && filters.comment.trim() !== '') {
        params.append('comment', filters.comment.trim());
      }
      if (filters.responsibleName && filters.responsibleName.trim() !== '') {
        params.append('responsibleName', filters.responsibleName.trim());
      }
      if (filters.currency && filters.currency.trim() !== '') {
        params.append('currency', filters.currency.trim());
      }

      if (incomingDateNull) {
        params.append('incomingDateNull', 'true');
      } else if (incomingDateYear !== null) {
        params.append('incomingDateYear', String(incomingDateYear));
      }

      const url = `${getBackendUrl()}/api/arrivals?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки данных: ${response.status}. ${errorText}`);
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching arrivals:', err);
      throw err;
    }
  }, []);

  return { fetchData };
};
