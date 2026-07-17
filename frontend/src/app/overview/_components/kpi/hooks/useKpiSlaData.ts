'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { KpiSlaData } from '../types/kpi.types';

/**
 * Данные KPI «SLA».
 * Без quarter — месячный режим (нарастающим итогом январь–месяц, /kpi/sla).
 * С quarter — квартальный режим «Премия 2» (только завершённые в квартале, /kpi2/sla).
 */
export function useKpiSlaData(year: number, month: number, quarter?: number) {
  const [data, setData] = useState<KpiSlaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number, m: number, q?: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = q != null
        ? `${getBackendUrl()}/api/overview/kpi2/sla?year=${y}&quarter=${q}`
        : `${getBackendUrl()}/api/overview/kpi/sla?year=${y}&month=${m}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки KPI SLA');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year, month, quarter);
  }, [year, month, quarter, fetchData]);

  return { data, loading, error };
}
