import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection } from '../types/delivery.types';
import type { DeliveryQuery } from '../types/delivery-query.types';
import { buildDeliveryQueryParams } from '../utils/delivery-query.utils';

export const useDeliveryData = () => {
  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortField: SortField,
    sortDirection: SortDirection,
    query: DeliveryQuery,
    /** true — при обновлении списка бэкенд пересчитывает статусы (авто-закрытие) */
    recheck: boolean = false,
  ): Promise<PageResponse | null> => {
    const params = buildDeliveryQueryParams(query);
    params.append('page', String(page));
    params.append('size', String(size));
    if (sortField && sortDirection) {
      params.append('sortBy', sortField);
      params.append('sortDir', sortDirection);
    }
    if (recheck) params.append('recheck', 'true');

    const response = await fetch(`${getBackendUrl()}/api/deliveries?${params.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка загрузки данных: ${response.status}. ${errorText}`);
    }
    return response.json();
  }, []);

  return { fetchData };
};
