'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface KpiCsiDetail {
  id: number;
  purchaseRequestId: number | null;
  idPurchaseRequest: number | null;
  purchaseRequestName: string | null;
  recipient: string | null;
  speedRating: number | null;
  qualityRating: number | null;
  satisfactionRating: number | null;
  uzprocRating: number | null;
  avgRating: number | null;
  comment: string | null;
  createdAt: string | null;
}

export function useKpiCsiDetails(year: number, month: number, purchaser: string | null) {
  const [data, setData] = useState<KpiCsiDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number, m: number, p: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m), purchaser: p });
      const res = await fetch(`${getBackendUrl()}/api/overview/kpi/csi/feedbacks?${params}`);
      if (!res.ok) throw new Error('Ошибка загрузки деталей CSI');
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
