'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { DeliveryResponsibleSummary } from '../types/delivery-summary.types';

const EMPTY: DeliveryResponsibleSummary = {
  year: new Date().getFullYear(),
  shipmentStatuses: [],
  paymentStatuses: [],
  items: [],
};

/**
 * Сводка поставок по ответственным (ФИО). Как и сводки в заявках и договорах,
 * не зависит от фильтров основной таблицы и от вкладки — всегда показывает картину целиком.
 * Перезагружается только при смене года и по внешнему ключу обновления.
 */
export function useDeliveryResponsibleSummary(year: number, reloadKey: number = 0) {
  const [summary, setSummary] = useState<DeliveryResponsibleSummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/responsible-summary?year=${year}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSummary(await res.json() as DeliveryResponsibleSummary);
    } catch (err) {
      console.error('Не удалось загрузить сводку по ответственным:', err);
      setSummary({ ...EMPTY, year });
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, reloadKey]);

  return { summary, loading, refreshSummary: fetchSummary };
}
