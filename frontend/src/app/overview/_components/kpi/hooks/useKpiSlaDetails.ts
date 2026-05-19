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

export function useKpiSlaDetails(year: number, month: number, purchaser: string | null) {
  const [data, setData] = useState<KpiSlaDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number, m: number, p: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m), purchaser: p });
      const res = await fetch(`${getBackendUrl()}/api/overview/kpi/sla/requests?${params}`);
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
      fetchData(year, month, purchaser);
    } else {
      setData([]);
    }
  }, [year, month, purchaser, fetchData]);

  return { data, loading, error, refresh: () => purchaser ? fetchData(year, month, purchaser) : undefined };
}
