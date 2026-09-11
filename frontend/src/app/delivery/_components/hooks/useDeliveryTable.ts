import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageResponse, SortField, SortDirection, Delivery } from '../types/delivery.types';
import { PAGE_SIZE } from '../constants/delivery.constants';
import { useDeliveryFilters } from './useDeliveryFilters';
import { useDeliveryData } from './useDeliveryData';
import { useInfiniteScroll } from './useInfiniteScroll';
import type { DeliveryTab } from '../ui/DeliveryTableTabs';
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
  // По умолчанию — по номеру заявки на закупку, от большего к меньшему
  const [sortField, setSortField] = useState<SortField>('contractPurchaseRequestId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  // По умолчанию список ограничен текущим годом; «Все» и «Без даты» переключаются кнопками
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [showNoDate, setShowNoDate] = useState(false);
  // Плановая дата поставки (ISO) — выбирается кликом по столбцу диаграммы над таблицей
  const [plannedDate, setPlannedDate] = useState<string | null>(null);
  // Вкладки (взаимоисключающие): «В работе» (по умолчанию) / «Закрыто» (Поставлено + Оплачено)
  // / «Закрыто-разобрать» (в отчёте «Закрыто», но по правилам не закрыта)
  const [activeTab, setActiveTab] = useState<DeliveryTab>('in-work');

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
      innerId: '', contractInnerId: '', contractPurchaseRequestId: '', supplierName: '',
      status: '', currency: '', comment: '', responsibleName: '', reportStatus: '', paymentsStatus: '',
    };
    filtersHook.setFilters(empty);
    filtersHook.setLocalFilters(empty);
    filtersHook.setPaymentSchemeFilter('');
    filtersHook.setShipmentStatusFilter('');
    filtersHook.setOverdueFilter(false);
    filtersHook.setDeliveredYearFilter(null);
    // Клик по сводке переводит на вкладку «Все» — сброс возвращает вкладку по умолчанию
    setActiveTab('in-work');
    // Сброс возвращает фильтр дат к состоянию по умолчанию — текущему году
    setSelectedYear(currentYear);
    setPlannedDate(null);
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
    paymentScheme: string,
    shipmentStatus: string,
    tab: DeliveryTab | null,
    recheck: boolean = false,
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
        page, size, sortF, sortDir, filters, year, noDate, paymentScheme, shipmentStatus, tab, recheck,
        plannedDate, filtersHook.overdueFilter, filtersHook.deliveredYearFilter
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
  }, [dataHook.fetchData, plannedDate, filtersHook.overdueFilter, filtersHook.deliveredYearFilter]);

  const filtersStr = useMemo(() => JSON.stringify(filtersHook.filters), [filtersHook.filters]);
  const paymentSchemeFilter = filtersHook.paymentSchemeFilter;
  const shipmentStatusFilter = filtersHook.shipmentStatusFilter;
  useEffect(() => {
    setCurrentPage(0);
    // recheck=true — основной запрос списка: бэкенд пересчитывает статусы (авто-закрытие) при обновлении.
    fetchData(0, pageSize, sortField, sortDirection, filtersHook.filters, false, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter, activeTab, true);
  }, [sortField, sortDirection, filtersStr, fetchData, pageSize, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter, activeTab, reloadKey, plannedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Счётчики вкладок — с учётом текущих фильтров (size=1, читаем totalElements).
  const [tabCounts, setTabCounts] = useState<{ all: number | null; inWork: number | null; closed: number | null; closedReview: number | null }>(
    { all: null, inWork: null, closed: null, closedReview: null }
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const count = (tab: DeliveryTab) => dataHook.fetchData(
        0, 1, null, null, filtersHook.filters, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter,
        tab, false, plannedDate, filtersHook.overdueFilter, filtersHook.deliveredYearFilter
      );
      try {
        const [all, inW, cl, clRev] = await Promise.all([
          count('all'), count('in-work'), count('closed'), count('closed-review'),
        ]);
        if (!cancelled) setTabCounts({
          all: all?.totalElements ?? 0,
          inWork: inW?.totalElements ?? 0,
          closed: cl?.totalElements ?? 0,
          closedReview: clRev?.totalElements ?? 0,
        });
      } catch {
        if (!cancelled) setTabCounts({ all: null, inWork: null, closed: null, closedReview: null });
      }
    })();
    return () => { cancelled = true; };
  }, [filtersStr, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter, reloadKey, dataHook.fetchData, plannedDate, filtersHook.overdueFilter, filtersHook.deliveredYearFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

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

  /**
   * Ручное изменение плановой даты поставки. Пустая строка возвращает дату в автоматический
   * режим (снова равна дедлайну), непустая — фиксирует её: автопересчёты, включая стартовую
   * сверку, такую дату не меняют. Значение в списке обновляется оптимистично.
   */
  const updatePlannedDeliveryDate = useCallback(async (id: number, newDate: string) => {
    const prev = allItems;
    setAllItems(items => items.map(it => (
      it.id === id
        ? { ...it, plannedDeliveryDate: newDate || it.deliveryDeadline, plannedDeliveryDateManual: Boolean(newDate) }
        : it
    )));
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${id}/planned-delivery-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedDeliveryDate: newDate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json() as Delivery;
      setAllItems(items => items.map(it => (it.id === id ? { ...it, ...saved } : it)));
    } catch (err) {
      console.error('Не удалось обновить плановую дату поставки:', err);
      setAllItems(prev);
    }
  }, [allItems]);

  /**
   * Ручной ввод фактической даты поставки или даты ЭСФ прямо в таблице (пустая строка очищает дату).
   * Значение обновляется оптимистично, затем строка берётся из ответа сервера: для факта сервер
   * меняет и статус отгрузки («Поставлено» / «Ожидает поставку»), и статус оплаты.
   */
  const updateDeliveryDateField = useCallback(async (
    id: number,
    field: 'actualDeliveryDate' | 'esfDate',
    endpoint: 'actual-delivery-date' | 'esf-date',
    newDate: string,
  ) => {
    const prev = allItems;
    setAllItems(items => items.map(it => (it.id === id ? { ...it, [field]: newDate || null } : it)));
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newDate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json() as Delivery;
      setAllItems(items => items.map(it => (it.id === id ? { ...it, ...saved } : it)));
    } catch (err) {
      console.error(`Не удалось обновить дату поставки (${field}):`, err);
      setAllItems(prev);
    }
  }, [allItems]);

  const updateActualDeliveryDate = useCallback(
    (id: number, newDate: string) => updateDeliveryDateField(id, 'actualDeliveryDate', 'actual-delivery-date', newDate),
    [updateDeliveryDateField]
  );

  const updateEsfDate = useCallback(
    (id: number, newDate: string) => updateDeliveryDateField(id, 'esfDate', 'esf-date', newDate),
    [updateDeliveryDateField]
  );

  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: useCallback(() => {
      if (hasMore && !loadingMore && allItems.length > 0) {
        const nextPage = currentPage + 1;
        fetchData(nextPage, pageSize, sortField, sortDirection, filtersHook.filters, true, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter, activeTab);
      }
    }, [hasMore, loadingMore, allItems.length, currentPage, pageSize, sortField, sortDirection, filtersHook.filters, fetchData, selectedYear, showNoDate, paymentSchemeFilter, shipmentStatusFilter, activeTab]),
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
    currentYear,
    activeTab,
    setActiveTab,
    tabCounts,
    handleYearChange,
    handleShowNoDate,
    handleShowAll,
    reload,
    updateDeliveryDeadline,
    updatePlannedDeliveryDate,
    updateActualDeliveryDate,
    updateEsfDate,
    plannedDate,
    setPlannedDate,
  };
};
