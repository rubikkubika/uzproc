import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection } from '../types/suppliers.types';

export function useSuppliersData() {
  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortField: SortField,
    sortDirection: SortDirection,
    filters: Record<string, string>
  ): Promise<PageResponse | null> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));

    if (sortField && sortDirection) {
      params.append('sortBy', sortField);
      params.append('sortDir', sortDirection);
    }

    if (filters.type?.trim()) params.append('type', filters.type.trim());
    if (filters.kpp?.trim()) params.append('kpp', filters.kpp.trim());
    if (filters.inn?.trim()) params.append('inn', filters.inn.trim());
    if (filters.code?.trim()) params.append('code', filters.code.trim());
    if (filters.name?.trim()) params.append('name', filters.name.trim());

    const url = `${getBackendUrl()}/api/suppliers?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки поставщиков: ${response.status}`);
    }
    return response.json();
  }, []);

  return { fetchData };
}
