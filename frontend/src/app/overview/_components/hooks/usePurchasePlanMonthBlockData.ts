'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface OverviewPlanVersion {
  id: number;
  versionNumber: number;
  year: number;
  description: string | null;
  createdAt: string;
  isCurrent: boolean;
  itemsCount?: number;
}

export interface OverviewPlanItem {
  id: number;
  requestDate: string | null;
  purchaserCompany: string | null;
  purchaseRequestId: number | null;
  status: string | null;
  cfo: string | null;
  budgetAmount: number | null;
  [key: string]: unknown;
}

/** Строка сводки по ЦФО: те же показатели, что в диаграмме + суммы (запланированы, заявок) */
export interface CfoSummaryRow {
  cfo: string;
  market: number;
  linked: number;
  excluded: number;
  requestsPurchase: number;
  /** Заявки (закупка) плановые по ЦФО */
  requestsPlanned: number;
  /** Заявки (закупка) внеплановые по ЦФО */
  requestsNonPlanned: number;
  /** Заявки (закупка) неутверждённые по ЦФО */
  requestsUnapproved: number;
  /** Заявки (закупка) отменённые по ЦФО */
  requestsExcluded: number;
  /** Сумма бюджета по позициям «Запланированы» (Market) по ЦФО */
  sumMarket: number;
  /** Сумма бюджета заявок (закупка) по ЦФО, созданных в месяце */
  sumRequests: number;
}

