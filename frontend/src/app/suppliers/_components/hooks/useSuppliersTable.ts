import { useState, useCallback, useEffect } from 'react';
import { PageResponse, SortField, SortDirection, Supplier } from '../types/suppliers.types';
import { PAGE_SIZE } from '../constants/suppliers.constants';
import { useSuppliersFilters } from './useSuppliersFilters';
import { useSuppliersData } from './useSuppliersData';

export function useSuppliersTable() {
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
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
    filters: Record<string, string>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await dataHook.fetchData(page, size, sortF, sortDir, filters);
      setAllItems(result?.content ?? []);
      setData(result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [dataHook.fetchData]);

  const filtersStr = JSON.stringify(filtersHook.filters);

  useEffect(() => {
    fetchData(
      currentPage,
      pageSize,
      sortField,
      sortDirection,
      filtersHook.filters
    );
  }, [currentPage, pageSize, sortField, sortDirection, filtersStr, fetchData]);

  return {
    data,
    allItems,
    loading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters: filtersHook,
  };
}
