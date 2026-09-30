'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { DeliveryDashboardFetchState } from '../types/delivery-dashboards.types';

/**
 * Общая загрузка данных дэшборда по поставкам за год: GET {endpoint}?year=.
 * Ответ устаревшего запроса (год сменили, пока он шёл) игнорируется.
 *
 * @param endpoint путь относительно getBackendUrl()
 * @param year     год
 * @param enabled  вкладка активна — только тогда выполняется запрос
 * @param errorMessage текст ошибки для пользователя
 */
export function useDeliveryDashboardFetch<T>(
  endpoint: string,
  year: number,
  enabled: boolean,
  errorMessage: string
): DeliveryDashboardFetchState<T> & { refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Номер последнего запроса: ответы более ранних запросов отбрасываются
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year) });
      const res = await fetch(`${getBackendUrl()}${endpoint}?${params}`);
      if (!res.ok) throw new Error(errorMessage);
      const json = (await res.json()) as T;
      if (requestId === requestIdRef.current) setData(json);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : errorMessage);
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [endpoint, year, enabled, errorMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
