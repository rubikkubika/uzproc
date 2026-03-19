import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageResponse, SortField, SortDirection, Arrival } from '../types/arrivals.types';
import { PAGE_SIZE } from '../constants/arrivals.constants';
import { useArrivalsFilters } from './useArrivalsFilters';
import { useArrivalsData } from './useArrivalsData';
import { useInfiniteScroll } from './useInfiniteScroll';

export const useArrivalsTable = () => {
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = PAGE_SIZE;
  const [sortField, setSortField] = useState<SortField>('incomingDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Фильтр по году "Дата вх.": null = все, число = конкретный год
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [showNoDate, setShowNoDate] = useState(false);

  // Доступные годы
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= 2020; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const filtersHook = useArrivalsFilters(setCurrentPage);
  const dataHook = useArrivalsData();

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field ?? 'incomingDate');
      setSortDirection('asc');
    }
    setCurrentPage(0);
  }, [sortField]);

  const handleYearChange = useCallback((year: number | null) => {
    setSelectedYear(year);
    setShowNoDate(false);
    setCurrentPage(0);
  }, []);

  const handleShowNoDate = useCallback(() => {
    setShowNoDate(true);
    setSelectedYear(null);
    setCurrentPage(0);
  }, []);

  const handleShowAll = useCallback(() => {
    setSelectedYear(null);
    setShowNoDate(false);
    setCurrentPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    const empty: Record<string, string> = {
      number: '', supplierName: '', invoice: '', warehouse: '',
      operationType: '', department: '', incomingNumber: '', currency: '', comment: '', responsibleName: '',
    };
    filtersHook.setFilters(empty);
    filtersHook.setLocalFilters(empty);
    setSelectedYear(currentYear);
    setShowNoDate(false);
    setCurrentPage(0);
  }, [filtersHook, currentYear]);

  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortF: SortField,
    sortDir: SortDirection,
    filters: Record<string, string>,
    append: boolean,
    year: number | null,
    noDate: boolean,
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllItems([]);
    }
    setError(null);
    try {
      const result = await dataHook.fetchData(page, size, sortF, sortDir, filters, year, noDate);
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

  const filtersStr = useMemo(() => JSON.stringify(filtersHook.filters), [filtersHook.filters]);

  useEffect(() => {
    setCurrentPage(0);
    fetchData(0, pageSize, sortField, sortDirection, filtersHook.filters, false, selectedYear, showNoDate);
  }, [sortField, sortDirection, filtersStr, fetchData, pageSize, selectedYear, showNoDate]);

  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: useCallback(() => {
      if (hasMore && !loadingMore && allItems.length > 0) {
        const nextPage = currentPage + 1;
        fetchData(nextPage, pageSize, sortField, sortDirection, filtersHook.filters, true, selectedYear, showNoDate);
      }
    }, [hasMore, loadingMore, allItems.length, currentPage, pageSize, sortField, sortDirection, filtersHook.filters, fetchData, selectedYear, showNoDate]),
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
    selectedYear,
    showNoDate,
    availableYears,
    handleYearChange,
    handleShowNoDate,
    handleShowAll,
  };
};
