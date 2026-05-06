import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageResponse, SortField, SortDirection, Contract } from '../types/contracts.types';
import { PAGE_SIZE } from '../constants/contracts.constants';
import { useContractsFilters } from './useContractsFilters';
import { useContractsData } from './useContractsData';
import { useClickOutside } from './useClickOutside';
import { useInfiniteScroll } from './useInfiniteScroll';
import { useExcludeFromStatusCalculation } from './useExcludeFromStatusCalculation';
import { useExcludeFromInWork } from './useExcludeFromInWork';
import { useContractTabCounts } from './useContractTabCounts';
import { useContractsSummary } from './useContractsSummary';

export const useContractsTable = () => {
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = PAGE_SIZE; // фиксировано 100 для бесконечной прокрутки
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [sortField, setSortField] = useState<SortField>('innerId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filtersHook = useContractsFilters(setCurrentPage);
  const dataHook = useContractsData();
  const { tabCounts, refreshTabCounts } = useContractTabCounts({
    selectedYear,
    filters: filtersHook.filters,
    cfoFilter: filtersHook.cfoFilter,
    organizationFilter: filtersHook.organizationFilter,
  });

  const { summaryData, documentForms, loading: summaryLoading, refreshSummary } = useContractsSummary();

  const { updateExcludeFromStatusCalculation } = useExcludeFromStatusCalculation({
    setAllItems,
    onAfterUpdate: () => { refreshTabCounts(); refreshSummary(); },
  });

  const { updateExcludeFromInWork } = useExcludeFromInWork({
    setAllItems,
    onAfterUpdate: () => { refreshTabCounts(); refreshSummary(); },
  });

  useClickOutside({
    isOpen: filtersHook.isCfoFilterOpen,
    ref: filtersHook.cfoFilterContainerRef,
    onClose: () => filtersHook.setIsCfoFilterOpen(false),
  });

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  }, [sortField, sortDirection]);

  useEffect(() => {
    const loadYears = async () => {
      const years = await dataHook.fetchYears();
      setAllYears(years);
    };
    loadYears();
  }, [dataHook.fetchYears]);

  const handleResetFilters = useCallback(() => {
    const emptyFilters = {
      innerId: '', cfo: '', name: '', documentForm: '',
      costType: '', contractType: '', paymentTerms: '',
      purchaseRequestInnerId: '', supplier: '',
    };
    filtersHook.setFilters(emptyFilters);
    filtersHook.setLocalFilters(emptyFilters);
    filtersHook.setCfoFilter(new Set());
    filtersHook.setIsTypicalFormFilter('');
    filtersHook.setStatusFilter('');
    filtersHook.setOrganizationFilter('');
    filtersHook.setPreparedByFilter('');
    setSelectedYear(currentYear);
    setCurrentPage(0);
  }, [filtersHook, currentYear]);

  const fetchData = useCallback(async (
    page: number,
    size: number,
    year: number | null,
    sortF: SortField,
    sortDir: SortDirection,
    filters: Record<string, string>,
    cfoFilter: Set<string>,
    activeTab: string,
    append: boolean,
    isTypicalFormFilter: string = '',
    organizationFilter: string = '',
    preparedByFilter: string = '',
    statusFilter: string = ''
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllItems([]);
    }
    setError(null);
    try {
      const result = await dataHook.fetchData(
        page,
        size,
        year,
        sortF,
        sortDir,
        filters,
        cfoFilter,
        activeTab as 'all' | 'in-work' | 'not-coordinated' | 'signed' | 'hidden',
        isTypicalFormFilter,
        organizationFilter,
        preparedByFilter,
        statusFilter
      );
      const items = result?.content ?? [];
      if (append) {
        setAllItems(prev => [...prev, ...items]);
      } else {
        setAllItems(items);
      }
      setData(result ?? null);
      const totalPages = result?.totalPages ?? 0;
      setHasMore(items.length === size && (totalPages === 0 || page + 1 < totalPages));
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dataHook.fetchData]);

  const cfoFilterStr = useMemo(() => JSON.stringify(Array.from(filtersHook.cfoFilter)), [filtersHook.cfoFilter]);
  const filtersStr = useMemo(() => JSON.stringify(filtersHook.filters), [filtersHook.filters]);

  // Первичная загрузка при смене фильтров/сортировки/года/вкладки
  useEffect(() => {
    setCurrentPage(0);
    fetchData(
      0,
      pageSize,
      selectedYear,
      sortField,
      sortDirection,
      filtersHook.filters,
      filtersHook.cfoFilter,
      filtersHook.activeTab,
      false,
      filtersHook.isTypicalFormFilter,
      filtersHook.organizationFilter,
      filtersHook.preparedByFilter,
      filtersHook.statusFilter
    );
  }, [
    selectedYear,
    sortField,
    sortDirection,
    filtersStr,
    cfoFilterStr,
    filtersHook.activeTab,
    filtersHook.isTypicalFormFilter,
    filtersHook.statusFilter,
    filtersHook.organizationFilter,
    filtersHook.preparedByFilter,
    fetchData,
    pageSize,
  ]);

  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: useCallback(() => {
      if (hasMore && !loadingMore && allItems.length > 0) {
        const nextPage = currentPage + 1;
        fetchData(
          nextPage,
          pageSize,
          selectedYear,
          sortField,
          sortDirection,
          filtersHook.filters,
          filtersHook.cfoFilter,
          filtersHook.activeTab,
          true,
          filtersHook.isTypicalFormFilter,
          filtersHook.organizationFilter,
          filtersHook.preparedByFilter,
          filtersHook.statusFilter
        );
      }
    }, [hasMore, loadingMore, allItems.length, currentPage, pageSize, selectedYear, sortField, sortDirection, filtersHook.filters, filtersHook.cfoFilter, filtersHook.activeTab, filtersHook.isTypicalFormFilter, filtersHook.statusFilter, filtersHook.organizationFilter, filtersHook.preparedByFilter, fetchData]),
    threshold: 0.1,
  });

  return {
    data,
    allItems,
    setAllItems,
    loading,
    loadingMore,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    selectedYear,
    setSelectedYear,
    currentYear,
    allYears,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters: filtersHook,
    hasMore,
    loadMoreRef,
    updateExcludeFromStatusCalculation,
    updateExcludeFromInWork,
    tabCounts,
    refreshTabCounts,
    summaryData,
    documentForms,
    summaryLoading,
  };
};