export interface PurchasePlanMonthBlockData {
  version: OverviewPlanVersion | null;
  items: OverviewPlanItem[];
  positionsCount: number;
  /** Позиции, где компания исполнитель — Маркет (purchaserCompany === "Market") */
  itemsMarket: OverviewPlanItem[];
  positionsMarketCount: number;
  /** Позиции, связанные с заявкой (purchaseRequestId != null) */
  positionsLinkedToRequestCount: number;
  /** Позиции в статусе «Исключена» */
  positionsExcludedCount: number;
  /** Заявки с типом закупка (requiresPurchase=true), созданные в месяце блока (по purchaseRequestCreationDate) */
  requestsPurchaseCreatedInMonthCount: number;
  /** Заявки (закупка), связанные с планом, созданные в месяце */
  requestsPurchasePlannedCount: number;
  /** Заявки (закупка), несвязанные с планом, созданные в месяце */
  requestsPurchaseNonPlannedCount: number;
  /** Заявки (закупка) со статусом «Заявка не утверждена», созданные в месяце */
  requestsPurchaseUnapprovedCount: number;
  /** Заявки (закупка) в состоянии «Исключена», созданные в месяце */
  requestsPurchaseExcludedCount: number;
  /** Сводка в разрезе ЦФО (столбцы как в диаграмме) */
  summaryByCfo: CfoSummaryRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Хук: последняя редакция плана закупок, созданная в заданном месяце (по createdAt),
 * и позиции по месяцу (requestDate в заданном месяце).
 */
export function usePurchasePlanMonthBlockData(
  year: number,
  month: number
): PurchasePlanMonthBlockData {
  const [version, setVersion] = useState<OverviewPlanVersion | null>(null);
  const [items, setItems] = useState<OverviewPlanItem[]>([]);
  const [itemsMarket, setItemsMarket] = useState<OverviewPlanItem[]>([]);
  const [linkedToRequestCount, setLinkedToRequestCount] = useState(0);
  const [excludedCount, setExcludedCount] = useState(0);
  const [requestsPurchaseCreatedInMonthCount, setRequestsPurchaseCreatedInMonthCount] = useState(0);
  const [summaryByCfo, setSummaryByCfo] = useState<CfoSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (year == null || month == null) {
      setVersion(null);
      setItems([]);
      setItemsMarket([]);
      setLinkedToRequestCount(0);
      setExcludedCount(0);
      setRequestsPurchaseCreatedInMonthCount(0);
      setSummaryByCfo([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getBackendUrl();
      const versionsRes = await fetch(`${baseUrl}/api/purchase-plan-versions/year/${year}`);
      if (!versionsRes.ok) {
        setVersion(null);
        setItems([]);
        setItemsMarket([]);
        setLinkedToRequestCount(0);
        setExcludedCount(0);
        setRequestsPurchaseCreatedInMonthCount(0);
        setSummaryByCfo([]);
        setLoading(false);
        return;
      }
      const versions: OverviewPlanVersion[] = await versionsRes.json();
      // Редакции, созданные в этом месяце (createdAt в year/month)
      const inMonth = versions.filter((v) => {
        const d = new Date(v.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      // Последняя по номеру редакции за месяц
      const latestInMonth =
        inMonth.length > 0
          ? inMonth.sort((a, b) => b.versionNumber - a.versionNumber)[0]
          : null;
      setVersion(latestInMonth);

      if (!latestInMonth) {
        setItems([]);
        setItemsMarket([]);
        setLinkedToRequestCount(0);
        setExcludedCount(0);
        setRequestsPurchaseCreatedInMonthCount(0);
        setSummaryByCfo([]);
        setLoading(false);
        return;
      }

      const itemsRes = await fetch(`${baseUrl}/api/purchase-plan-versions/${latestInMonth.id}/items`);
      if (!itemsRes.ok) {
        setItems([]);
        setItemsMarket([]);
        setLinkedToRequestCount(0);
        setExcludedCount(0);
        setRequestsPurchaseCreatedInMonthCount(0);
        setSummaryByCfo([]);
        setLoading(false);
        return;
      }
      const allItems: OverviewPlanItem[] = await itemsRes.json();
      const itemsInMonth = allItems.filter((item) => {
        const rd = item.requestDate;
        if (!rd) return false;
        const d = new Date(rd);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      setItems(itemsInMonth);
      const market = itemsInMonth.filter(
        (item) =>
          item.purchaserCompany != null &&
          item.purchaserCompany.trim().toLowerCase() === 'market'
      );
      setItemsMarket(market);
      const linkedToRequest = itemsInMonth.filter(
        (item) => item.purchaseRequestId != null
      );
      setLinkedToRequestCount(linkedToRequest.length);
      const excluded = itemsInMonth.filter(
        (item) => item.status != null && item.status.trim() === 'Исключена'
      );
      setExcludedCount(excluded.length);

      // Заявки с типом закупка (requiresPurchase=true), созданные в месяце блока (API: month 1–12)
      const requestsParams = new URLSearchParams();
      requestsParams.set('page', '0');
      requestsParams.set('size', '1');
      requestsParams.set('year', String(year));
      requestsParams.set('month', String(month + 1));
      requestsParams.set('requiresPurchase', 'true');
      const requestsRes = await fetch(
        `${baseUrl}/api/purchase-requests?${requestsParams.toString()}`
      );
      let requestsPurchaseByCfo: Record<string, number> = {};
      let requestsSumByCfo: Record<string, number> = {};
      let totalRequests = 0;
      if (requestsRes.ok) {
        const requestsPage = await requestsRes.json();
        totalRequests = requestsPage.totalElements ?? 0;
        setRequestsPurchaseCreatedInMonthCount(totalRequests);
        if (totalRequests > 0) {
          const size = Math.min(totalRequests, 2000);
          const listParams = new URLSearchParams(requestsParams);
          listParams.set('size', String(size));
          const listRes = await fetch(
            `${baseUrl}/api/purchase-requests?${listParams.toString()}`
          );
          if (listRes.ok) {
            const listPage = await listRes.json();
            const content = listPage.content ?? [];
            content.forEach((r: { cfo?: string | null; budgetAmount?: number | null }) => {
              const cfoKey = r.cfo != null && r.cfo.trim() !== '' ? r.cfo.trim() : '—';
              requestsPurchaseByCfo[cfoKey] = (requestsPurchaseByCfo[cfoKey] ?? 0) + 1;
              const amount = r.budgetAmount != null ? Number(r.budgetAmount) : 0;
              requestsSumByCfo[cfoKey] = (requestsSumByCfo[cfoKey] ?? 0) + amount;
            });
          }
        }
      } else {
        setRequestsPurchaseCreatedInMonthCount(0);
      }

      // Сводка по ЦФО: из позиций плана (market, linked, excluded, sumMarket) + заявки (count, sumRequests)
      const cfoKeys = new Set<string>();
      itemsInMonth.forEach((item) => {
        const key = item.cfo != null && item.cfo.trim() !== '' ? item.cfo.trim() : '—';
        cfoKeys.add(key);
      });
      Object.keys(requestsPurchaseByCfo).forEach((k) => cfoKeys.add(k));
      const rows: CfoSummaryRow[] = Array.from(cfoKeys)
        .sort((a, b) => (a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b)))
        .map((cfoKey) => {
          const itemsCfo = itemsInMonth.filter(
            (i) => (i.cfo != null && i.cfo.trim() !== '' ? i.cfo.trim() : '—') === cfoKey
          );
          const marketItems = itemsCfo.filter(
            (i) =>
              i.purchaserCompany != null && i.purchaserCompany.trim().toLowerCase() === 'market'
          );
          const linkedItems = itemsCfo.filter((i) => i.purchaseRequestId != null);
          const excludedItems = itemsCfo.filter(
            (i) => i.status != null && i.status.trim() === 'Исключена'
          );
          const sum = (list: OverviewPlanItem[]) =>
            list.reduce((s, i) => s + (i.budgetAmount != null ? Number(i.budgetAmount) : 0), 0);
          return {
            cfo: cfoKey,
            market: marketItems.length,
            linked: linkedItems.length,
            excluded: excludedItems.length,
            requestsPurchase: requestsPurchaseByCfo[cfoKey] ?? 0,
            requestsPlanned: 0,
            requestsNonPlanned: 0,
            requestsUnapproved: 0,
            requestsExcluded: 0,
            sumMarket: sum(marketItems),
            sumRequests: requestsSumByCfo[cfoKey] ?? 0,
          };
        });
      setSummaryByCfo(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setVersion(null);
      setItems([]);
      setItemsMarket([]);
      setLinkedToRequestCount(0);
      setExcludedCount(0);
      setRequestsPurchaseCreatedInMonthCount(0);
      setSummaryByCfo([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    version,
    items,
    positionsCount: items.length,
    itemsMarket,
    positionsMarketCount: itemsMarket.length,
    positionsLinkedToRequestCount: linkedToRequestCount,
    positionsExcludedCount: excludedCount,
    requestsPurchaseCreatedInMonthCount,
    requestsPurchasePlannedCount: 0,
    requestsPurchaseNonPlannedCount: 0,
    requestsPurchaseUnapprovedCount: 0,
    requestsPurchaseExcludedCount: 0,
    summaryByCfo,
    loading,
    error,
    refetch: fetchData,
  };
}
