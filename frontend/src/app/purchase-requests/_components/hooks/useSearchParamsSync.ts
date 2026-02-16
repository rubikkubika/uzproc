'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  parseSearchParamsToState,
  buildListQueryString,
  type ListStateFromUrl,
} from '../utils/searchParamsState';
import type { SortField, SortDirection, TabType } from '../types/purchase-request.types';

const PREFIX = 'pr_';

function hasPrParams(searchParams: Readonly<URLSearchParams>): boolean {
  return Array.from(searchParams.keys()).some((k) => k.startsWith(PREFIX));
}

function shallowEqualState(
  a: ListStateFromUrl,
  b: {
    filters: Record<string, string>;
    sortField: SortField | null;
    sortDirection: SortDirection | null;
    page: number;
    pageSize: number;
    prTab: TabType;
    year: number | null;
    month: number | null;
    cfo: Set<string> | string[];
    statusGroup: Set<string> | string[];
    purchaser: Set<string> | string[];
  }
): boolean {
  if (a.page !== b.page || a.pageSize !== b.pageSize || a.prTab !== b.prTab) return false;
  if (a.sort.field !== b.sortField || a.sort.direction !== b.sortDirection) return false;
  if (a.year !== b.year || a.month !== b.month) return false;
  const cfoA = Array.from(a.cfo).sort().join(',');
  const cfoB = Array.from(b.cfo).sort().join(',');
  if (cfoA !== cfoB) return false;
  const sgA = Array.from(a.statusGroup).sort().join(',');
  const sgB = Array.from(b.statusGroup).sort().join(',');
  if (sgA !== sgB) return false;
  const pA = Array.from(a.purchaser).sort().join(',');
  const pB = Array.from(b.purchaser).sort().join(',');
  if (pA !== pB) return false;
  const keys = Object.keys(a.filters);
  for (const k of keys) {
    if ((a.filters[k] || '') !== (b.filters[k] || '')) return false;
  }
  return true;
}

