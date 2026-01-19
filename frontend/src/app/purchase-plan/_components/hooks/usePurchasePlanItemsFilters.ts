import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { DEFAULT_STATUSES, FILTERS_STORAGE_KEY } from '../constants/purchase-plan-items.constants';
import { PurchasePlanItem } from '../types/purchase-plan-items.types';
import { getBackendUrl } from '@/utils/api';


// Функция для нормализации названия компании
const normalizeCompany = (company: string | null): string | null => {
  if (!company) return null;
  const normalized = company.trim().toLowerCase();
  
  if (normalized.includes('узум') && normalized.includes('маркет')) return 'Market';
  if (normalized.includes('uzum') && normalized.includes('market')) return 'Market';
  if (normalized === 'market') return 'Market';
  if (normalized.includes('узум') && normalized.includes('технологи')) return 'Holding';
  if (normalized.includes('uzum') && normalized.includes('technolog')) return 'Holding';
  if (normalized === 'holding') return 'Holding';
  if (normalized.includes('uzum') && normalized.includes('tezkor')) return 'Tezkor';
  if (normalized === 'tezkor') return 'Tezkor';

  if (company === 'Market' || company === 'Holding' || company === 'Tezkor') return company;
  if (company === 'Uzum Market') return 'Market';
  if (company === 'Uzum Technologies') return 'Holding';
  if (company === 'Uzum Tezkor') return 'Tezkor';
  
  return company;
};

