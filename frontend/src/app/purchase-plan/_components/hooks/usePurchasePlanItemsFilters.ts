import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { DEFAULT_STATUSES, FILTERS_STORAGE_KEY } from '../constants/purchase-plan-items.constants';
import { PurchasePlanItem } from '../types/purchase-plan-items.types';
import { getBackendUrl } from '@/utils/api';

// Функция для нормализации названия компании
const normalizeCompany = (company: string | null): string | null => {
  if (!company) return null;
  const normalized = company.trim().toLowerCase();
  
  if (normalized.includes('узум') && normalized.includes('маркет')) {
    return 'Market';
  }
  if (normalized.includes('uzum') && normalized.includes('market')) {
    return 'Market';
  }
  if (normalized === 'market') {
    return 'Market';
  }
  if (normalized.includes('узум') && normalized.includes('технологи')) {
    return 'Holding';
  }
  if (normalized.includes('uzum') && normalized.includes('technolog')) {
    return 'Holding';
  }
  if (normalized === 'holding') {
    return 'Holding';
  }
  if (normalized.includes('uzum') && normalized.includes('tezkor')) {
    return 'Tezkor';
  }
  if (normalized === 'tezkor') {
    return 'Tezkor';
  }
  
  if (company === 'Market' || company === 'Holding' || company === 'Tezkor') {
    return company;
  }
  if (company === 'Uzum Market') {
    return 'Market';
  }
  if (company === 'Uzum Technologies') {
    return 'Holding';
  }
  if (company === 'Uzum Tezkor') {
    return 'Tezkor';
  }
  
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
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
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
  const [companyFilter, setCompanyFilter] = useState<Set<string>>(new Set(['Market']));
  const [purchaserCompanyFilter, setPurchaserCompanyFilter] = useState<Set<string>>(new Set(['Market']));
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(DEFAULT_STATUSES));
  const [purchaserFilter, setPurchaserFilter] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') {
      return new Set<string>();
    }
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
    } catch (err) {
      // Ошибка загрузки из localStorage игнорируется
    }
    return new Set<string>();
  });

  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
  const [isPurchaserCompanyFilterOpen, setIsPurchaserCompanyFilterOpen] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isPurchaserFilterOpen, setIsPurchaserFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [purchaserCompanySearchQuery, setPurchaserCompanySearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [purchaserSearchQuery, setPurchaserSearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');

  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [companyFilterPosition, setCompanyFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserCompanyFilterPosition, setPurchaserCompanyFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [categoryFilterPosition, setCategoryFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserFilterPosition, setPurchaserFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusFilterPosition, setStatusFilterPosition] = useState<{ top: number; left: number } | null>(null);

  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  const companyFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserCompanyFilterButtonRef = useRef<HTMLButtonElement>(null);
  const categoryFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserFilterButtonRef = useRef<HTMLButtonElement>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null);

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
      const position = {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      };
      return position;
    }
    return null;
  }, []);

  const handleFilterChange = (field: string, value: string, isTextFilter: boolean = false) => {
    if (isTextFilter) {
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
      setCurrentPage(0);
    }
  };

  const handleFilterChangeForHeader = useCallback((fieldKey: string, value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [fieldKey]: value,
    }));
  }, []);

  const handleFocusForHeader = useCallback((fieldKey: string) => {
    setFocusedField(fieldKey);
  }, []);

  const handleBlurForHeader = useCallback((e: React.FocusEvent<HTMLInputElement>, fieldKey: string) => {
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && 
          activeElement !== e.target && 
          !activeElement.closest('input[data-filter-field]') &&
          !activeElement.closest('select')) {
        setFocusedField(null);
      }
    }, 200);
  }, []);

  const getUniqueValues = (field: keyof PurchasePlanItem): string[] => {
    const fieldMap: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo',
      company: 'company',
      purchaserCompany: 'purchaserCompany',
      purchaser: 'purchaser',
      category: 'category',
      status: 'status',
    };
    return uniqueValues[fieldMap[field] || 'cfo'] || [];
  };

  // Обработчики для фильтров с чекбоксами
  const handleCfoToggle = useCallback((cfo: string) => {
    setCfoFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cfo)) {
        newSet.delete(cfo);
      } else {
        newSet.add(cfo);
      }
      setCurrentPage(0);
      return newSet;
    });
  }, [setCurrentPage]);

  const handleCfoSelectAll = useCallback(() => {
    const allCfo = getUniqueValues('cfo');
    const newSet = new Set(allCfo);
    setCfoFilter(newSet);
    setCurrentPage(0);
  }, [getUniqueValues, setCurrentPage]);

  const handleCfoDeselectAll = useCallback(() => {
    setCfoFilter(new Set());
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleCompanyToggle = useCallback((company: string) => {
    setCompanyFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(company)) {
        newSet.delete(company);
      } else {
        newSet.add(company);
      }
      setCurrentPage(0);
      
      // Отправляем событие асинхронно, чтобы не блокировать обновление состояния
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
          detail: { companyFilter: Array.from(newSet) }
        }));
      }, 0);
      
      return newSet;
    });
  }, [setCurrentPage]);

  const handleCompanySelectAll = useCallback(() => {
    const allCompanies = getUniqueValues('company');
    const newSet = new Set(allCompanies);
    setCompanyFilter(newSet);
    setCurrentPage(0);
    
    window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
      detail: { companyFilter: Array.from(newSet) }
    }));
  }, [getUniqueValues, setCurrentPage]);

  const handleCompanyDeselectAll = useCallback(() => {
    setCompanyFilter(new Set());
    setCurrentPage(0);
    
    window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
      detail: { companyFilter: [] }
    }));
  }, [setCurrentPage]);

  const handlePurchaserCompanyToggle = useCallback((purchaserCompany: string) => {
    console.log('[DEBUG] handlePurchaserCompanyToggle called with:', purchaserCompany);
    setPurchaserCompanyFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(purchaserCompany)) {
        newSet.delete(purchaserCompany);
      } else {
        newSet.add(purchaserCompany);
      }
      console.log('[DEBUG] New purchaserCompanyFilter:', Array.from(newSet));
      setCurrentPage(0);
      return newSet;
    });
  }, [setCurrentPage]);

  const handlePurchaserCompanySelectAll = useCallback(() => {
    const allPurchaserCompanies = getUniqueValues('purchaserCompany');
    const newSet = new Set(allPurchaserCompanies);
    setPurchaserCompanyFilter(newSet);
    setCurrentPage(0);
  }, [getUniqueValues, setCurrentPage]);

  const handlePurchaserCompanyDeselectAll = useCallback(() => {
    setPurchaserCompanyFilter(new Set());
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleCategoryToggle = useCallback((category: string) => {
    setCategoryFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleCategorySelectAll = useCallback(() => {
    const allCategories = getUniqueValues('category');
    const newSet = new Set(allCategories);
    setCategoryFilter(newSet);
    setCurrentPage(0);
  }, [getUniqueValues, setCurrentPage]);

  const handleCategoryDeselectAll = useCallback(() => {
    setCategoryFilter(new Set());
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleStatusToggle = useCallback((status: string) => {
    setStatusFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleStatusSelectAll = useCallback(() => {
    const availableStatuses = uniqueValues.status || [];
    const newSet = new Set(availableStatuses);
    setStatusFilter(newSet);
    setCurrentPage(0);
  }, [uniqueValues.status, setCurrentPage]);

  const handleStatusDeselectAll = useCallback(() => {
    setStatusFilter(new Set());
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handlePurchaserToggle = useCallback((purchaser: string) => {
    setPurchaserFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(purchaser)) {
        newSet.delete(purchaser);
      } else {
        newSet.add(purchaser);
      }

      try {
        const filtersToSave = {
          selectedYear,
          selectedMonths: Array.from(selectedMonths),
          filters,
          cfoFilter: Array.from(cfoFilter),
          companyFilter: Array.from(companyFilter),
          categoryFilter: Array.from(categoryFilter),
          purchaserFilter: Array.from(newSet),
          sortField,
          sortDirection,
        };
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
      } catch (err) {
        // Ошибка сохранения в localStorage игнорируется
      }

      return newSet;
    });
    setCurrentPage(0);
  }, [selectedYear, selectedMonths, filters, cfoFilter, companyFilter, categoryFilter, sortField, sortDirection, setCurrentPage]);

  const handlePurchaserSelectAll = useCallback(() => {
    const allPurchasers = getUniqueValues('purchaser');
    const newSet = new Set(allPurchasers);
    setPurchaserFilter(newSet);
    setCurrentPage(0);

    try {
      const filtersToSave = {
        selectedYear,
        selectedMonths: Array.from(selectedMonths),
        filters,
        cfoFilter: Array.from(cfoFilter),
        companyFilter: Array.from(companyFilter),
        categoryFilter: Array.from(categoryFilter),
        purchaserFilter: Array.from(newSet),
        sortField,
        sortDirection,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (err) {
      // Ошибка сохранения в localStorage игнорируется
    }
  }, [selectedYear, selectedMonths, filters, cfoFilter, companyFilter, categoryFilter, sortField, sortDirection, getUniqueValues, setCurrentPage]);

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
        companyFilter: Array.from(companyFilter),
        categoryFilter: Array.from(categoryFilter),
        purchaserFilter: Array.from(emptySet),
        sortField,
        sortDirection,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (err) {
      // Ошибка сохранения в localStorage игнорируется
    }
  }, [selectedYear, selectedMonths, filters, cfoFilter, companyFilter, categoryFilter, sortField, sortDirection, setCurrentPage]);

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

  const getFilteredCompanyOptions = useMemo(() => {
    const allCompanies = uniqueValues.company || [];
    if (!companySearchQuery || !companySearchQuery.trim()) {
      return allCompanies;
    }
    const searchLower = companySearchQuery.toLowerCase().trim();
    return allCompanies.filter(company => {
      if (!company) return false;
      return company.toLowerCase().includes(searchLower);
    });
  }, [companySearchQuery, uniqueValues.company]);

  const getFilteredPurchaserCompanyOptions = useMemo(() => {
    const allPurchaserCompanies = uniqueValues.purchaserCompany || [];
    if (!purchaserCompanySearchQuery || !purchaserCompanySearchQuery.trim()) {
      return allPurchaserCompanies;
    }
    const searchLower = purchaserCompanySearchQuery.toLowerCase().trim();
    return allPurchaserCompanies.filter(purchaserCompany => {
      if (!purchaserCompany) return false;
      return purchaserCompany.toLowerCase().includes(searchLower);
    });
  }, [purchaserCompanySearchQuery, uniqueValues.purchaserCompany]);

  const getFilteredCategoryOptions = useMemo(() => {
    const allCategories = uniqueValues.category || [];
    if (!categorySearchQuery || !categorySearchQuery.trim()) {
      return allCategories;
    }
    const searchLower = categorySearchQuery.toLowerCase().trim();
    return allCategories.filter(category => {
      if (!category) return false;
      return category.toLowerCase().includes(searchLower);
    });
  }, [categorySearchQuery, uniqueValues.category]);

  const getFilteredPurchaserOptions = useMemo(() => {
    const allPurchasers = uniqueValues.purchaser || [];
    if (!purchaserSearchQuery || !purchaserSearchQuery.trim()) {
      return allPurchasers;
    }
    const searchLower = purchaserSearchQuery.toLowerCase().trim();
    return allPurchasers.filter(purchaser => {
      if (!purchaser) return false;
      return purchaser.toLowerCase().includes(searchLower);
    });
  }, [purchaserSearchQuery, uniqueValues.purchaser]);

  const getFilteredStatusOptions = useMemo(() => {
    const availableStatuses = uniqueValues.status || [];
    if (!statusSearchQuery || !statusSearchQuery.trim()) {
      return availableStatuses;
    }
    const searchLower = statusSearchQuery.toLowerCase().trim();
    return availableStatuses.filter(status => {
      if (!status) return false;
      return status.toLowerCase().includes(searchLower);
    });
  }, [statusSearchQuery, uniqueValues.status]);

  // Загружаем уникальные значения для фильтров
  useEffect(() => {
    const fetchUniqueValues = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
            company: new Set(),
            purchaserCompany: new Set(),
            purchaser: new Set(),
            category: new Set(),
            status: new Set(),
          };
          
          let hasNullStatus = false;
          let hasNullCompany = false;
          let hasNullPurchaserCompany = false;
          result.content.forEach((item: PurchasePlanItem) => {
            if (item.cfo) values.cfo.add(item.cfo);
            if (item.company) {
              const normalizedCompany = normalizeCompany(item.company);
              if (normalizedCompany) {
                values.company.add(normalizedCompany);
              }
            } else {
              hasNullCompany = true;
            }
            if (item.purchaserCompany) {
              const normalizedPurchaserCompany = normalizeCompany(item.purchaserCompany);
              if (normalizedPurchaserCompany) {
                values.purchaserCompany.add(normalizedPurchaserCompany);
              }
            } else {
              hasNullPurchaserCompany = true;
            }
            if (item.purchaser) values.purchaser.add(item.purchaser);
            if (item.category) values.category.add(item.category);
            if (item.status) {
              values.status.add(item.status);
            } else {
              hasNullStatus = true;
            }
          });
          
          if (hasNullStatus) {
            values.status.add('Пусто');
          }
          if (hasNullCompany) {
            values.company.add('Не выбрано');
          }
          if (hasNullPurchaserCompany) {
            values.purchaserCompany.add('Не выбрано');
          }
          
          setUniqueValues({
            cfo: Array.from(values.cfo).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            company: Array.from(values.company).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            purchaserCompany: Array.from(values.purchaserCompany).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            purchaser: Array.from(values.purchaser).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            category: Array.from(values.category).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            status: Array.from(values.status).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
          });
          
          // Синхронизируем фильтр компании с загруженными уникальными значениями
          // Если в фильтре есть значения, которых нет в загруженных уникальных значениях, удаляем их
          setCompanyFilter(prev => {
            const availableCompanies = new Set(Array.from(values.company));
            const filtered = new Set(Array.from(prev).filter(company => availableCompanies.has(company)));
            // Если после фильтрации фильтр стал пустым, но был не пустым, и есть доступные компании, устанавливаем Market по умолчанию
            if (filtered.size === 0 && prev.size > 0 && availableCompanies.has('Market')) {
              return new Set(['Market']);
            }
            // Если фильтр был пустым и есть доступные компании, устанавливаем Market по умолчанию
            if (filtered.size === 0 && prev.size === 0 && availableCompanies.has('Market')) {
              return new Set(['Market']);
            }
            return filtered;
          });
        }
      } catch (err) {
        // Ошибка загрузки уникальных значений игнорируется
      }
    };
    fetchUniqueValues();
  }, []);

  // Обновляем позиции выпадающих списков
  // Используем useLayoutEffect для синхронного обновления позиции перед рендером
  useLayoutEffect(() => {
    if (isCfoFilterOpen && cfoFilterButtonRef.current) {
      const position = calculateFilterPosition(cfoFilterButtonRef);
      setCfoFilterPosition(position);
    } else if (!isCfoFilterOpen) {
      setCfoFilterPosition(null);
    }
  }, [isCfoFilterOpen, calculateFilterPosition]);

  useLayoutEffect(() => {
    if (isCompanyFilterOpen && companyFilterButtonRef.current) {
      const position = calculateFilterPosition(companyFilterButtonRef);
      setCompanyFilterPosition(position);
    } else if (!isCompanyFilterOpen) {
      setCompanyFilterPosition(null);
    }
  }, [isCompanyFilterOpen, calculateFilterPosition]);

  useLayoutEffect(() => {
    if (isPurchaserCompanyFilterOpen && purchaserCompanyFilterButtonRef.current) {
      const position = calculateFilterPosition(purchaserCompanyFilterButtonRef);
      setPurchaserCompanyFilterPosition(position);
    } else if (!isPurchaserCompanyFilterOpen) {
      setPurchaserCompanyFilterPosition(null);
    }
  }, [isPurchaserCompanyFilterOpen, calculateFilterPosition]);

  useLayoutEffect(() => {
    if (isCategoryFilterOpen && categoryFilterButtonRef.current) {
      const position = calculateFilterPosition(categoryFilterButtonRef);
      setCategoryFilterPosition(position);
    } else if (!isCategoryFilterOpen) {
      setCategoryFilterPosition(null);
    }
  }, [isCategoryFilterOpen, calculateFilterPosition]);

  useLayoutEffect(() => {
    if (isPurchaserFilterOpen && purchaserFilterButtonRef.current) {
      const position = calculateFilterPosition(purchaserFilterButtonRef);
      setPurchaserFilterPosition(position);
    } else if (!isPurchaserFilterOpen) {
      setPurchaserFilterPosition(null);
    }
  }, [isPurchaserFilterOpen, calculateFilterPosition]);

  useLayoutEffect(() => {
    if (isStatusFilterOpen && statusFilterButtonRef.current) {
      const position = calculateFilterPosition(statusFilterButtonRef);
      setStatusFilterPosition(position);
    } else if (!isStatusFilterOpen) {
      setStatusFilterPosition(null);
    }
  }, [isStatusFilterOpen, calculateFilterPosition]);

  // Закрытие выпадающих списков теперь управляется в MultiSelectFilterDropdown
  // Этот старый обработчик удален, чтобы не конфликтовать с новым

  // Debounce для текстовых фильтров
  useEffect(() => {
    const textFields = ['id', 'purchaseSubject', 'currentContractEndDate', 'purchaseRequestId', 'budgetAmount'];
    const hasTextChanges = textFields.some(field => {
      const localValue = localFilters[field] || '';
      const filterValue = filters[field] || '';
      return localValue !== filterValue;
    });
    
    if (hasTextChanges) {
      // Сохраняем фокус перед обновлением
      const input = focusedField ? document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement : null;
      const cursorPosition = input ? (input.selectionStart || 0) : null;
      
      const timer = setTimeout(() => {
        setFilters(prev => {
          const updated = { ...prev };
          textFields.forEach(field => {
            updated[field] = localFilters[field] || '';
          });
          return updated;
        });
        setCurrentPage(0);
        
        // Восстанавливаем фокус после обновления
        if (focusedField && cursorPosition !== null) {
          setTimeout(() => {
            const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
            if (inputAfterRender) {
              inputAfterRender.focus();
              const newPos = Math.min(cursorPosition, inputAfterRender.value.length);
              inputAfterRender.setSelectionRange(newPos, newPos);
            }
          }, 0);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localFilters, filters, setCurrentPage, focusedField]);

  // Восстановление фокуса после завершения загрузки данных
  useEffect(() => {
    if (focusedField) {
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input) {
          const currentValue = localFilters[focusedField] || '';
          if (input.value === currentValue) {
            input.focus();
            const length = input.value.length;
            input.setSelectionRange(length, length);
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [focusedField, localFilters]);

  return {
    filters,
    setFilters,
    localFilters,
    setLocalFilters,
    focusedField,
    setFocusedField,
    cfoFilter,
    setCfoFilter,
    companyFilter,
    setCompanyFilter,
    purchaserCompanyFilter,
    setPurchaserCompanyFilter,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    purchaserFilter,
    setPurchaserFilter,
    isCfoFilterOpen,
    setIsCfoFilterOpen,
    isCompanyFilterOpen,
    setIsCompanyFilterOpen,
    isPurchaserCompanyFilterOpen,
    setIsPurchaserCompanyFilterOpen,
    isCategoryFilterOpen,
    setIsCategoryFilterOpen,
    isPurchaserFilterOpen,
    setIsPurchaserFilterOpen,
    isStatusFilterOpen,
    setIsStatusFilterOpen,
    cfoSearchQuery,
    setCfoSearchQuery,
    companySearchQuery,
    setCompanySearchQuery,
    purchaserCompanySearchQuery,
    setPurchaserCompanySearchQuery,
    categorySearchQuery,
    setCategorySearchQuery,
    purchaserSearchQuery,
    setPurchaserSearchQuery,
    statusSearchQuery,
    setStatusSearchQuery,
    cfoFilterPosition,
    companyFilterPosition,
    purchaserCompanyFilterPosition,
    categoryFilterPosition,
    purchaserFilterPosition,
    statusFilterPosition,
    cfoFilterButtonRef,
    companyFilterButtonRef,
    purchaserCompanyFilterButtonRef,
    categoryFilterButtonRef,
    purchaserFilterButtonRef,
    statusFilterButtonRef,
    uniqueValues,
    handleFilterChange,
    handleFilterChangeForHeader,
    handleFocusForHeader,
    handleBlurForHeader,
    handleCfoToggle,
    handleCfoSelectAll,
    handleCfoDeselectAll,
    handleCompanyToggle,
    handleCompanySelectAll,
    handleCompanyDeselectAll,
    handlePurchaserCompanyToggle,
    handlePurchaserCompanySelectAll,
    handlePurchaserCompanyDeselectAll,
    handleCategoryToggle,
    handleCategorySelectAll,
    handleCategoryDeselectAll,
    handleStatusToggle,
    handleStatusSelectAll,
    handleStatusDeselectAll,
    handlePurchaserToggle,
    handlePurchaserSelectAll,
    handlePurchaserDeselectAll,
    getFilteredCfoOptions,
    getFilteredCompanyOptions,
    getFilteredPurchaserCompanyOptions,
    getFilteredCategoryOptions,
    getFilteredPurchaserOptions,
    getFilteredStatusOptions,
    getUniqueValues,
  };
};
