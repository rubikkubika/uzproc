import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ALL_STATUSES } from '../constants/purchases.constants';
import { Purchase } from '../types/purchases.types';

export const usePurchasesFilters = (
  setCurrentPage: (page: number) => void
) => {
  const [filters, setFilters] = useState<Record<string, string>>({
    innerId: '',
    cfo: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
    purchaseRequestId: '', // Фильтр по номеру заявки
    purchaseMethod: '', // Фильтр по способу закупки
  });

  // Локальное состояние для текстовых фильтров (для сохранения фокуса)
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    innerId: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
    purchaseRequestId: '', // Фильтр по номеру заявки
    purchaseMethod: '', // Фильтр по способу закупки
  });

  // ID активного поля для восстановления фокуса
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Состояние для множественных фильтров (чекбоксы)
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [purchaserFilter, setPurchaserFilter] = useState<Set<string>>(new Set());

  // Состояние для открытия/закрытия выпадающих списков
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isPurchaserFilterOpen, setIsPurchaserFilterOpen] = useState(false);

  // Поиск внутри фильтров
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [purchaserSearchQuery, setPurchaserSearchQuery] = useState('');

  // Позиции для выпадающих списков
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusFilterPosition, setStatusFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserFilterPosition, setPurchaserFilterPosition] = useState<{ top: number; left: number } | null>(null);

  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserFilterButtonRef = useRef<HTMLButtonElement>(null);

  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
    purchaser: [],
  });

  // Функция для расчета позиции выпадающего списка
  const calculateFilterPosition = useCallback((buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      };
    }
    return null;
  }, []);

  // Обновляем позицию при открытии фильтра ЦФО
  useEffect(() => {
    if (isCfoFilterOpen && cfoFilterButtonRef.current) {
      const position = calculateFilterPosition(cfoFilterButtonRef);
      setCfoFilterPosition(position);
    }
  }, [isCfoFilterOpen, calculateFilterPosition]);

  // Обновляем позицию при открытии фильтра Статус
  useEffect(() => {
    if (isStatusFilterOpen && statusFilterButtonRef.current) {
      const position = calculateFilterPosition(statusFilterButtonRef);
      setStatusFilterPosition(position);
    }
  }, [isStatusFilterOpen, calculateFilterPosition]);

  // Обновляем позицию при открытии фильтра Закупщик
  useEffect(() => {
    if (isPurchaserFilterOpen && purchaserFilterButtonRef.current) {
      const position = calculateFilterPosition(purchaserFilterButtonRef);
      setPurchaserFilterPosition(position);
    }
  }, [isPurchaserFilterOpen, calculateFilterPosition]);

  const handleFilterChange = useCallback((field: string, value: string) => {
    // Обновляем локальное состояние для текстовых фильтров
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
    // Фильтры будут применены через debounce в useEffect
  }, []);

  const getUniqueValues = useCallback((field: keyof Purchase): string[] => {
    const fieldMap: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo',
      purchaser: 'purchaser',
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
  }, [cfoFilter, setCurrentPage]);

  const handleCfoSelectAll = useCallback(() => {
    const allCfo = getUniqueValues('cfo');
    const newSet = new Set(allCfo);
    setCfoFilter(newSet);
    setFilters(prev => ({ ...prev, cfo: allCfo.join(',') }));
    setCurrentPage(0);
  }, [getUniqueValues, setCurrentPage]);

  const handleCfoDeselectAll = useCallback(() => {
    setCfoFilter(new Set());
    setFilters(prev => ({ ...prev, cfo: '' }));
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handlePurchaserToggle = useCallback((purchaser: string) => {
    const newSet = new Set(purchaserFilter);
    if (newSet.has(purchaser)) {
      newSet.delete(purchaser);
    } else {
      newSet.add(purchaser);
    }
    setPurchaserFilter(newSet);
    setCurrentPage(0);
  }, [purchaserFilter, setCurrentPage]);

  const handlePurchaserSelectAll = useCallback(() => {
    const allPurchasers = getUniqueValues('purchaser');
    setPurchaserFilter(new Set(allPurchasers));
    setCurrentPage(0);
  }, [getUniqueValues, setCurrentPage]);

  const handlePurchaserDeselectAll = useCallback(() => {
    setPurchaserFilter(new Set());
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleStatusToggle = useCallback((status: string) => {
    const newSet = new Set(statusFilter);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setStatusFilter(newSet);
    setCurrentPage(0);
  }, [statusFilter, setCurrentPage]);

  const handleStatusSelectAll = useCallback(() => {
    setStatusFilter(new Set(ALL_STATUSES));
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleStatusDeselectAll = useCallback(() => {
    setStatusFilter(new Set());
    setCurrentPage(0);
  }, [setCurrentPage]);

  const getFilteredStatusOptions = useCallback(() => {
    if (!statusSearchQuery.trim()) return ALL_STATUSES;
    return ALL_STATUSES.filter(status =>
      status.toLowerCase().includes(statusSearchQuery.toLowerCase())
    );
  }, [statusSearchQuery]);

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

  // Debounce для текстовых фильтров и фильтра бюджета (задержка 500мс)
  useEffect(() => {
    // Проверяем, изменились ли текстовые фильтры
    const textFields = ['innerId', 'purchaseRequestId', 'purchaseMethod'];
    const hasTextChanges = textFields.some(field => localFilters[field] !== filters[field]);
    // Для бюджета проверяем изменение значения
    const hasBudgetValueChange = localFilters.budgetAmount !== filters.budgetAmount;
    // Проверяем изменение оператора (если значение бюджета уже есть, нужно обновить запрос)
    const hasBudgetOperatorChange = localFilters.budgetAmountOperator !== filters.budgetAmountOperator;
    // Проверяем наличие значения бюджета в localFilters (а не в filters), так как оно может еще не попасть в filters из-за debounce
    const hasBudgetValue = localFilters.budgetAmount && localFilters.budgetAmount.trim() !== '';

    if (hasTextChanges || hasBudgetValueChange || (hasBudgetOperatorChange && hasBudgetValue)) {
      const timer = setTimeout(() => {
        setFilters(prev => {
          // Обновляем только измененные текстовые поля и поля бюджета
          const updated = { ...prev };
          textFields.forEach(field => {
            updated[field] = localFilters[field];
          });
          // Обновляем значение бюджета и оператор вместе
          // Сохраняем значение бюджета только если оно не пустое
          if (localFilters.budgetAmount && localFilters.budgetAmount.trim() !== '') {
            updated.budgetAmount = localFilters.budgetAmount;
          } else if (localFilters.budgetAmount === '') {
            // Если значение явно очищено, сохраняем пустую строку
            updated.budgetAmount = '';
          }
          // Оператор всегда обновляем
          updated.budgetAmountOperator = localFilters.budgetAmountOperator;
          return updated;
        });
        setCurrentPage(0); // Сбрасываем на первую страницу после применения фильтра
      }, hasBudgetOperatorChange && hasBudgetValue ? 0 : 500); // Для оператора без задержки, для значения с задержкой

      return () => clearTimeout(timer);
    }
  }, [localFilters, filters, setCurrentPage]);

  return {
    filters,
    setFilters,
    localFilters,
    setLocalFilters,
    focusedField,
    setFocusedField,
    cfoFilter,
    setCfoFilter,
    statusFilter,
    setStatusFilter,
    purchaserFilter,
    setPurchaserFilter,
    isCfoFilterOpen,
    setIsCfoFilterOpen,
    isStatusFilterOpen,
    setIsStatusFilterOpen,
    isPurchaserFilterOpen,
    setIsPurchaserFilterOpen,
    cfoSearchQuery,
    setCfoSearchQuery,
    statusSearchQuery,
    setStatusSearchQuery,
    purchaserSearchQuery,
    setPurchaserSearchQuery,
    cfoFilterPosition,
    statusFilterPosition,
    purchaserFilterPosition,
    cfoFilterButtonRef,
    statusFilterButtonRef,
    purchaserFilterButtonRef,
    uniqueValues,
    setUniqueValues,
    handleFilterChange,
    getUniqueValues,
    handleCfoToggle,
    handleCfoSelectAll,
    handleCfoDeselectAll,
    handlePurchaserToggle,
    handlePurchaserSelectAll,
    handlePurchaserDeselectAll,
    handleStatusToggle,
    handleStatusSelectAll,
    handleStatusDeselectAll,
    getFilteredStatusOptions,
    getFilteredCfoOptions,
    getFilteredPurchaserOptions,
  };
};
