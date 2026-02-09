'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface SlaStatusBlockRequestRow {
  id: number;
  /** Номер заявки (idPurchaseRequest) */
  idPurchaseRequest: number | null;
  name: string;
  /** Сумма (budgetAmount) */
  budgetAmount: number | null;
  /** Закупщик */
  purchaser: string | null;
  /** Сложность (из плана закупок) */
  complexity: string | null;
  status: string | null;
  /** Дата назначения на утверждение (ISO string или null) */
  approvalAssignmentDate: string | null;
  /** Дата завершения закупки (ISO string или null; для статусов Договор в работе / Договор подписан) */
  purchaseCompletionDate: string | null;
  /** Количество комментариев SLA */
  slaCommentCount: number;
}

export interface SlaStatusBlockData {
  requests: SlaStatusBlockRequestRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Хук: заявки на закупку (requiresPurchase=true) по группе статусов и году назначения на утверждение.
 */
export function useSlaStatusBlockData(statusGroup: string, year: number | null): SlaStatusBlockData {
  const [requests, setRequests] = useState<SlaStatusBlockRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!statusGroup?.trim()) {
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
      params.set('requiresPurchase', 'true');
      params.set('statusGroup', statusGroup.trim());
      if (year != null) {
        params.set('approvalAssignmentYear', String(year));
      }
      const res = await fetch(`${baseUrl}/api/purchase-requests?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Ошибка загрузки заявок');
      }
      const data = await res.json();
      const content = data.content ?? [];
      const rows: SlaStatusBlockRequestRow[] = content.map(
        (r: { id?: number; idPurchaseRequest?: number | null; title?: string | null; name?: string | null; budgetAmount?: number | null; purchaser?: string | null; complexity?: string | null; status?: string | null; approvalAssignmentDate?: string | null; purchaseCompletionDate?: string | null; slaCommentCount?: number }) => ({
          id: r.id ?? 0,
          idPurchaseRequest: r.idPurchaseRequest ?? null,
          name: [r.title, r.name].find(Boolean)?.trim() || '—',
          budgetAmount: r.budgetAmount ?? null,
          purchaser: r.purchaser ?? null,
          complexity: r.complexity ?? null,
          status: r.status ?? null,
          approvalAssignmentDate: r.approvalAssignmentDate ?? null,
          purchaseCompletionDate: r.purchaseCompletionDate ?? null,
          slaCommentCount: r.slaCommentCount ?? 0,
        })
      );
      setRequests(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusGroup, year]);

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
