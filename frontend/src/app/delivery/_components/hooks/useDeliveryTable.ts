import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageResponse, SortField, SortDirection, Delivery } from '../types/delivery.types';
import { PAGE_SIZE } from '../constants/delivery.constants';
import { useDeliveryFilters } from './useDeliveryFilters';
import { useDeliveryData } from './useDeliveryData';
import { useInfiniteScroll } from './useInfiniteScroll';
import { getBackendUrl } from '@/utils/api';

export const useDeliveryTable = () => {
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const pageSize = PAGE_SIZE;
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showNoDate, setShowNoDate] = useState(false);

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= 2020; y--) years.push(y);
    return years;
  }, [currentYear]);

  const filtersHook = useDeliveryFilters(setCurrentPage);
  const dataHook = useDeliveryData();

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field ?? 'id');
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
      innerId: '', contractInnerId: '', supplierName: '',
      status: '', currency: '', comment: '', responsibleName: '',
    };
    filtersHook.setFilters(empty);
    filtersHook.setLocalFilters(empty);
    filtersHook.setPaymentSchemeFilter('');
    filtersHook.setShipmentStatusFilter('');
    setSelectedYear(null);
    setShowNoDate(false);
    setCurrentPage(0);
  }, [filtersHook]);

  const fetchData = useCallback(async (
    page: number,
    size: number,
    sortF: SortField,
    sortDir: SortDirection,
    filters: Record<string, string>,
    append: boolean,
    year: number | null,
    noDate: boolean,
    paymentScheme: string,
    shipmentStatus: string,
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllItems([]);
    }
    setError(null);
    try {
      const result = await dataHook.fetchData(page, size, sortF, sortDir, filters, year, noDate, paymentScheme, shipmentStatus);
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
  const paymentSchemeFilter = filtersHook.paymentSchemeFilter;
  const shipmentStatusFilter = filtersHook.shipmentStatusFilter;

  useEffect(() => {
    setCurrentPage(0);
    fetchData(0, pageSize, sortField, sortDirection, filtersHook.filters, false, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter);
  }, [sortField, sortDirection, filtersStr, fetchData, pageSize, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const [creatingMay, setCreatingMay] = useState(false);

  const createMayDeliveries = useCallback(async (): Promise<string> => {
    setCreatingMay(true);
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/from-specifications?month=5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json() as { created: number; skipped: number; totalSpecifications: number };
      reload();
      return `Создано поставок: ${result.created}. Пропущено (уже есть): ${result.skipped}. Всего спецификаций: ${result.totalSpecifications}.`;
    } catch (err) {
      console.error('Не удалось создать поставки за май:', err);
      return 'Не удалось создать поставки за май';
    } finally {
      setCreatingMay(false);
    }
  }, [reload]);

  const updateDeliveryDeadline = useCallback(async (id: number, newDate: string) => {
    const prev = allItems;
    setAllItems(items => items.map(it => (it.id === id ? { ...it, deliveryDeadline: newDate || null } : it)));
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${id}/delivery-deadline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryDeadline: newDate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Не удалось обновить срок поставки:', err);
      setAllItems(prev);
    }
  }, [allItems]);

  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: useCallback(() => {
      if (hasMore && !loadingMore && allItems.length > 0) {
        const nextPage = currentPage + 1;
        fetchData(nextPage, pageSize, sortField, sortDirection, filtersHook.filters, true, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter);
      }
    }, [hasMore, loadingMore, allItems.length, currentPage, pageSize, sortField, sortDirection, filtersHook.filters, fetchData, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter]),
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
    reload,
    updateDeliveryDeadline,
    createMayDeliveries,
    creatingMay,
  };
};
