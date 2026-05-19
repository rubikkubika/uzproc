'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { KpiSlaData } from '../types/kpi.types';

export function useKpiSlaData(year: number, month: number) {
  const [data, setData] = useState<KpiSlaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/overview/kpi/sla?year=${y}&month=${m}`);
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
    fetchData(year, month);
  }, [year, month, fetchData]);

  return { data, loading, error };
}
