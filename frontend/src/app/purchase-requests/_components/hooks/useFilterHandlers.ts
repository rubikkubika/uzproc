import { useCallback, useMemo } from 'react';
import type { PurchaseRequest, TabType } from '../types/purchase-request.types';

interface UseFilterHandlersProps {
  filtersFromHook: Record<string, string>;
  localFilters: Record<string, string>;
  setFilters: (filters: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setLocalFilters: (filters: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setCurrentPage: (page: number) => void;
  setAllItems: (items: any[] | ((prev: any[]) => any[])) => void;
  cfoFilter: Set<string>;
  statusFilter: Set<string>;
  purchaserFilter: Set<string>;
  setCfoFilter: (filter: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setStatusFilter: (filter: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setPurchaserFilter: (filter: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setActiveTab?: (tab: TabType) => void;
  cfoSearchQuery: string;
  statusSearchQuery: string;
  purchaserSearchQuery: string;
  setStatusSearchQuery: (query: string) => void;
  uniqueValues: Record<string, string[]>;
}

export function useFilterHandlers({
  filtersFromHook,
  localFilters,
  setFilters,
  setLocalFilters,
  setCurrentPage,
  setAllItems,
  cfoFilter,
  statusFilter,
  purchaserFilter,
  setCfoFilter,
  setStatusFilter,
  setPurchaserFilter,
  setActiveTab,
  cfoSearchQuery,
  statusSearchQuery,
  purchaserSearchQuery,
  setStatusSearchQuery,
  uniqueValues,
}: UseFilterHandlersProps) {
  const handleFilterChange = useCallback((field: string, value: string, isTextFilter: boolean = false) => {
    if (isTextFilter) {
      // Для текстовых фильтров обновляем только локальное состояние
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      // Не сбрасываем страницу сразу для текстовых фильтров (сделаем это через debounce)
    } else {
      // Для select фильтров обновляем оба состояния сразу
      setFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      setCurrentPage(0); // Сбрасываем на первую страницу при изменении фильтра
      setAllItems([]); // Очищаем накопленные данные
    }
  }, [setFilters, setLocalFilters, setCurrentPage, setAllItems]);

  // Обработчик для select-фильтров (обновляет оба состояния сразу)
  const handleSelectFilterChange = useCallback((field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
    setLocalFilters(prev => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(0);
    setAllItems([]);
  }, [setFilters, setLocalFilters, setCurrentPage, setAllItems]);

  const getUniqueValues = useCallback((field: keyof PurchaseRequest): string[] => {
    const fieldMap: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo',
      purchaseRequestInitiator: 'purchaseRequestInitiator',
      purchaser: 'purchaser',
      costType: 'costType',
      contractType: 'contractType',
      status: 'status',
    };
    return uniqueValues[fieldMap[field] || 'cfo'] || [];
  }, [uniqueValues]);

  // Обработчики для фильтров с чекбоксами
  const handleCfoToggle = useCallback((cfo: string) => {
    const newSet = new Set(cfoFilter);
    if (newSet.has(cfo)) {
      newSet.delete(cfo);
    } else {
      newSet.add(cfo);
    }
    setCfoFilter(newSet);
    // Обновляем фильтр для запроса
    if (newSet.size > 0) {
      setFilters(prev => ({ ...prev, cfo: Array.from(newSet).join(',') }));
    } else {
      setFilters(prev => ({ ...prev, cfo: '' }));
    }
    setCurrentPage(0);
  }, [cfoFilter, setCfoFilter, setFilters, setCurrentPage]);

  const handleStatusToggle = useCallback((status: string) => {
    const newSet = new Set(statusFilter);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setStatusFilter(newSet);
    setCurrentPage(0);
  }, [statusFilter, setStatusFilter, setCurrentPage]);

  const handlePurchaserToggle = useCallback((purchaser: string) => {
    const newSet = new Set(purchaserFilter);
    if (newSet.has(purchaser)) {
      newSet.delete(purchaser);
    } else {
      newSet.add(purchaser);
    }
    setPurchaserFilter(newSet);
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
    if (newSet.size > 0 && setActiveTab) setActiveTab('in-work');
  }, [purchaserFilter, setPurchaserFilter, setCurrentPage, setAllItems, setActiveTab]);

  const handleCfoSelectAll = useCallback(() => {
    const allCfo = getUniqueValues('cfo');
    const newSet = new Set(allCfo);
    setCfoFilter(newSet);
    setFilters(prev => ({ ...prev, cfo: allCfo.join(',') }));
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  }, [getUniqueValues, setCfoFilter, setFilters, setCurrentPage, setAllItems]);

  const handleCfoDeselectAll = useCallback(() => {
    setCfoFilter(new Set());
    setFilters(prev => ({ ...prev, cfo: '' }));
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  }, [setCfoFilter, setFilters, setCurrentPage, setAllItems]);

  const handlePurchaserSelectAll = useCallback(() => {
    const allPurchasers = getUniqueValues('purchaser');
    setPurchaserFilter(new Set(allPurchasers));
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
    if (allPurchasers.length > 0 && setActiveTab) setActiveTab('in-work');
  }, [getUniqueValues, setPurchaserFilter, setCurrentPage, setAllItems, setActiveTab]);

  const handlePurchaserDeselectAll = useCallback(() => {
    setPurchaserFilter(new Set());
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  }, [setPurchaserFilter, setCurrentPage, setAllItems]);

  const handleStatusSelectAll = useCallback(() => {
    const allStatuses = getUniqueValues('status');
    const newSet = new Set(allStatuses);
    setStatusFilter(newSet);
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  }, [getUniqueValues, setStatusFilter, setCurrentPage, setAllItems]);

  const handleStatusDeselectAll = useCallback(() => {
    setStatusFilter(new Set());
    setStatusSearchQuery(''); // Очищаем поисковый запрос, чтобы показать все статусы
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  }, [setStatusFilter, setStatusSearchQuery, setCurrentPage, setAllItems]);

  // Фильтруем опции по поисковому запросу
  const getFilteredCfoOptions = useMemo(() => {
    const allCfo = uniqueValues.cfo || [];
    if (!cfoSearchQuery || !cfoSearchQuery.trim()) {
      return allCfo;
    }
    const searchLower = cfoSearchQuery.toLowerCase().trim();
    return allCfo.filter(cfo => {
      if (!cfo) return false;
      return cfo.toLowerCase().includes(searchLower);
    });
  }, [cfoSearchQuery, uniqueValues.cfo]);

  const getFilteredPurchaserOptions = useMemo(() => {
    const allPurchasers = uniqueValues.purchaser || [];
    if (!purchaserSearchQuery || !purchaserSearchQuery.trim()) {
      return allPurchasers;
    }
    const searchLower = purchaserSearchQuery.toLowerCase().trim();
    return allPurchasers.filter(p => {
      if (!p) return false;
      return p.toLowerCase().includes(searchLower);
    });
  }, [purchaserSearchQuery, uniqueValues.purchaser]);

  const getFilteredStatusOptions = useMemo(() => {
    // Используем уникальные группы статусов из метаданных (уже загружаются через useMetadata / unique-values)
    const statusGroups = uniqueValues.statusGroup || [];
    if (!statusSearchQuery || !statusSearchQuery.trim()) {
      return statusGroups;
    }
    const searchLower = statusSearchQuery.toLowerCase().trim();
    return statusGroups.filter(statusGroup => {
      if (!statusGroup) return false;
      return statusGroup.toLowerCase().includes(searchLower);
    });
  }, [statusSearchQuery, uniqueValues.statusGroup]);

  return {
    handleFilterChange,
    handleSelectFilterChange,
    handleCfoToggle,
    handleStatusToggle,
    handlePurchaserToggle,
    handleCfoSelectAll,
    handleCfoDeselectAll,
    handlePurchaserSelectAll,
    handlePurchaserDeselectAll,
    handleStatusSelectAll,
    handleStatusDeselectAll,
    getFilteredCfoOptions,
    getFilteredPurchaserOptions,
    getFilteredStatusOptions,
  };
}
