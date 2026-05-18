'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface KpiPurchaseDetail {
  idPurchaseRequest: number | null;
  cfo: string | null;
  purchaser: string | null;
  name: string | null;
  purchaseCreationDate: string | null;
  commissionCompletionDate: string | null;
  budgetAmount: number | null;
  savings: number | null;
  savingsType: string | null;
  status: string | null;
  complexity: string | null;
  excludeFromKpi: boolean;
  excludeFromKpiComment: string | null;
  autoExcludedFromKpi: boolean;
  purchaseMethod: string | null;
  statusGroup: string | null;
}

export function useKpiPurchaseDetails(year: number, month: number, purchaser: string | null) {
  const [data, setData] = useState<KpiPurchaseDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number, m: number, p: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m), purchaser: p });
      const res = await fetch(`${getBackendUrl()}/api/overview/savings/purchases?${params}`);
      if (!res.ok) throw new Error('Ошибка загрузки деталей');
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
