'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface KpiSlaDetail {
  id: number | null;
  idPurchaseRequest: number | null;
  name: string | null;
  status: string | null;
  complexity: string | null;
  budgetAmount: number | null;
  plannedSlaDays: number | null;
  factualSlaDays: number | null;
  diffDays: number | null;
  metSla: boolean | null;
  approvalAssignmentDate: string | null;
  purchaseCompletionDate: string | null;
}

/**
 * Детали KPI SLA по закупщику.
 * Без quarter — месячный режим (нарастающим итогом январь–месяц).
 * С quarter — квартальный режим «Премия 2» (только завершённые в квартале).
 */
export function useKpiSlaDetails(year: number, month: number, purchaser: string | null, quarter?: number) {
  const [data, setData] = useState<KpiSlaDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number, m: number, p: string, q?: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = q != null
        ? `${getBackendUrl()}/api/overview/kpi2/sla/requests?${new URLSearchParams({ year: String(y), quarter: String(q), purchaser: p })}`
        : `${getBackendUrl()}/api/overview/kpi/sla/requests?${new URLSearchParams({ year: String(y), month: String(m), purchaser: p })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки деталей SLA');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (purchaser) {
      fetchData(year, month, purchaser, quarter);
    } else {
      setData([]);
    }
  }, [year, month, purchaser, quarter, fetchData]);

  return { data, loading, error, refresh: () => purchaser ? fetchData(year, month, purchaser, quarter) : undefined };
}
