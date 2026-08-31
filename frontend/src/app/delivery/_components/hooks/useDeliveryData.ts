import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection } from '../types/delivery.types';
import type { DeliveryTab } from '../ui/DeliveryTableTabs';

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
    shipmentStatus: string = '',
    tab: DeliveryTab | null = null,
    recheck: boolean = false,
    /** Плановая дата поставки (ISO) — фильтр по дню, выбранному на диаграмме */
    plannedDeliveryDate: string | null = null,
    /** «Просрочено» из сводки: не поставлено, плановая дата прошла */
    overdue: boolean = false,
    /** «Поставлено за год» из сводки: статус «Поставлено» + фактическая дата в этом году */
    deliveredYear: number | null = null,
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
        'innerId', 'contractInnerId', 'contractPurchaseRequestId', 'supplierName', 'status',
        'currency', 'comment', 'responsibleName', 'reportStatus', 'paymentsStatus',
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

      if (shipmentStatus && shipmentStatus.trim() !== '') {
        params.append('shipmentStatus', shipmentStatus.trim());
      }

      // Вкладка: 'in-work' | 'closed' | 'closed-review'. null и 'all' → без фильтра (все поставки).
      if (tab !== null && tab !== 'all') {
        params.append('tab', tab);
      }

      if (plannedDeliveryDate) {
        params.append('plannedDeliveryDate', plannedDeliveryDate);
      }

      if (overdue) {
        params.append('overdue', 'true');
      }

      if (deliveredYear !== null) {
        params.append('deliveredYear', String(deliveredYear));
      }

      // recheck=true — при обновлении списка бэкенд пересчитывает статусы (авто-закрытие).
      if (recheck) {
        params.append('recheck', 'true');
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
