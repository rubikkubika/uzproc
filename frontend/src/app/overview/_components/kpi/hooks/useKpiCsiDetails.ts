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

/**
 * Детали отзывов CSI по закупщику.
 * Без quarter — месячный режим (нарастающим итогом январь–месяц).
 * С quarter — квартальный режим «Премия 2» (только отзывы квартала).
 */
export function useKpiCsiDetails(year: number, month: number, purchaser: string | null, quarter?: number) {
  const [data, setData] = useState<KpiCsiDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number, m: number, p: string, q?: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = q != null
        ? `${getBackendUrl()}/api/overview/kpi2/csi/feedbacks?${new URLSearchParams({ year: String(y), quarter: String(q), purchaser: p })}`
        : `${getBackendUrl()}/api/overview/kpi/csi/feedbacks?${new URLSearchParams({ year: String(y), month: String(m), purchaser: p })}`;
      const res = await fetch(url);
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
      fetchData(year, month, purchaser, quarter);
    } else {
      setData([]);
    }
  }, [year, month, purchaser, quarter, fetchData]);

  return { data, loading, error, refresh: () => purchaser ? fetchData(year, month, purchaser, quarter) : undefined };
}
