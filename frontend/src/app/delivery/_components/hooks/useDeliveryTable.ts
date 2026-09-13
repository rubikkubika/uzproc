import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageResponse, SortField, SortDirection, Delivery } from '../types/delivery.types';
import type { DeliveryQuery, DeliveryTab, HorizonKey } from '../types/delivery-query.types';
import { PAGE_SIZE } from '../constants/delivery.constants';
import { useDeliveryFilters } from './useDeliveryFilters';
import { useDeliveryData } from './useDeliveryData';
import { useInfiniteScroll } from './useInfiniteScroll';
import { useDeliveryTabCounts } from './useDeliveryTabCounts';
import { useDeliveryRowMutations } from './useDeliveryRowMutations';
import { useDeliveryPositionRestore } from './useDeliveryPositionRestore';
import { readDeliveryViewState, writeDeliveryViewState } from '../utils/delivery-view-state.utils';

export const useDeliveryTable = () => {
  // Сохранённое состояние — при возврате со страницы договора или заявки таблица открывается как была
  const [saved] = useState(readDeliveryViewState);
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  // По умолчанию — по номеру заявки на закупку, от большего к меньшему
  const [sortField, setSortField] = useState<SortField>(saved?.sortField ?? 'contractPurchaseRequestId');
  const [sortDirection, setSortDirection] = useState<SortDirection>(saved?.sortDirection ?? 'desc');
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // Контейнер прокрутки таблицы — его позиция запоминается при переходе к договору или заявке
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  // По умолчанию список ограничен текущим годом; «Все» и «Без даты» переключаются кнопками
  const [selectedYear, setSelectedYear] = useState<number | null>(saved ? saved.query.year : currentYear);
  const [showNoDate, setShowNoDate] = useState(saved?.query.noDate ?? false);
  // День, выбранный на ленте «По дням» (ISO), и группа горизонта — взаимоисключающие
  const [plannedDate, setPlannedDate] = useState<string | null>(saved?.query.plannedDate ?? null);
  const [horizon, setHorizon] = useState<HorizonKey | null>(saved?.query.horizon ?? null);
  // Вкладки (взаимоисключающие): «В работе» (по умолчанию) / «Закрыто» (Поставлено + Оплачено)
  // / «Закрыто-разобрать» (в отчёте «Закрыто», но по правилам не закрыта)
  const [activeTab, setActiveTab] = useState<DeliveryTab>(saved?.query.tab ?? 'in-work');

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= 2020; y--) years.push(y);
    return years;
  }, [currentYear]);

  const filtersHook = useDeliveryFilters(setCurrentPage, saved?.query ?? null);
  const { fetchData: fetchPage } = useDeliveryData();
  const mutations = useDeliveryRowMutations(setAllItems);

  const query: DeliveryQuery = useMemo(() => ({
    filters: filtersHook.filters,
    year: selectedYear,
    noDate: showNoDate,
    paymentScheme: filtersHook.paymentSchemeFilter,
    shipmentStatus: filtersHook.shipmentStatusFilter,
    tab: activeTab,
    plannedDate,
    overdue: filtersHook.overdueFilter,
    deliveredYear: filtersHook.deliveredYearFilter,
    horizon,
  }), [filtersHook.filters, selectedYear, showNoDate, filtersHook.paymentSchemeFilter, filtersHook.shipmentStatusFilter,
    activeTab, plannedDate, filtersHook.overdueFilter, filtersHook.deliveredYearFilter, horizon]);
  const queryStr = JSON.stringify(query);

  const tabCounts = useDeliveryTabCounts(query, reloadKey, fetchPage);
  const { initialSize } = useDeliveryPositionRestore({ saved, scrollRef, loading, itemsCount: allItems.length });

  // Фильтры и сортировка запоминаются при каждом изменении; позиция в списке — только при уходе со страницы,
  // поэтому здесь она обнуляется: после смены фильтров прежняя прокрутка уже не имеет смысла
  useEffect(() => {
    writeDeliveryViewState({ query: JSON.parse(queryStr), sortField, sortDirection, loadedCount: 0, scrollTop: 0 });
  }, [queryStr, sortField, sortDirection]);

  /** Перед переходом к договору или заявке: запоминает, сколько строк подгружено и где прокрутка */
  const rememberPosition = useCallback(() => {
    writeDeliveryViewState({ loadedCount: allItems.length, scrollTop: scrollRef.current?.scrollTop ?? 0 });
  }, [allItems.length]);

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

  /** Клик по дню ленты: выбирает день (null — снимает) и снимает группу горизонта */
  const selectPlannedDate = useCallback((date: string | null) => {
    setPlannedDate(date);
    setHorizon(null);
    setCurrentPage(0);
  }, []);

  /** Клик по карточке горизонта: повторный клик снимает, выбор снимает день */
  const toggleHorizon = useCallback((key: HorizonKey) => {
    setHorizon(prev => (prev === key ? null : key));
    setPlannedDate(null);
    setCurrentPage(0);
  }, []);

  const clearHorizon = useCallback(() => setHorizon(null), []);

  const handleResetFilters = useCallback(() => {
    filtersHook.resetAll();
    // Клик по сводке переводит на вкладку «Все» — сброс возвращает вкладку по умолчанию
    setActiveTab('in-work');
    // Сброс возвращает фильтр дат к состоянию по умолчанию — текущему году
    setSelectedYear(currentYear);
    setShowNoDate(false);
    setPlannedDate(null);
    setHorizon(null);
    setCurrentPage(0);
  }, [filtersHook, currentYear]);

  const fetchData = useCallback(async (page: number, append: boolean, recheck = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllItems([]);
    }
    setError(null);
    // Первая страница при возврате на прежнее место — сразу все ранее подгруженные строки
    const size = append ? PAGE_SIZE : initialSize();
    try {
      const result = await fetchPage(page, size, sortField, sortDirection, JSON.parse(queryStr), recheck);
      const items = result?.content ?? [];
      setAllItems(prev => (append ? [...prev, ...items] : items));
      setData(result ?? null);
      const totalPages = result?.totalPages ?? 0;
      setHasMore(items.length === size && (totalPages === 0 || page + 1 < totalPages));
      // Запрос размера N страниц покрывает страницы 0..N-1 — следующая подгрузка продолжит с N
      setCurrentPage(page + size / PAGE_SIZE - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchPage, sortField, sortDirection, queryStr, initialSize]);

  useEffect(() => {
    setCurrentPage(0);
    // recheck=true — основной запрос списка: бэкенд пересчитывает статусы (авто-закрытие) при обновлении.
    fetchData(0, false, true);
  }, [fetchData, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: useCallback(() => {
      if (hasMore && !loadingMore && allItems.length > 0) fetchData(currentPage + 1, true);
    }, [hasMore, loadingMore, allItems.length, currentPage, fetchData]),
    threshold: 0.1,
  });

  return {
    data,
    allItems,
    loading,
    loadingMore,
    hasMore,
    error,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters: filtersHook,
    loadMoreRef,
    scrollRef,
    rememberPosition,
    query,
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
    reloadKey,
    plannedDate,
    selectPlannedDate,
    horizon,
    toggleHorizon,
    clearHorizon,
    ...mutations,
  };
};
