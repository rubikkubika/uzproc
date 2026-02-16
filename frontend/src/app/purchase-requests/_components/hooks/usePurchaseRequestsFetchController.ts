import { useEffect, useMemo } from 'react';
import type { SortField, SortDirection, TabType } from '../types/purchase-request.types';

interface UsePurchaseRequestsFetchControllerProps {
  filtersLoadedRef: React.MutableRefObject<boolean>;
  /** Состояние «фильтры загружены» — чтобы первый fetch шёл после ре-рендера с восстановленными фильтрами */
  filtersLoaded: boolean;
  yearRestored: boolean;
  selectedYear: number | null;
  selectedMonth: number | null;
  activeTab: TabType;
  forceReload: number;
  filtersFromHook: Record<string, string>;
  cfoFilter: Set<string>;
  purchaserFilter: Set<string>;
  statusFilter: Set<string>;
  pageSize: number;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  fetchData: (
    page: number,
    size: number,
    year: number | null,
    month: number | null,
    sortField: SortField | null,
    sortDirection: SortDirection | null,
    filters: Record<string, string>,
    append?: boolean
  ) => void;
  setCurrentPage: (page: number) => void;
  setAllItems: (items: any[] | ((prev: any[]) => any[])) => void;
}

export function usePurchaseRequestsFetchController({
  filtersLoadedRef,
  filtersLoaded,
  yearRestored,
  selectedYear,
  selectedMonth,
  activeTab,
  forceReload,
  filtersFromHook,
  cfoFilter,
  purchaserFilter,
  statusFilter,
  pageSize,
  sortField,
  sortDirection,
  fetchData,
  setCurrentPage,
  setAllItems,
}: UsePurchaseRequestsFetchControllerProps) {
  // Стабилизируем строковые представления фильтров через useMemo, чтобы избежать лишних обновлений
  const cfoFilterStr = useMemo(() => Array.from(cfoFilter).sort().join(','), [cfoFilter]);
  const purchaserFilterStr = useMemo(() => Array.from(purchaserFilter).sort().join(','), [purchaserFilter]);
  const statusFilterStr = useMemo(() => Array.from(statusFilter).sort().join(','), [statusFilter]);

  // Стабилизируем объект filters через JSON.stringify для корректного сравнения
  const filtersStr = useMemo(() => JSON.stringify(filtersFromHook), [filtersFromHook]);

  useEffect(() => {
    // Не загружаем данные до тех пор, пока фильтры не загружены из localStorage.
    // Используем filtersLoaded (state), а не только ref: после восстановления setState
    // вызывается ре-рендер, и только тогда filtersLoaded === true и filtersFromHook уже восстановлены.
    if (!filtersLoadedRef.current || !filtersLoaded) {
      return;
    }
    
    // Проверяем, есть ли navigationData, который еще не был обработан
    // Если есть, не вызываем fetchData сразу - дождемся восстановления года
    const navigationDataStr = localStorage.getItem('purchaseRequestNavigation');
    if (navigationDataStr && !yearRestored) {
      try {
        const navigationData = JSON.parse(navigationDataStr);
        if (navigationData.selectedYear !== undefined && navigationData.selectedYear !== null) {
          console.log('Skipping fetchData - waiting for year restoration from navigation data');
          return;
        }
      } catch (err) {
        // Игнорируем ошибки парсинга
      }
    }
    
    console.log('useEffect fetchData triggered with selectedYear:', selectedYear, 'activeTab:', activeTab);
    // При изменении фильтров или сбросе начинаем с первой страницы
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
    fetchData(0, pageSize, selectedYear, selectedMonth, sortField, sortDirection, filtersFromHook, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageSize,
    selectedYear,
    selectedMonth,
    sortField,
    sortDirection,
    filtersStr,
    yearRestored,
    cfoFilter.size,
    cfoFilterStr,
    purchaserFilter.size,
    purchaserFilterStr,
    statusFilter.size,
    statusFilterStr,
    activeTab, // ВАЖНО: добавлен activeTab, чтобы fetchData вызывался при переключении вкладок
    forceReload, // Добавлен forceReload для принудительной перезагрузки при сбросе фильтров
    filtersLoaded,
    filtersLoadedRef,
    fetchData,
    setCurrentPage,
    setAllItems,
  ]);

  // Отдельный useEffect для перезапуска fetchData после восстановления года из navigationData
  // Это нужно, чтобы убедиться, что данные загружаются с правильным годом
  useEffect(() => {
    // Проверяем, был ли год восстановлен из navigationData и загружены ли фильтры
    if (yearRestored && filtersLoadedRef.current && selectedYear !== null) {
      console.log('Year was restored, re-fetching data with selectedYear:', selectedYear);
      // Небольшая задержка, чтобы убедиться, что selectedYear обновился
      const timeoutId = setTimeout(() => {
        fetchData(0, pageSize, selectedYear, selectedMonth, sortField, sortDirection, filtersFromHook);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearRestored, selectedYear, selectedMonth, pageSize, sortField, sortDirection, filtersStr, filtersLoadedRef, fetchData]);
}
