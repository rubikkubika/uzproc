'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface OverviewSlaRequestRow {
  id: number;
  idPurchaseRequest: number | null;
  name: string;
  budgetAmount: number | null;
  purchaser: string | null;
  complexity: string | null;
  status: string | null;
  approvalAssignmentDate: string | null;
  purchaseCompletionDate: string | null;
}

export interface OverviewSlaBlock {
  statusGroup: string;
  requests: OverviewSlaRequestRow[];
}

export interface OverviewSlaData {
  year: number;
  statusBlocks: OverviewSlaBlock[];
}

/**
 * Один запрос на бэкенд /api/overview/sla вместо трёх (по одному на каждую группу статусов).
 */
export function useOverviewSlaData(year: number | null) {
  const [data, setData] = useState<OverviewSlaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (year == null) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/overview/sla?year=${year}`);
      if (!res.ok) {
        throw new Error('Ошибка загрузки данных SLA');
      }
      const json = await res.json();
      const blocks: OverviewSlaBlock[] = (json.statusBlocks ?? []).map(
        (b: { statusGroup?: string; requests?: unknown[] }) => ({
          statusGroup: b.statusGroup ?? '',
          requests: (b.requests ?? []).map(
            (r: {
              id?: number;
              idPurchaseRequest?: number | null;
              name?: string;
              budgetAmount?: number | null;
              purchaser?: string | null;
              complexity?: string | null;
              status?: string | null;
              approvalAssignmentDate?: string | null;
              purchaseCompletionDate?: string | null;
            }) => ({
              id: r.id ?? 0,
              idPurchaseRequest: r.idPurchaseRequest ?? null,
              name: r.name ?? '—',
              budgetAmount: r.budgetAmount != null ? Number(r.budgetAmount) : null,
              purchaser: r.purchaser ?? null,
              complexity: r.complexity ?? null,
              status: r.status ?? null,
              approvalAssignmentDate: r.approvalAssignmentDate ?? null,
              purchaseCompletionDate: r.purchaseCompletionDate ?? null,
            })
          ),
        })
      );
      setData({
        year: json.year ?? year,
        statusBlocks: blocks,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
