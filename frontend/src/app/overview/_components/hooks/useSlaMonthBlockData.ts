'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface SlaMonthBlockRequestRow {
  id: number;
  /** Номер заявки (idPurchaseRequest) */
  idPurchaseRequest: number | null;
  /** Наименование: title или name */
  name: string;
  /** Сумма (budgetAmount) */
  budgetAmount: number | null;
  /** Закупщик */
  purchaser: string | null;
  /** Сложность (из плана закупок) */
  complexity: string | null;
  /** Статус заявки */
  status: string | null;
}

export interface SlaMonthBlockData {
  requests: SlaMonthBlockRequestRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Хук: заявки на закупку по дате создания за указанный месяц (purchaseRequestCreationDate).
 */
export function useSlaMonthBlockData(year: number, month: number): SlaMonthBlockData {
  const [requests, setRequests] = useState<SlaMonthBlockRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (year == null || month == null) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getBackendUrl();
      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('size', '2000');
      params.set('year', String(year));
      params.set('month', String(month + 1));
      params.set('requiresPurchase', 'true');
      const res = await fetch(`${baseUrl}/api/purchase-requests?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Ошибка загрузки заявок');
      }
      const data = await res.json();
      const content = data.content ?? [];
      const rows: SlaMonthBlockRequestRow[] = content.map(
        (r: { id?: number; idPurchaseRequest?: number | null; title?: string | null; name?: string | null; budgetAmount?: number | null; purchaser?: string | null; complexity?: string | null; status?: string | null }) => ({
          id: r.id ?? 0,
          idPurchaseRequest: r.idPurchaseRequest ?? null,
          name: [r.title, r.name].find(Boolean)?.trim() || '—',
          budgetAmount: r.budgetAmount ?? null,
          purchaser: r.purchaser ?? null,
          complexity: r.complexity ?? null,
          status: r.status ?? null,
        })
      );
      setRequests(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    requests,
    loading,
    error,
    refetch: fetchData,
  };
}
