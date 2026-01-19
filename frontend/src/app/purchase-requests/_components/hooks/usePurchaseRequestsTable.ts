import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import type { PurchaseRequest, PageResponse, SortField, SortDirection, TabType } from '../types/purchase-request.types';
import { TAB_STATUSES } from '../constants/status.constants';
import { usePurchaseRequestFilters } from './usePurchaseRequestFilters';
import { useTableColumns } from './useTableColumns';
import { usePurchaseRequestsModals } from './usePurchaseRequestsModals';

export function usePurchaseRequestsTable() {
  const router = useRouter();

  // Используем существующие хуки
  const filtersHook = usePurchaseRequestFilters();
  const columnsHook = useTableColumns();
  const modalsHook = usePurchaseRequestsModals();

  // Состояние для данных
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Состояние для года и общего количества записей
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  // summaryData теперь в хуке useSummary

  // Состояние для сортировки (по умолчанию сортировка по номеру по убыванию)
  const [sortField, setSortField] = useState<SortField>('idPurchaseRequest');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Ref для хранения актуальных значений фильтров
  const filtersStateRef = useRef({
    filtersFromHook: {} as Record<string, string>,
    localFilters: {} as Record<string, string>,
    cfoFilter: new Set<string>(),
    statusFilter: new Set<string>(),
    selectedYear: null as number | null,
    sortField: null as SortField,
    sortDirection: null as SortDirection,
    currentPage: 0,
    pageSize: 100,
    cfoSearchQuery: '',
    statusSearchQuery: '',
    activeTab: 'in-work' as TabType,
  });

  // Функция для загрузки данных
  const fetchData = useCallback(async (
    page: number,
    size: number,
    year: number | null = null,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {},
    append: boolean = false
  ) => {
    // Отменяем предыдущий запрос, если он еще выполняется
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Создаем новый AbortController для этого запроса
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Сохраняем текущую активную вкладку для проверки после завершения запроса
    const currentTab = filtersHook.activeTabRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllItems([]);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));

      if (year !== null) {
        params.append('year', String(year));
      }

      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
      }

      // Добавляем параметры фильтрации
      if (filters.idPurchaseRequest && filters.idPurchaseRequest.trim() !== '') {
        const idValue = parseInt(filters.idPurchaseRequest.trim(), 10);
        if (!isNaN(idValue)) {
          params.append('idPurchaseRequest', String(idValue));
        }
      }

      // Фильтр по ЦФО
      if (filtersHook.cfoFilter.size > 0) {
        filtersHook.cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }

      // Фильтр по закупщику
      if (filtersHook.purchaserFilter.size > 0) {
        filtersHook.purchaserFilter.forEach(p => {
          params.append('purchaser', p);
        });
      }

      if (filters.name && filters.name.trim() !== '') {
        params.append('name', filters.name.trim());
      }

      // Фильтр по бюджету
      const budgetOperator = filtersHook.localFilters.budgetAmountOperator || filters.budgetAmountOperator;
      const budgetAmount = filtersHook.localFilters.budgetAmount || filters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }

      if (filters.costType && filters.costType.trim() !== '') {
        params.append('costType', filters.costType.trim());
      }

      if (filters.contractType && filters.contractType.trim() !== '') {
        params.append('contractType', filters.contractType.trim());
      }

      if (filters.requiresPurchase && filters.requiresPurchase.trim() !== '') {
        const requiresPurchaseValue = filters.requiresPurchase.trim();
        if (requiresPurchaseValue === 'Закупка') {
          params.append('requiresPurchase', 'true');
        } else if (requiresPurchaseValue === 'Заказ') {
          params.append('requiresPurchase', 'false');
        }
      }

      // Фильтр по статусу
      let effectiveStatusFilter: Set<string>;
      if (currentTab === 'hidden') {
        effectiveStatusFilter = new Set();
      } else if (filtersHook.statusFilter.size > 0) {
        effectiveStatusFilter = filtersHook.statusFilter;
      } else if (currentTab !== 'all') {
        effectiveStatusFilter = new Set(TAB_STATUSES[currentTab]);
      } else {
        effectiveStatusFilter = new Set();
      }

      if (currentTab === 'hidden') {
        params.append('excludeFromInWork', 'true');
      } else {
        if (effectiveStatusFilter.size > 0) {
          effectiveStatusFilter.forEach(status => {
            params.append('status', status);
          });
        }

        if (currentTab === 'in-work') {
          params.append('excludeFromInWork', 'false');
        }
      }

      const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
      const response = await fetch(fetchUrl, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const result = await response.json();

      // Проверяем, что запрос не был отменен и вкладка не изменилась
      if (abortController.signal.aborted) {
        return;
      }

      if (filtersHook.activeTabRef.current !== currentTab) {
        return;
      }

      const items = result.content || [];

      if (append) {
        setAllItems(prev => [...prev, ...items]);
      } else {
        setAllItems(items);
      }

      setData(result);
      setTotalRecords(result.totalElements || 0);
      setHasMore(items.length === size && !result.last);
      setCurrentPage(page);

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filtersHook.activeTabRef, filtersHook.cfoFilter, filtersHook.purchaserFilter, filtersHook.statusFilter, filtersHook.localFilters]);

  // Функция для обработки сортировки
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return {
    // Данные
    data,
    setData,
    allItems,
    setAllItems,
    loading,
    loadingMore,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    hasMore,
    loadMoreRef,
    selectedYear,
    setSelectedYear,
    totalRecords,
    setTotalRecords,
    userRole,
    setUserRole,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    currentYear,
    abortControllerRef,
    filtersStateRef,

    // Функции
    fetchData,
    handleSort,
    router,

    // Хуки
    filters: filtersHook,
    columns: columnsHook,
    modals: modalsHook,
  };
};
