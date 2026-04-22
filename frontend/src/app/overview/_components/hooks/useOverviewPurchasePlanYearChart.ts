'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface MonthExecutionPoint {
  month: number;
  planned: number;
  initiated: number;
  pct: number;
}

export interface OverviewPurchasePlanYearChartResult {
  points: MonthExecutionPoint[];
  loading: boolean;
  error: string | null;
}

export function useOverviewPurchasePlanYearChart(
  year: number,
  enabled: boolean
): OverviewPurchasePlanYearChartResult {
  const [points, setPoints] = useState<MonthExecutionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setPoints([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(
        `${baseUrl}/api/overview/purchase-plan-months?year=${year}&months=1,2,3,4,5,6,7,8,9,10,11,12`
      );
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      const pts: MonthExecutionPoint[] = (json.months ?? []).map(
        (m: { month: number; positionsMarketCount?: number; positionsLinkedToRequestCount?: number }) => {
          const planned = m.positionsMarketCount ?? 0;
          const initiated = m.positionsLinkedToRequestCount ?? 0;
          const pct = planned > 0 ? Math.round((initiated / planned) * 100) : 0;
          return { month: m.month, planned, initiated, pct };
        }
      );
      setPoints(pts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [year, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { points, loading, error };
}
