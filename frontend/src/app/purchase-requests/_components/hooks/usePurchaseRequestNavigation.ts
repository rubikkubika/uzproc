import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PurchaseRequest, SortField, SortDirection, TabType } from '../types/purchase-request.types';

interface Filters {
  [key: string]: string;
}

/** Состояние фильтров из ref — всегда актуальное на момент клика (избегаем устаревшего замыкания) */
interface FiltersStateRef {
  filtersFromHook: Record<string, string>;
  localFilters: Record<string, string>;
  cfoFilter: Set<string>;
  statusFilter: Set<string>;
  purchaserFilter: Set<string>;
  selectedYear: number | null;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  currentPage: number;
  cfoSearchQuery: string;
  statusSearchQuery: string;
  purchaserSearchQuery: string;
  activeTab: TabType;
}

interface UsePurchaseRequestNavigationOptions {
  router: ReturnType<typeof useRouter>;
  dataTotalElements: number | undefined;
  currentPage: number;
  pageSize: number;
  filtersFromHook: Filters;
  localFilters: Filters;
  cfoFilter: Set<string>;
  statusFilter: Set<string>;
  purchaserFilter: Set<string>;
  selectedYear: number | null;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  cfoSearchQuery: string;
  statusSearchQuery: string;
  purchaserSearchQuery: string;
  activeTab: TabType;
  /** Ref с актуальным состоянием фильтров — при переходе сохраняем из ref, чтобы не потерять последние значения */
  filtersStateRef: React.MutableRefObject<FiltersStateRef>;
  /** URL списка для кнопки «Назад» на детальной странице (pathname + search) */
  getListUrl?: () => string;
}

export function usePurchaseRequestNavigation({
  router,
  dataTotalElements,
  currentPage,
  pageSize,
  filtersFromHook,
  localFilters,
  cfoFilter,
  statusFilter,
  purchaserFilter,
  selectedYear,
  sortField,
  sortDirection,
  cfoSearchQuery,
  statusSearchQuery,
  purchaserSearchQuery,
  activeTab,
  filtersStateRef,
  getListUrl,
}: UsePurchaseRequestNavigationOptions) {
  // Открыть в той же вкладке: сохраняем фильтры в ref/localStorage; при возврате состояние восстановится из URL (или localStorage)
  const openInSameTab = useCallback((request: PurchaseRequest, index: number) => {
    try {
      const state = filtersStateRef.current;
      const filtersToSave = {
        filters: state.filtersFromHook,
        localFilters: state.localFilters,
        cfoFilter: Array.from(state.cfoFilter),
        statusFilter: Array.from(state.statusFilter),
        purchaserFilter: Array.from(state.purchaserFilter),
        selectedYear: state.selectedYear,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        currentPage: state.currentPage,
        pageSize,
        cfoSearchQuery: state.cfoSearchQuery,
        statusSearchQuery: state.statusSearchQuery,
        purchaserSearchQuery: state.purchaserSearchQuery,
        activeTab: state.activeTab ?? 'in-work',
      };
      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));

      const navigationData = {
        currentIndex: index,
        page: state.currentPage,
        pageSize: pageSize,
        filters: state.filtersFromHook,
        localFilters: state.localFilters,
        cfoFilter: Array.from(state.cfoFilter),
        statusFilter: Array.from(state.statusFilter),
        selectedYear: state.selectedYear,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        totalElements: dataTotalElements || 0,
      };
      localStorage.setItem('purchaseRequestNavigation', JSON.stringify(navigationData));
    } catch (err) {
      console.error('Error saving table filters / navigation data:', err);
    }
    // Для надёжной кнопки «Назад» передаём URL списка в query (Next.js не поддерживает state)
    const from = getListUrl?.();
    const url = from
      ? `/purchase-request/${request.id}?from=${encodeURIComponent(from)}`
      : `/purchase-request/${request.id}`;
    router.push(url);
  }, [filtersStateRef, pageSize, dataTotalElements, router, getListUrl]);

  // Общая функция для сохранения данных навигации (для openInNewTab)
  const saveNavigationData = useCallback((index: number) => {
    try {
      const state = filtersStateRef.current;
      const navigationData = {
        currentIndex: index,
        page: state.currentPage,
        pageSize: pageSize,
        filters: state.filtersFromHook,
        localFilters: state.localFilters,
        cfoFilter: Array.from(state.cfoFilter),
        statusFilter: Array.from(state.statusFilter),
        selectedYear: state.selectedYear,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        totalElements: dataTotalElements || 0,
      };
      localStorage.setItem('purchaseRequestNavigation', JSON.stringify(navigationData));
    } catch (err) {
      console.error('Error saving navigation data:', err);
    }
  }, [filtersStateRef, pageSize, dataTotalElements]);

  // Открыть в новой вкладке: сохраняем фильтры из ref и данные навигации
  const openInNewTab = useCallback((request: PurchaseRequest, index: number) => {
    try {
      const state = filtersStateRef.current;
      const filtersToSave = {
        filters: state.filtersFromHook,
        localFilters: state.localFilters,
        cfoFilter: Array.from(state.cfoFilter),
        statusFilter: Array.from(state.statusFilter),
        purchaserFilter: Array.from(state.purchaserFilter),
        selectedYear: state.selectedYear,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        currentPage: state.currentPage,
        pageSize,
        cfoSearchQuery: state.cfoSearchQuery,
        statusSearchQuery: state.statusSearchQuery,
        purchaserSearchQuery: state.purchaserSearchQuery,
        activeTab: state.activeTab ?? 'in-work',
      };
      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
      saveNavigationData(state.currentPage * pageSize + index);
    } catch (err) {
      console.error('Error saving table filters:', err);
    }
    window.open(`/purchase-request/${request.id}`, '_blank');
  }, [filtersStateRef, pageSize, saveNavigationData]);

  return {
    openInSameTab,
    openInNewTab,
  };
}