export const usePurchasePlanItemsFilters = (
  setCurrentPage: (page: number) => void,
  selectedYear: number | null,
  selectedMonths: Set<number>,
  sortField: any,
  sortDirection: any,
  pageSize: number
) => {
  const [filters, setFilters] = useState<Record<string, string>>({
    id: '',
    purchaseSubject: '',
    currentContractEndDate: '',
    purchaseRequestId: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte',
  });

  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    id: '',
    purchaseSubject: '',
    currentContractEndDate: '',
    purchaseRequestId: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte',
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<Set<string>>(new Set());
  const [purchaserCompanyFilter, setPurchaserCompanyFilter] = useState<Set<string>>(new Set(['Market']));
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const statusFilterInitializedRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [purchaserFilter, setPurchaserFilter] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const savedFilters = JSON.parse(saved);
        if (Array.isArray(savedFilters?.purchaserFilter)) {
          const purchaserArray = savedFilters.purchaserFilter.filter(
            (item: unknown): item is string => typeof item === 'string'
          );
          return new Set<string>(purchaserArray);
        }
      }
    } catch { }
    return new Set<string>();
  });

  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
  const [isPurchaserCompanyFilterOpen, setIsPurchaserCompanyFilterOpen] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isPurchaserFilterOpen, setIsPurchaserFilterOpen] = useState(false);

  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [purchaserCompanySearchQuery, setPurchaserCompanySearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [purchaserSearchQuery, setPurchaserSearchQuery] = useState('');

  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [companyFilterPosition, setCompanyFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserCompanyFilterPosition, setPurchaserCompanyFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [categoryFilterPosition, setCategoryFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusFilterPosition, setStatusFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserFilterPosition, setPurchaserFilterPosition] = useState<{ top: number; left: number } | null>(null);

  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  const companyFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserCompanyFilterButtonRef = useRef<HTMLButtonElement>(null);
  const categoryFilterButtonRef = useRef<HTMLButtonElement>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserFilterButtonRef = useRef<HTMLButtonElement>(null);

  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
    company: [],
    purchaserCompany: [],
    purchaser: [],
    category: [],
    status: [],
  });

  const calculateFilterPosition = useCallback((buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX };
    }
    return null;
  }, []);

  const handleFilterChange = (field: string, value: string, isTextFilter: boolean = false) => {
    if (isTextFilter) {
      setLocalFilters(prev => ({ ...prev, [field]: value }));
    } else {
      setFilters(prev => ({ ...prev, [field]: value }));
      setLocalFilters(prev => ({ ...prev, [field]: value }));
      setCurrentPage(0);
    }
  };

  const handleFilterChangeForHeader = useCallback((fieldKey: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [fieldKey]: value }));
  }, []);

  const handleFocusForHeader = useCallback((fieldKey: string) => setFocusedField(fieldKey), []);
  
  const handleBlurForHeader = useCallback((e: React.FocusEvent<HTMLInputElement>, fieldKey: string) => {
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement || (activeElement !== e.target && !activeElement.closest('input[data-filter-field]') && !activeElement.closest('select'))) {
        setFocusedField(null);
      }
    }, 200);
  }, []);

  const getUniqueValues = (field: keyof PurchasePlanItem): string[] => {
    const map: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo', company: 'company', purchaserCompany: 'purchaserCompany',
      purchaser: 'purchaser', category: 'category', status: 'status'
    };
    return uniqueValues[map[field] || 'cfo'] || [];
  };

  // Обработчики чекбоксов
  const handleCfoToggle = useCallback((cfo: string) => {
    setCfoFilter(prev => { const newSet = new Set(prev); newSet.has(cfo) ? newSet.delete(cfo) : newSet.add(cfo); setCurrentPage(0); return newSet; });
  }, [setCurrentPage]);
  const handleCfoSelectAll = useCallback(() => { setCfoFilter(new Set(getUniqueValues('cfo'))); setCurrentPage(0); }, [getUniqueValues, setCurrentPage]);
  const handleCfoDeselectAll = useCallback(() => { setCfoFilter(new Set()); setCurrentPage(0); }, [setCurrentPage]);

  const handleCompanyToggle = useCallback((company: string) => {
    setCompanyFilter(prev => { const newSet = new Set(prev); newSet.has(company) ? newSet.delete(company) : newSet.add(company); setCurrentPage(0); return newSet; });
  }, [setCurrentPage]);
  const handleCompanySelectAll = useCallback(() => { setCompanyFilter(new Set(getUniqueValues('company'))); setCurrentPage(0); }, [getUniqueValues, setCurrentPage]);
  const handleCompanyDeselectAll = useCallback(() => { setCompanyFilter(new Set()); setCurrentPage(0); }, [setCurrentPage]);

  const handlePurchaserCompanyToggle = useCallback((purchaserCompany: string) => {
    setPurchaserCompanyFilter(prev => { const newSet = new Set(prev); newSet.has(purchaserCompany) ? newSet.delete(purchaserCompany) : newSet.add(purchaserCompany); setCurrentPage(0); return newSet; });
  }, [setCurrentPage]);
  const handlePurchaserCompanySelectAll = useCallback(() => { setPurchaserCompanyFilter(new Set(getUniqueValues('purchaserCompany'))); setCurrentPage(0); }, [getUniqueValues, setCurrentPage]);
  const handlePurchaserCompanyDeselectAll = useCallback(() => { setPurchaserCompanyFilter(new Set()); setCurrentPage(0); }, [setCurrentPage]);

  const handleCategoryToggle = useCallback((category: string) => { setCategoryFilter(prev => { const newSet = new Set(prev); newSet.has(category) ? newSet.delete(category) : newSet.add(category); return newSet; }); setCurrentPage(0); }, [setCurrentPage]);
  const handleCategorySelectAll = useCallback(() => { setCategoryFilter(new Set(getUniqueValues('category'))); setCurrentPage(0); }, [getUniqueValues, setCurrentPage]);
  const handleCategoryDeselectAll = useCallback(() => { setCategoryFilter(new Set()); setCurrentPage(0); }, [setCurrentPage]);

  const handleStatusToggle = useCallback((status: string) => {
    setStatusFilter(prev => { const newSet = new Set(prev); newSet.has(status) ? newSet.delete(status) : newSet.add(status); setCurrentPage(0); return newSet; });
  }, [setCurrentPage]);
  const handleStatusSelectAll = useCallback(() => { setStatusFilter(new Set(getUniqueValues('status'))); setCurrentPage(0); }, [getUniqueValues, setCurrentPage]);
  const handleStatusDeselectAll = useCallback(() => { setStatusFilter(new Set()); setCurrentPage(0); }, [setCurrentPage]);

  const handlePurchaserToggle = useCallback((purchaser: string) => {
    setPurchaserFilter(prev => {
      const newSet = new Set(prev);
      newSet.has(purchaser) ? newSet.delete(purchaser) : newSet.add(purchaser);

      try {
        const filtersToSave = {
          selectedYear,
          selectedMonths: Array.from(selectedMonths),
          filters,
          cfoFilter: Array.from(cfoFilter),
          categoryFilter: Array.from(categoryFilter),
          purchaserFilter: Array.from(newSet),
          sortField,
          sortDirection,
        };
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
      } catch { }

      return newSet;
    });
    setCurrentPage(0);
  }, [selectedYear, selectedMonths, filters, cfoFilter, categoryFilter, sortField, sortDirection, setCurrentPage]);

  const handlePurchaserSelectAll = useCallback(() => {
    const newSet = new Set(getUniqueValues('purchaser'));
    setPurchaserFilter(newSet);
    setCurrentPage(0);

    try {
      const filtersToSave = {
        selectedYear,
        selectedMonths: Array.from(selectedMonths),
        filters,
        cfoFilter: Array.from(cfoFilter),
        categoryFilter: Array.from(categoryFilter),
        purchaserFilter: Array.from(newSet),
        sortField,
        sortDirection,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch { }
  }, [selectedYear, selectedMonths, filters, cfoFilter, categoryFilter, sortField, sortDirection, getUniqueValues, setCurrentPage]);

  const handlePurchaserDeselectAll = useCallback(() => {
    const emptySet = new Set<string>();
    setPurchaserFilter(emptySet);
    setCurrentPage(0);

    try {
      const filtersToSave = {
        selectedYear,
        selectedMonths: Array.from(selectedMonths),
        filters,
        cfoFilter: Array.from(cfoFilter),
        categoryFilter: Array.from(categoryFilter),
        purchaserFilter: Array.from(emptySet),
        sortField,
        sortDirection,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch { }
  }, [selectedYear, selectedMonths, filters, cfoFilter, categoryFilter, sortField, sortDirection, setCurrentPage]);

  // Поиск фильтров
  const getFilteredOptions = useCallback((all: string[], query: string) => {
    if (!query?.trim()) return all;
    const q = query.toLowerCase().trim();
    return all.filter(item => item?.toLowerCase().includes(q));
  }, []);

  const getFilteredCfoOptions = useMemo(() => getFilteredOptions(uniqueValues.cfo, cfoSearchQuery), [cfoSearchQuery, uniqueValues.cfo, getFilteredOptions]);
  const getFilteredCompanyOptions = useMemo(() => getFilteredOptions(uniqueValues.company, companySearchQuery), [companySearchQuery, uniqueValues.company, getFilteredOptions]);
  const getFilteredPurchaserCompanyOptions = useMemo(() => getFilteredOptions(uniqueValues.purchaserCompany, purchaserCompanySearchQuery), [purchaserCompanySearchQuery, uniqueValues.purchaserCompany, getFilteredOptions]);
  const getFilteredCategoryOptions = useMemo(() => getFilteredOptions(uniqueValues.category, categorySearchQuery), [categorySearchQuery, uniqueValues.category, getFilteredOptions]);
  const getFilteredStatusOptions = useMemo(() => getFilteredOptions(uniqueValues.status, statusSearchQuery), [statusSearchQuery, uniqueValues.status, getFilteredOptions]);
  const getFilteredPurchaserOptions = useMemo(() => getFilteredOptions(uniqueValues.purchaser, purchaserSearchQuery), [purchaserSearchQuery, uniqueValues.purchaser, getFilteredOptions]);

  // Загрузка уникальных значений для всех полей ВКЛЮЧАЯ статусы
  useEffect(() => {
    const fetchUniqueValues = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const values: Record<string, Set<string>> = {
            cfo: new Set(), company: new Set(), purchaserCompany: new Set(),
            purchaser: new Set(), category: new Set(), status: new Set()
          };
          let hasNullPurchaserCompany = false, hasNullCompany = false, hasNullStatus = false;

          result.content.forEach((item: PurchasePlanItem) => {
            if (item.cfo) values.cfo.add(item.cfo);
            if (item.company) values.company.add(item.company); else { hasNullCompany = true; }
            if (item.purchaserCompany) { const n = normalizeCompany(item.purchaserCompany); if (n) values.purchaserCompany.add(n); } else { hasNullPurchaserCompany = true; }
            if (item.purchaser) values.purchaser.add(item.purchaser);
            if (item.category) values.category.add(item.category);

            // Извлекаем статусы из обоих полей:
            // 1. status (PurchasePlanItemStatus) - статус самого плана закупок
            // 2. purchaseRequestStatus - статус заявки на закупку (если есть purchaseRequestId)
            if (item.purchaseRequestId !== null && item.purchaseRequestStatus) {
              values.status.add(item.purchaseRequestStatus);
            } else if (item.status) {
              values.status.add(item.status);
            } else {
              hasNullStatus = true;
            }
          });

          if (hasNullPurchaserCompany) values.purchaserCompany.add('Не выбрано');
          if (hasNullCompany) values.company.add('Не выбрано');
          if (hasNullStatus) values.status.add('Пусто');

          const newStatuses = Array.from(values.status).sort((a,b)=>a.localeCompare(b,'ru',{sensitivity:'base'}));

          // Обновляем uniqueValues для всех полей
          setUniqueValues(prev => ({
            cfo: Array.from(values.cfo).sort((a,b)=>a.localeCompare(b,'ru',{sensitivity:'base'})),
            company: Array.from(values.company).sort((a,b)=>a.localeCompare(b,'ru',{sensitivity:'base'})),
            purchaserCompany: Array.from(values.purchaserCompany).sort((a,b)=>a.localeCompare(b,'ru',{sensitivity:'base'})),
            purchaser: Array.from(values.purchaser).sort((a,b)=>a.localeCompare(b,'ru',{sensitivity:'base'})),
            category: Array.from(values.category).sort((a,b)=>a.localeCompare(b,'ru',{sensitivity:'base'})),
            status: newStatuses, // Обновляем статусы из всех данных
          }));
        }
      } catch { }
    };
    fetchUniqueValues();
  }, []);


  // Устанавливаем начальное значение фильтра по статусу: все доступные статусы кроме "Исключена"
  // Используем useLayoutEffect, чтобы установить фильтр синхронно до рендера и избежать двойного обновления
  // Это соответствует логике кнопки "Сбросить фильтры"
  useLayoutEffect(() => {
    if (!statusFilterInitializedRef.current && uniqueValues.status.length > 0 && statusFilter.size === 0) {
      const resetStatusFilter = uniqueValues.status.filter(s => s !== 'Исключена');
      if (resetStatusFilter.length > 0) {
        setStatusFilter(new Set(resetStatusFilter));
        statusFilterInitializedRef.current = true;
      }
    }
  }, [uniqueValues.status, statusFilter.size]);

  // Позиции фильтров
  useLayoutEffect(() => { setCfoFilterPosition(isCfoFilterOpen ? calculateFilterPosition(cfoFilterButtonRef) : null); }, [isCfoFilterOpen, calculateFilterPosition]);
  useLayoutEffect(() => { setCompanyFilterPosition(isCompanyFilterOpen ? calculateFilterPosition(companyFilterButtonRef) : null); }, [isCompanyFilterOpen, calculateFilterPosition]);
  useLayoutEffect(() => { setPurchaserCompanyFilterPosition(isPurchaserCompanyFilterOpen ? calculateFilterPosition(purchaserCompanyFilterButtonRef) : null); }, [isPurchaserCompanyFilterOpen, calculateFilterPosition]);
  useLayoutEffect(() => { setCategoryFilterPosition(isCategoryFilterOpen ? calculateFilterPosition(categoryFilterButtonRef) : null); }, [isCategoryFilterOpen, calculateFilterPosition]);
  useLayoutEffect(() => { setStatusFilterPosition(isStatusFilterOpen ? calculateFilterPosition(statusFilterButtonRef) : null); }, [isStatusFilterOpen, calculateFilterPosition]);
  useLayoutEffect(() => { setPurchaserFilterPosition(isPurchaserFilterOpen ? calculateFilterPosition(purchaserFilterButtonRef) : null); }, [isPurchaserFilterOpen, calculateFilterPosition]);

  // УБРАНО: Извлечение статусов из allItems
  // Статусы должны показываться из всех данных плана закупок, а не только из отфильтрованных
  // Это позволяет видеть все доступные статусы в фильтре, даже если они не видны в текущей выборке

  // Debounce текстовых фильтров
  useEffect(() => {
    const textFields = ['id','purchaseSubject','currentContractEndDate','purchaseRequestId','budgetAmount'];
    const hasTextChanges = textFields.some(f => localFilters[f] !== filters[f]);
    if (hasTextChanges) {
      const timer = setTimeout(() => {
        setFilters(prev => { const updated = {...prev}; textFields.forEach(f => updated[f] = localFilters[f] || ''); return updated; });
        setCurrentPage(0);
        // Восстановление фокуса теперь обрабатывается хуком useFocusRestoreAfterFetch
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localFilters, filters, setCurrentPage]);

  return {
    filters, setFilters, localFilters, setLocalFilters, focusedField, setFocusedField,
    cfoFilter, setCfoFilter, companyFilter, setCompanyFilter, purchaserCompanyFilter, setPurchaserCompanyFilter,
    categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, purchaserFilter, setPurchaserFilter,
    isCfoFilterOpen, setIsCfoFilterOpen,
    isCompanyFilterOpen, setIsCompanyFilterOpen, isPurchaserCompanyFilterOpen, setIsPurchaserCompanyFilterOpen, isCategoryFilterOpen, setIsCategoryFilterOpen,
    isStatusFilterOpen, setIsStatusFilterOpen, isPurchaserFilterOpen, setIsPurchaserFilterOpen,
    cfoSearchQuery, setCfoSearchQuery,
    companySearchQuery, setCompanySearchQuery, purchaserCompanySearchQuery, setPurchaserCompanySearchQuery, categorySearchQuery, setCategorySearchQuery,
    statusSearchQuery, setStatusSearchQuery, purchaserSearchQuery, setPurchaserSearchQuery,
    cfoFilterPosition, companyFilterPosition, purchaserCompanyFilterPosition, categoryFilterPosition,
    statusFilterPosition, purchaserFilterPosition,
    cfoFilterButtonRef, companyFilterButtonRef, purchaserCompanyFilterButtonRef,
    categoryFilterButtonRef, statusFilterButtonRef, purchaserFilterButtonRef,
    uniqueValues,
    handleFilterChange, handleFilterChangeForHeader, handleFocusForHeader, handleBlurForHeader,
    handleCfoToggle, handleCfoSelectAll, handleCfoDeselectAll,
    handleCompanyToggle, handleCompanySelectAll, handleCompanyDeselectAll,
    handlePurchaserCompanyToggle, handlePurchaserCompanySelectAll, handlePurchaserCompanyDeselectAll,
    handleCategoryToggle, handleCategorySelectAll, handleCategoryDeselectAll,
    handleStatusToggle, handleStatusSelectAll, handleStatusDeselectAll,
    handlePurchaserToggle, handlePurchaserSelectAll, handlePurchaserDeselectAll,
    getFilteredCfoOptions, getFilteredCompanyOptions, getFilteredPurchaserCompanyOptions,
    getFilteredCategoryOptions, getFilteredStatusOptions, getFilteredPurchaserOptions,
    getUniqueValues
  };
};
