import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PurchaseRequest, SortField, SortDirection } from '../types/purchase-request.types';

interface Filters {
  [key: string]: string;
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
  selectedYear: number | null;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  cfoSearchQuery: string;
  statusSearchQuery: string;
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
  selectedYear,
  sortField,
  sortDirection,
  cfoSearchQuery,
  statusSearchQuery,
}: UsePurchaseRequestNavigationOptions) {
  // Общая функция для сохранения фильтров таблицы в localStorage
  const saveTableFiltersToLocalStorage = useCallback(() => {
    try {
      const filtersToSave = {
        filters: filtersFromHook,
        localFilters,
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        selectedYear,
        sortField,
        sortDirection,
        currentPage,
        pageSize,
        cfoSearchQuery,
        statusSearchQuery,
      };
      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
    } catch (err) {
      console.error('Error saving table filters:', err);
    }
  }, [
    filtersFromHook,
    localFilters,
    cfoFilter,
    statusFilter,
    selectedYear,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    cfoSearchQuery,
    statusSearchQuery,
  ]);

  // Общая функция для сохранения данных навигации
  const saveNavigationData = useCallback((index: number) => {
    try {
      const navigationData = {
        currentIndex: index,
        page: currentPage,
        pageSize: pageSize,
        filters: filtersFromHook,
        localFilters: localFilters,
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        selectedYear: selectedYear,
        sortField: sortField,
        sortDirection: sortDirection,
        totalElements: dataTotalElements || 0,
      };
      localStorage.setItem('purchaseRequestNavigation', JSON.stringify(navigationData));
      console.log('Navigation data saved with year:', selectedYear, 'navigationData:', navigationData);
    } catch (err) {
      console.error('Error saving navigation data:', err);
    }
  }, [
    currentPage,
    pageSize,
    filtersFromHook,
    localFilters,
    cfoFilter,
    statusFilter,
    selectedYear,
    sortField,
    sortDirection,
    dataTotalElements,
  ]);

  // Открыть в той же вкладке
  const openInSameTab = useCallback((request: PurchaseRequest, index: number) => {
    saveTableFiltersToLocalStorage();
    saveNavigationData(index);
    router.push(`/purchase-request/${request.id}`);
  }, [saveTableFiltersToLocalStorage, saveNavigationData, router]);

  // Открыть в новой вкладке
  const openInNewTab = useCallback((request: PurchaseRequest, index: number) => {
    saveTableFiltersToLocalStorage();
    // Для новой вкладки используем абсолютный индекс (currentPage * pageSize + index)
    saveNavigationData(currentPage * pageSize + index);
    window.open(`/purchase-request/${request.id}`, '_blank');
  }, [saveTableFiltersToLocalStorage, saveNavigationData, currentPage, pageSize]);

  return {
    openInSameTab,
    openInNewTab,
  };
}
