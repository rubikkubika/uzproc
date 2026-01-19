import { useState, useRef, useEffect } from 'react';
import type { TabType } from '../types/purchase-request.types';

export function usePurchaseRequestFilters() {
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
    cfo: '',
    purchaseRequestInitiator: '',
    purchaser: '',
    name: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte',
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
    cfo: '',
    purchaseRequestInitiator: '',
    purchaser: '',
    name: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte',
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
  };
}
