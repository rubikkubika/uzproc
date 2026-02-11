'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type {
  OverviewPlanVersion,
  OverviewPlanItem,
  CfoSummaryRow,
  PurchasePlanMonthBlockData,
} from './usePurchasePlanMonthBlockData';

export interface OverviewPurchasePlanMonthsResult {
  year: number;
  months: PurchasePlanMonthBlockData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Один запрос на бэкенд /api/overview/purchase-plan-months вместо нескольких (versions/year + versions/id/items + purchase-requests по каждому месяцу).
 * Запрос выполняется только когда enabled === true (вкладка «План закупок» активна).
 */
export function useOverviewPurchasePlanMonthsData(
  year: number,
  months: number[],
  enabled: boolean
): OverviewPurchasePlanMonthsResult {
  const [monthsData, setMonthsData] = useState<PurchasePlanMonthBlockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || months.length === 0) {
      setMonthsData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getBackendUrl();
      const monthsParam = months.join(',');
      const res = await fetch(
        `${baseUrl}/api/overview/purchase-plan-months?year=${year}&months=${monthsParam}`
      );
      if (!res.ok) {
        throw new Error('Ошибка загрузки данных плана закупок');
      }
      const json = await res.json();
      const blocks: PurchasePlanMonthBlockData[] = (json.months ?? []).map(
        (m: {
          version?: { id: number; versionNumber: number; year: number; description?: string | null; createdAt?: string; isCurrent?: boolean; itemsCount?: number } | null;
          items?: unknown[];
          itemsMarket?: unknown[];
          positionsCount?: number;
          positionsMarketCount?: number;
          positionsLinkedToRequestCount?: number;
          positionsExcludedCount?: number;
          requestsPurchaseCreatedInMonthCount?: number;
          requestsPurchasePlannedCount?: number;
          requestsPurchaseNonPlannedCount?: number;
          requestsPurchaseUnapprovedCount?: number;
          requestsPurchaseExcludedCount?: number;
          summaryByCfo?: unknown[];
        }) => {
          const version: OverviewPlanVersion | null = m.version
            ? {
                id: m.version.id,
                versionNumber: m.version.versionNumber,
                year: m.version.year,
                description: m.version.description ?? null,
                createdAt: m.version.createdAt
                  ? new Date(m.version.createdAt).toISOString()
                  : '',
                isCurrent: m.version.isCurrent ?? false,
                itemsCount: m.version.itemsCount,
              }
            : null;
          type RawPlanItem = { id?: number; requestDate?: string | null; purchaserCompany?: string | null; purchaseRequestId?: number | null; status?: string | null; cfo?: string | null; budgetAmount?: number | null };
          const mapItem = (i: RawPlanItem): OverviewPlanItem => ({
            id: i.id ?? 0,
            requestDate: i.requestDate ?? null,
            purchaserCompany: i.purchaserCompany ?? null,
            purchaseRequestId: i.purchaseRequestId ?? null,
            status: i.status ?? null,
            cfo: i.cfo ?? null,
            budgetAmount: i.budgetAmount != null ? Number(i.budgetAmount) : null,
          });
          const items: OverviewPlanItem[] = ((m.items ?? []) as RawPlanItem[]).map(mapItem);
          const itemsMarket: OverviewPlanItem[] = ((m.itemsMarket ?? []) as RawPlanItem[]).map(mapItem);
          type RawCfoSummary = {
            cfo?: string;
            market?: number;
            linked?: number;
            excluded?: number;
            requestsPurchase?: number;
            requestsPlanned?: number;
            requestsNonPlanned?: number;
            requestsUnapproved?: number;
            requestsExcluded?: number;
            sumMarket?: number;
            sumRequests?: number;
          };
          const summaryByCfo: CfoSummaryRow[] = ((m.summaryByCfo ?? []) as RawCfoSummary[]).map((r) => ({
            cfo: r.cfo ?? '—',
            market: r.market ?? 0,
            linked: r.linked ?? 0,
            excluded: r.excluded ?? 0,
            requestsPurchase: r.requestsPurchase ?? 0,
            requestsPlanned: r.requestsPlanned ?? 0,
            requestsNonPlanned: r.requestsNonPlanned ?? 0,
            requestsUnapproved: r.requestsUnapproved ?? 0,
            requestsExcluded: r.requestsExcluded ?? 0,
            sumMarket: Number(r.sumMarket ?? 0),
            sumRequests: Number(r.sumRequests ?? 0),
          }));
          return {
            version,
            items,
            positionsCount: m.positionsCount ?? 0,
            itemsMarket,
            positionsMarketCount: m.positionsMarketCount ?? 0,
            positionsLinkedToRequestCount: m.positionsLinkedToRequestCount ?? 0,
            positionsExcludedCount: m.positionsExcludedCount ?? 0,
            requestsPurchaseCreatedInMonthCount: m.requestsPurchaseCreatedInMonthCount ?? 0,
            requestsPurchasePlannedCount: m.requestsPurchasePlannedCount ?? 0,
            requestsPurchaseNonPlannedCount: m.requestsPurchaseNonPlannedCount ?? 0,
            requestsPurchaseUnapprovedCount: m.requestsPurchaseUnapprovedCount ?? 0,
            requestsPurchaseExcludedCount: m.requestsPurchaseExcludedCount ?? 0,
            summaryByCfo,
            loading: false,
            error: null,
            refetch: () => {},
          };
        }
      );
      setMonthsData(blocks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setMonthsData([]);
    } finally {
      setLoading(false);
    }
  }, [year, months.join(','), enabled]);

  useEffect(() => {
    if (!enabled) {
      setMonthsData([]);
      setLoading(false);
      setError(null);
      return;
    }
    fetchData();
  }, [enabled, fetchData]);

  return {
    year,
    months: monthsData,
    loading,
    error,
    refetch: fetchData,
  };
}
