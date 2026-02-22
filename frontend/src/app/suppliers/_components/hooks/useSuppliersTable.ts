import { useState, useCallback, useEffect, useRef } from 'react';
import { PageResponse, SortField, SortDirection, Supplier } from '../types/suppliers.types';
import { PAGE_SIZE } from '../constants/suppliers.constants';
import { useSuppliersFilters } from './useSuppliersFilters';
import { useSuppliersData } from './useSuppliersData';

export function useSuppliersTable() {
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = PAGE_SIZE;
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filtersHook = useSuppliersFilters(setCurrentPage);
  const dataHook = useSuppliersData();

  const handleSort = useCallback((field: SortField) => {
    if (!field) return;
    setSortField(field);
    setSortDirection(prev => (sortField === field && prev === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(0);
  }, [sortField]);

  const handleResetFilters = useCallback(() => {
    filtersHook.setFilters({ type: '', kpp: '', inn: '', code: '', name: '' });
    filtersHook.setLocalFilters({ type: '', kpp: '', inn: '', code: '', name: '' });
    setCurrentPage(0);
  }, [filtersHook]);

  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortF: SortField,
    sortDir: SortDirection,
    filters: Record<string, string>,
    append: boolean = false
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllItems([]);
    }
    setError(null);
    try {
      const result = await dataHook.fetchData(page, size, sortF, sortDir, filters);
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
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dataHook.fetchData]);

  const filtersStr = JSON.stringify(filtersHook.filters);

  useEffect(() => {
    fetchData(
      0,
      pageSize,
      sortField,
      sortDirection,
      filtersHook.filters,
      false
    );
  }, [sortField, sortDirection, filtersStr, fetchData]);

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
    hasMore,
    loadMoreRef,
    fetchData,
  };
}