export interface UseSearchParamsSyncParams {
  filtersFromHook: Record<string, string>;
  currentPage: number;
  pageSize: number;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  activeTab: TabType;
  selectedYear: number | null;
  selectedMonth: number | null;
  cfoFilter: Set<string>;
  statusFilter: Set<string>;
  purchaserFilter: Set<string>;
  setFilters: (f: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setLocalFilters: (f: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setCurrentPage: (p: number) => void;
  setSortField: (f: SortField) => void;
  setSortDirection: (d: SortDirection) => void;
  setActiveTab: (t: TabType) => void;
  setSelectedYear: (y: number | null) => void;
  setSelectedMonth: (m: number | null) => void;
  setCfoFilter: (s: Set<string>) => void;
  setStatusFilter: (s: Set<string>) => void;
  setPurchaserFilter: (s: Set<string>) => void;
  setFiltersLoaded?: (v: boolean) => void;
  filtersLoadedRef?: React.MutableRefObject<boolean>;
  /** Не обновлять URL до применения состояния из URL или localStorage (избегаем гонки) */
  filtersLoaded?: boolean;
}

/**
 * Синхронизация состояния списка с URL: источник истины — query params.
 * При mount и при back/forward читаем URL и применяем к state (shallow compare, чтобы избежать циклов).
 * При изменении state обновляем URL через replace (частые изменения — replace: true).
 */
export function useSearchParamsSync(params: UseSearchParamsSyncParams) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isInitialMount = useRef(true);
  const lastSerializedRef = useRef<string>('');

  const {
    filtersFromHook,
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    activeTab,
    selectedYear,
    selectedMonth,
    cfoFilter,
    statusFilter,
    purchaserFilter,
    setFilters,
    setLocalFilters,
    setCurrentPage,
    setSortField,
    setSortDirection,
    setActiveTab,
    setSelectedYear,
    setSelectedMonth,
    setCfoFilter,
    setStatusFilter,
    setPurchaserFilter,
    setFiltersLoaded,
    filtersLoadedRef,
    filtersLoaded = false,
  } = params;

  // URL -> state: при mount и при изменении searchParams (в т.ч. back/forward)
  // Если в URL нет pr_*, всё равно помечаем загрузку завершённой, чтобы state->URL эффект обновлял строку при изменении фильтров (в т.ч. закупщика)
  useEffect(() => {
    if (!hasPrParams(searchParams)) {
      setFiltersLoaded?.(true);
      if (filtersLoadedRef) filtersLoadedRef.current = true;
      return;
    }
    const stateFromUrl = parseSearchParamsToState(searchParams);
    const currentState = {
      filters: filtersFromHook,
      sortField,
      sortDirection,
      page: currentPage,
      pageSize,
      prTab: activeTab,
      year: selectedYear,
      month: selectedMonth,
      cfo: cfoFilter,
      statusGroup: statusFilter,
      purchaser: purchaserFilter,
    };
    if (shallowEqualState(stateFromUrl, currentState)) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        setFiltersLoaded?.(true);
        if (filtersLoadedRef) filtersLoadedRef.current = true;
      }
      return;
    }
    // Мержим с текущими фильтрами, чтобы не терять поля, не сериализуемые в URL (title, innerId и т.п.)
    setFilters((prev) => ({ ...prev, ...stateFromUrl.filters }));
    setLocalFilters((prev) => ({ ...prev, ...stateFromUrl.filters }));
    setCurrentPage(stateFromUrl.page);
    setSortField(stateFromUrl.sort.field as SortField);
    setSortDirection(stateFromUrl.sort.direction as SortDirection);
    setActiveTab(stateFromUrl.prTab);
    setSelectedYear(stateFromUrl.year);
    setSelectedMonth(stateFromUrl.month);
    setCfoFilter(new Set(stateFromUrl.cfo));
    setStatusFilter(new Set(stateFromUrl.statusGroup));
    setPurchaserFilter(new Set(stateFromUrl.purchaser));
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setFiltersLoaded?.(true);
      if (filtersLoadedRef) filtersLoadedRef.current = true;
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // state -> URL: при изменении фильтров/сортировки/страницы (replace: true); только после готовности состояния (избегаем гонки с localStorage).
  // Защита от цикла: 1) lastSerializedRef — не вызываем replace, если строка не изменилась; 2) после replace searchParams меняется, эффект перезапускается, next совпадает с lastSerializedRef — выходим.
  useEffect(() => {
    if (!filtersLoaded) return;
    const state: ListStateFromUrl = {
      filters: filtersFromHook,
      sort: { field: sortField, direction: sortDirection },
      page: currentPage,
      pageSize,
      prTab: activeTab,
      year: selectedYear,
      month: selectedMonth,
      cfo: Array.from(cfoFilter),
      statusGroup: Array.from(statusFilter),
      purchaser: Array.from(purchaserFilter),
    };
    // Явно передаём tab=purchase-requests, чтобы при первом клике в сайдбаре не перезаписать URL старым tab из searchParams (например contracts)
    const qs = buildListQueryString(state, searchParams, 'purchase-requests');
    const next = `/?${qs}`;
    if (lastSerializedRef.current === next) return;
    // Не вызываем replace, если текущий URL уже совпадает по содержимому (избегаем лишнего обновления и повторного срабатывания эффекта)
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      const currentQuery = window.location.search ? window.location.search.slice(1) : '';
      const nextQuery = next.startsWith('/?') ? next.slice(2) : next.startsWith('?') ? next.slice(1) : next;
      if (currentQuery === nextQuery) {
        lastSerializedRef.current = next;
        return;
      }
    }
    lastSerializedRef.current = next;
    router.replace(next, { scroll: false });
  }, [
    filtersFromHook,
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    activeTab,
    selectedYear,
    selectedMonth,
    cfoFilter,
    statusFilter,
    purchaserFilter,
    router,
    searchParams,
    filtersLoaded,
  ]);

  return { hasPrParams: hasPrParams(searchParams) };
}
