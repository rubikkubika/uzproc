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
  /** Плановый СЛА (рабочих дней) из заявки; для сложности 4 может быть задан вручную */
  plannedSlaDays: number | null;
  status: string | null;
  approvalAssignmentDate: string | null;
  purchaseCompletionDate: string | null;
  slaCommentCount?: number;
}

export interface OverviewSlaBlock {
  statusGroup: string;
  requests: OverviewSlaRequestRow[];
}

/** Процент уложившихся в плановый SLA по месяцу назначения (месяц 1–12). */
export interface OverviewSlaPercentageByMonth {
  month: number;
  totalCompleted: number;
  metSla: number;
  percentage: number | null;
}

/** Выполнение СЛА по году в разрезе закупщиков. */
export interface OverviewSlaPercentageByPurchaser {
  purchaser: string;
  totalCompleted: number;
  metSla: number;
  percentage: number | null;
}

export interface OverviewSlaData {
  year: number;
  statusBlocks: OverviewSlaBlock[];
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  slaPercentageByPurchaser: OverviewSlaPercentageByPurchaser[];
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
      type RawSlaRequest = {
        id?: number;
        idPurchaseRequest?: number | null;
        name?: string;
        budgetAmount?: number | null;
        purchaser?: string | null;
        complexity?: string | null;
        plannedSlaDays?: number | null;
        status?: string | null;
        approvalAssignmentDate?: string | null;
        purchaseCompletionDate?: string | null;
        slaCommentCount?: number;
      };
      const blocks: OverviewSlaBlock[] = (json.statusBlocks ?? []).map(
        (b: { statusGroup?: string; requests?: RawSlaRequest[] }) => ({
          statusGroup: b.statusGroup ?? '',
          requests: ((b.requests ?? []) as RawSlaRequest[]).map((r) => ({
            id: r.id ?? 0,
            idPurchaseRequest: r.idPurchaseRequest ?? null,
            name: r.name ?? '—',
            budgetAmount: r.budgetAmount != null ? Number(r.budgetAmount) : null,
            purchaser: r.purchaser ?? null,
            complexity: r.complexity ?? null,
            plannedSlaDays: r.plannedSlaDays != null ? Number(r.plannedSlaDays) : null,
            status: r.status ?? null,
            approvalAssignmentDate: r.approvalAssignmentDate ?? null,
            purchaseCompletionDate: r.purchaseCompletionDate ?? null,
            slaCommentCount: r.slaCommentCount ?? 0,
          })),
        })
      );
      const slaPercentageByMonth: OverviewSlaPercentageByMonth[] = (json.slaPercentageByMonth ?? []).map(
        (m: { month?: number; totalCompleted?: number; metSla?: number; percentage?: number | null }) => ({
          month: m.month ?? 0,
          totalCompleted: m.totalCompleted ?? 0,
          metSla: m.metSla ?? 0,
          percentage: m.percentage != null ? Number(m.percentage) : null,
        })
      );
      const slaPercentageByPurchaser: OverviewSlaPercentageByPurchaser[] = (json.slaPercentageByPurchaser ?? []).map(
        (p: { purchaser?: string; totalCompleted?: number; metSla?: number; percentage?: number | null }) => ({
          purchaser: p.purchaser ?? '—',
          totalCompleted: p.totalCompleted ?? 0,
          metSla: p.metSla ?? 0,
          percentage: p.percentage != null ? Number(p.percentage) : null,
        })
      );
      setData({
        year: json.year ?? year,
        statusBlocks: blocks,
        slaPercentageByMonth,
        slaPercentageByPurchaser,
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
