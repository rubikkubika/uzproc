import { useState, useRef, useEffect, useCallback } from 'react';
import type { TabType } from '../types/purchase-request.types';

const TEXT_FIELDS = [
  'idPurchaseRequest', 
  'name', 
  'contractDurationMonths',
  'guid',
  'purchaseRequestPlanYear',
  'company',
  'mcc',
  'purchaseRequestInitiator',
  'purchaseRequestCreationDate',
  'createdAt',
  'updatedAt',
  'title',
  'innerId',
  'budgetAmount',
  'currency',
  'costType',
  'contractType',
];

export function usePurchaseRequestFilters(setCurrentPage?: (page: number) => void) {
  // Состояние для вкладок
  const [activeTab, setActiveTab] = useState<TabType>('in-work');
  const activeTabRef = useRef<TabType>('in-work');

  // Синхронизируем ref с состоянием activeTab
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Состояние для количества записей по каждой вкладке
  const [tabCounts, setTabCounts] = useState<Record<TabType, number | null>>({
    'all': null,
    'in-work': null,
    'completed': null,
    'project-rejected': null,
    'hidden': null,
  });

  // Состояние для фильтров
  const [filters, setFilters] = useState<Record<string, string>>({
    idPurchaseRequest: '',
    guid: '',
    purchaseRequestPlanYear: '',
    company: '',
    mcc: '',
    cfo: '',
    purchaseRequestInitiator: '',
    purchaser: '',
    name: '',
    purchaseRequestCreationDate: '',
    createdAt: '',
    updatedAt: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte',
    currency: '',
    costType: '',
    contractType: '',
    contractDurationMonths: '',
    isPlanned: '',
    requiresPurchase: '',
    status: '',
  });

  // Локальные фильтры (для debounce)
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    idPurchaseRequest: '',
    guid: '',
    purchaseRequestPlanYear: '',
    company: '',
    mcc: '',
    cfo: '',
    purchaseRequestInitiator: '',
    purchaser: '',
    name: '',
    purchaseRequestCreationDate: '',
    createdAt: '',
    updatedAt: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte',
    currency: '',
    costType: '',
    contractType: '',
    contractDurationMonths: '',
    isPlanned: '',
    requiresPurchase: '',
    status: '',
  });

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

  // Состояние для отслеживания фокуса в полях фильтров
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Состояние для принудительной перезагрузки
  const [forceReload, setForceReload] = useState(0);

  // Обработчик изменения текстового фильтра для заголовка
  const handleFilterChangeForHeader = useCallback((fieldKey: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [fieldKey]: value }));
  }, []);

  // Обработчик фокуса для заголовка
  const handleFocusForHeader = useCallback((fieldKey: string) => {
    setFocusedField(fieldKey);
  }, []);

  // Обработчик потери фокуса для заголовка
  const handleBlurForHeader = useCallback((e: React.FocusEvent<HTMLInputElement>, fieldKey: string) => {
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement || (activeElement !== e.target && !activeElement.closest('input[data-filter-field]') && !activeElement.closest('select'))) {
        setFocusedField(null);
      }
    }, 200);
  }, []);

  // Debounce текстовых фильтров - точная копия логики из плана закупок
  useEffect(() => {
    const hasTextChanges = TEXT_FIELDS.some(f => localFilters[f] !== filters[f]);
    if (hasTextChanges) {
      const timer = setTimeout(() => {
        setFilters(prev => {
          const updated = {...prev};
          TEXT_FIELDS.forEach(f => updated[f] = localFilters[f] || '');
          return updated;
        });
        if (setCurrentPage) {
          setCurrentPage(0);
        }
        // Восстановление фокуса теперь обрабатывается хуком useFocusRestoreAfterFetch
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localFilters, filters, setCurrentPage]);

  return {
    // Вкладки
    activeTab,
    setActiveTab,
    activeTabRef,
    tabCounts,
    setTabCounts,

    // Фильтры
    filters,
    setFilters,
    localFilters,
    setLocalFilters,

    // Множественные фильтры
    cfoFilter,
    setCfoFilter,
    statusFilter,
    setStatusFilter,
    purchaserFilter,
    setPurchaserFilter,

    // Выпадающие списки
    isCfoFilterOpen,
    setIsCfoFilterOpen,
    isStatusFilterOpen,
    setIsStatusFilterOpen,
    isPurchaserFilterOpen,
    setIsPurchaserFilterOpen,

    // Поиск
    cfoSearchQuery,
    setCfoSearchQuery,
    statusSearchQuery,
    setStatusSearchQuery,
    purchaserSearchQuery,
    setPurchaserSearchQuery,

    // Фокус и перезагрузка
    focusedField,
    setFocusedField,
    forceReload,
    setForceReload,

    // Обработчики для заголовков
    handleFilterChangeForHeader,
    handleFocusForHeader,
    handleBlurForHeader,
  };
}
