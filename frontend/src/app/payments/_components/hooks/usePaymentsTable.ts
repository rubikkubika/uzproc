import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageResponse, SortField, SortDirection, Payment } from '../types/payments.types';
import { PAGE_SIZE } from '../constants/payments.constants';
import { usePaymentsFilters } from './usePaymentsFilters';
import { usePaymentsData } from './usePaymentsData';
import { useClickOutside } from './useClickOutside';
import { useInfiniteScroll } from './useInfiniteScroll';

export const usePaymentsTable = () => {
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = PAGE_SIZE; // фиксировано 100 для бесконечной прокрутки
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  /** Вкладка: 'all' — все оплаты, 'by-request' — только оплаты по заявкам (по умолчанию) */
  const [paymentsTab, setPaymentsTab] = useState<'all' | 'by-request'>('by-request');

  const filtersHook = usePaymentsFilters(setCurrentPage);
  const linkedOnly = paymentsTab === 'by-request';
  const dataHook = usePaymentsData();

  useClickOutside({
    isOpen: filtersHook.isCfoFilterOpen,
    ref: filtersHook.cfoFilterContainerRef,
    onClose: () => filtersHook.setIsCfoFilterOpen(false),
  });

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field ?? 'id');
      setSortDirection('asc');
    }
    setCurrentPage(0);
  }, [sortField]);

  const handleResetFilters = useCallback(() => {
    filtersHook.setFilters({ comment: '' });
    filtersHook.setLocalFilters({ comment: '' });
    filtersHook.setCfoFilter(new Set());
    setCurrentPage(0);
  }, [filtersHook]);

  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortF: SortField,
    sortDir: SortDirection,
    filters: Record<string, string>,
    cfoFilter: Set<string>,
    linkedOnlyFlag: boolean,
    append: boolean
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
        sortF,
        sortDir,
        filters,
        cfoFilter,
        linkedOnlyFlag
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

  useEffect(() => {
    setCurrentPage(0);
    fetchData(
      0,
      pageSize,
      sortField,
      sortDirection,
      filtersHook.filters,
      filtersHook.cfoFilter,
      linkedOnly,
      false
    );
  }, [
    sortField,
    sortDirection,
    filtersStr,
    cfoFilterStr,
    linkedOnly,
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
          sortField,
          sortDirection,
          filtersHook.filters,
          filtersHook.cfoFilter,
          linkedOnly,
          true
        );
      }
    }, [hasMore, loadingMore, allItems.length, currentPage, pageSize, sortField, sortDirection, filtersHook.filters, filtersHook.cfoFilter, linkedOnly, fetchData]),
    threshold: 0.1,
  });

  return {
    data,
    allItems,
    loading,
    loadingMore,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters: filtersHook,
    loadMoreRef,
    paymentsTab,
    setPaymentsTab,
    linkedOnly,
  };
};
