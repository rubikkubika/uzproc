'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, X, Download, Copy, Clock, Check, Eye, EyeOff, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface PurchaseRequest {
  id: number;
  idPurchaseRequest: number | null;
  guid: string;
  purchaseRequestPlanYear: number | null;
  company: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseRequestInitiator: string | null;
  purchaser: string | null;
  name: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
  status: string | null;
  excludeFromInWork: boolean | null;
  daysInStatus: number | null;
  daysSinceCreation: number | null;
  isStrategicProduct: boolean | null;
  hasCompletedPurchase: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  content: PurchaseRequest[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

type SortField = keyof PurchaseRequest | null;
type SortDirection = 'asc' | 'desc' | null;

// Кэш для метаданных (годы и уникальные значения)
const CACHE_KEY = 'purchaseRequests_metadata';
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Константы для статусов (соответствуют PurchaseRequestStatus enum)
const ALL_STATUSES = ['Заявка на согласовании', 'На согласовании', 'Заявка на утверждении', 'На утверждении', 'Утверждена', 'Заявка утверждена', 'Согласована', 'Заявка не согласована', 'Заявка не утверждена', 'Проект', 'Неактуальна', 'Не Актуальная', 'Спецификация создана', 'Спецификация создана - Архив', 'Спецификация подписана', 'Договор подписан', 'Закупка создана', 'Закупка не согласована'];
const DEFAULT_STATUSES = ALL_STATUSES.filter(s => s !== 'Неактуальна' && s !== 'Не Актуальная');

// Ключ для сохранения видимости колонок в localStorage
const COLUMNS_VISIBILITY_STORAGE_KEY = 'purchaseRequests_columnsVisibility';

// Определение всех возможных колонок
const ALL_COLUMNS = [
  { key: 'excludeFromInWork', label: 'Скрыть из вкладки' },
  { key: 'idPurchaseRequest', label: 'Номер' },
  { key: 'guid', label: 'GUID' },
  { key: 'purchaseRequestPlanYear', label: 'Год плана' },
  { key: 'company', label: 'Компания' },
  { key: 'cfo', label: 'ЦФО' },
  { key: 'mcc', label: 'МЦК' },
  { key: 'purchaseRequestInitiator', label: 'Инициатор' },
  { key: 'purchaser', label: 'Закупщик' },
  { key: 'name', label: 'Название' },
  { key: 'purchaseRequestCreationDate', label: 'Дата создания' },
  { key: 'budgetAmount', label: 'Бюджет' },
  { key: 'currency', label: 'Валюта' },
  { key: 'costType', label: 'Тип затрат' },
  { key: 'contractType', label: 'Тип договора' },
  { key: 'contractDurationMonths', label: 'Длительность (мес)' },
  { key: 'isPlanned', label: 'План' },
  { key: 'requiresPurchase', label: 'Закупка' },
  { key: 'status', label: 'Статус' },
  { key: 'daysInStatus', label: 'Срок в статусе' },
  { key: 'isStrategicProduct', label: 'Стратегическая продукция' },
  { key: 'daysSinceCreation', label: 'Срок с даты создания' },
  { key: 'createdAt', label: 'Дата создания (системная)' },
  { key: 'updatedAt', label: 'Дата обновления' },
  { key: 'track', label: 'Трэк' },
] as const;

// Колонки, которые отображаются по умолчанию
const DEFAULT_VISIBLE_COLUMNS = [
  'excludeFromInWork',
  'idPurchaseRequest',
  'cfo',
  'purchaser',
  'name',
  'budgetAmount',
  'requiresPurchase',
  'status',
  'daysInStatus',
  'isStrategicProduct',
  'daysSinceCreation',
  'track',
];

// Функция для получения символа валюты
const getCurrencyIcon = (currency: string | null) => {
  if (!currency) return null;
  const currencyUpper = currency.toUpperCase();
  if (currencyUpper === 'USD' || currencyUpper === 'ДОЛЛАР' || currencyUpper === '$') {
    return <span className="ml-0.5">$</span>;
  } else if (currencyUpper === 'EUR' || currencyUpper === 'ЕВРО' || currencyUpper === '€') {
    return <span className="ml-0.5">€</span>;
  } else if (currencyUpper === 'UZS' || currencyUpper === 'СУМ' || currencyUpper === 'СУММ') {
    return <span className="ml-0.5 text-xs">UZS</span>;
  }
  return <span className="ml-0.5 text-xs">{currency}</span>;
};

export default function PurchaseRequestsTable() {
  const router = useRouter();
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Загружаем роль пользователя при монтировании
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.authenticated && data.role) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    checkUserRole();
  }, []);
  
  // Проверка, может ли пользователь изменять видимость заявки (только admin)
  const canEditExcludeFromInWork = userRole === 'admin';
  
  // Состояние для сортировки (по умолчанию сортировка по номеру по убыванию)
  const [sortField, setSortField] = useState<SortField>('idPurchaseRequest');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Состояние для фильтров
  const [filters, setFilters] = useState<Record<string, string>>({
    idPurchaseRequest: '',
    cfo: '',
    purchaseRequestInitiator: '',
    purchaser: '',
    name: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
    costType: '',
    contractType: '',
    contractDurationMonths: '',
    isPlanned: '',
    requiresPurchase: '',
    status: '',
    isStrategicProduct: '',
  });

  // Состояние для множественных фильтров (чекбоксы)
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set()); // По умолчанию пустой, как для ЦФО
  const [purchaserFilter, setPurchaserFilter] = useState<Set<string>>(new Set());
  
  // Состояние для вкладок
  type TabType = 'all' | 'in-work' | 'completed' | 'project-rejected';
  const [activeTab, setActiveTab] = useState<TabType>('in-work'); // По умолчанию "В работе"
  
  // Состояние для количества записей по каждой вкладке
  const [tabCounts, setTabCounts] = useState<Record<TabType, number | null>>({
    'all': null,
    'in-work': null,
    'completed': null,
    'project-rejected': null,
  });
  
  // Определяем статусы для каждой вкладки
  const getStatusesForTab = (tab: TabType): string[] => {
    switch (tab) {
      case 'in-work':
        return ['Заявка на согласовании', 'На согласовании', 'Заявка на утверждении', 'На утверждении', 'Спецификация создана', 'Закупка создана', 'Заявка утверждена', 'Утверждена'];
      case 'completed':
        return ['Спецификация подписана', 'Договор подписан'];
      case 'project-rejected':
        return ['Проект', 'Заявка не согласована', 'Заявка не утверждена', 'Закупка не согласована', 'Спецификация создана - Архив'];
      case 'all':
      default:
        return ALL_STATUSES;
    }
  };
  
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
  
  // Флаг для отслеживания загрузки фильтров из localStorage
  const filtersLoadedRef = useRef(false);
  
  // Флаг для отслеживания восстановления года из navigationData (используем состояние для реактивности)
  const [yearRestored, setYearRestored] = useState(false);
  
  // Ref для хранения функции fetchTabCounts, чтобы избежать бесконечных циклов
  const fetchTabCountsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  
  // Ref для хранения актуальных значений фильтров (для cleanup-функции)
  const filtersStateRef = useRef({
    filters: {} as Record<string, string>,
    localFilters: {} as Record<string, string>,
    cfoFilter: new Set<string>(),
    statusFilter: new Set<string>(),
    selectedYear: null as number | null,
    sortField: null as SortField,
    sortDirection: null as SortDirection,
    currentPage: 0,
    pageSize: 100,
    cfoSearchQuery: '',
    statusSearchQuery: '',
    activeTab: 'in-work' as TabType,
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

  // Локальное состояние для текстовых фильтров (для сохранения фокуса)
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    idPurchaseRequest: '',
    cfo: '',
    purchaseRequestInitiator: '',
    name: '',
    budgetAmount: '',
    costType: '',
    contractType: '',
    contractDurationMonths: '',
    isPlanned: '',
    requiresPurchase: '',
    status: '',
  });

  // ID активного поля для восстановления фокуса
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Функция для загрузки количества записей по всем вкладкам с бэкенда
  const fetchTabCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedYear !== null) {
        params.append('year', String(selectedYear));
      }
      
      // Применяем другие фильтры (кроме статуса, так как статусы определяются вкладками)
      if (filters.idPurchaseRequest && filters.idPurchaseRequest.trim() !== '') {
        const idValue = parseInt(filters.idPurchaseRequest.trim(), 10);
        if (!isNaN(idValue)) {
          params.append('idPurchaseRequest', String(idValue));
        }
      }
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }
      if (purchaserFilter.size > 0) {
        purchaserFilter.forEach(p => {
          params.append('purchaser', p);
        });
      }
      if (filters.name && filters.name.trim() !== '') {
        params.append('name', filters.name.trim());
      }
      const budgetOperator = localFilters.budgetAmountOperator || filters.budgetAmountOperator;
      const budgetAmount = localFilters.budgetAmount || filters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      if (filters.costType && filters.costType.trim() !== '') {
        params.append('costType', filters.costType.trim());
      }
      if (filters.contractType && filters.contractType.trim() !== '') {
        params.append('contractType', filters.contractType.trim());
      }
      if (filters.requiresPurchase && filters.requiresPurchase.trim() !== '') {
        const requiresPurchaseValue = filters.requiresPurchase.trim();
        if (requiresPurchaseValue === 'Закупка') {
          params.append('requiresPurchase', 'true');
        } else if (requiresPurchaseValue === 'Заказ') {
          params.append('requiresPurchase', 'false');
        }
      }
      if (filters.isStrategicProduct && filters.isStrategicProduct.trim() !== '' && filters.isStrategicProduct.trim() !== 'Все') {
        const isStrategicProductValue = filters.isStrategicProduct.trim();
        // Преобразуем "Да" в "true", "Нет" в "false"
        if (isStrategicProductValue === 'Да') {
          params.append('isStrategicProduct', 'true');
        } else if (isStrategicProductValue === 'Нет') {
          params.append('isStrategicProduct', 'false');
        }
      }
      
      const fetchUrl = `${getBackendUrl()}/api/purchase-requests/tab-counts?${params.toString()}`;
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const result = await response.json();
        setTabCounts({
          'all': result['all'] || 0,
          'in-work': result['in-work'] || 0,
          'completed': result['completed'] || 0,
          'project-rejected': result['project-rejected'] || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching tab counts:', err);
    }
  }, [selectedYear, filters, cfoFilter, purchaserFilter, localFilters]);
  
  // Сохраняем функцию в ref для использования в других useEffect
  useEffect(() => {
    fetchTabCountsRef.current = fetchTabCounts;
  }, [fetchTabCounts]);
  
  // Загружаем количество для всех вкладок
  useEffect(() => {
    if (!filtersLoadedRef.current) {
      return;
    }
    
    // Используем ref для вызова функции, чтобы избежать бесконечных циклов
    if (fetchTabCountsRef.current) {
      fetchTabCountsRef.current();
    }
  }, [selectedYear, filters, cfoFilter, purchaserFilter, localFilters]);

  // Состояние для ширин колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  
  const resizeColumn = useRef<string | null>(null);

  // Состояние для порядка колонок
  const [columnOrder, setColumnOrder] = useState<string[]>(['excludeFromInWork', 'idPurchaseRequest', 'cfo', 'purchaser', 'name', 'budgetAmount', 'requiresPurchase', 'status', 'daysInStatus', 'isStrategicProduct', 'daysSinceCreation', 'track']);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Состояние для видимости колонок
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') {
      return new Set(DEFAULT_VISIBLE_COLUMNS);
    }
    try {
      const saved = localStorage.getItem(COLUMNS_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const savedColumns = JSON.parse(saved);
        if (Array.isArray(savedColumns)) {
          const filteredColumns = savedColumns.filter((col: unknown): col is string => typeof col === 'string');
          // Проверяем, что все колонки из DEFAULT_VISIBLE_COLUMNS присутствуют
          const missingCols = DEFAULT_VISIBLE_COLUMNS.filter(col => !filteredColumns.includes(col));
          if (missingCols.length > 0) {
            // Добавляем недостающие колонки
            filteredColumns.push(...missingCols);
            try {
              localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(filteredColumns));
            } catch (err) {
              console.error('Error saving updated column visibility to localStorage:', err);
            }
          }
          return new Set(filteredColumns);
        }
      }
    } catch (err) {
      console.error('Error loading column visibility from localStorage:', err);
    }
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });

  // Состояние для открытия меню выбора колонок
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const columnsMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Функции для управления видимостью колонок
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const selectAllColumns = () => {
    setVisibleColumns(new Set(ALL_COLUMNS.map(col => col.key)));
  };

  const selectDefaultColumns = () => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
  };

  // Сохраняем видимость колонок в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch (err) {
      console.error('Error saving column visibility to localStorage:', err);
    }
  }, [visibleColumns]);

  // Обновляем позицию при открытии меню выбора колонок
  useEffect(() => {
    if (isColumnsMenuOpen && columnsMenuButtonRef.current) {
      const position = calculateFilterPosition(columnsMenuButtonRef);
      setColumnsMenuPosition(position);
    }
  }, [isColumnsMenuOpen, calculateFilterPosition]);

  // Закрываем меню колонок при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isColumnsMenuOpen) {
        const target = event.target as Node;
        if (columnsMenuButtonRef.current && !columnsMenuButtonRef.current.contains(target)) {
          const columnsMenuElement = document.querySelector('[data-columns-menu="true"]');
          if (columnsMenuElement && !columnsMenuElement.contains(target)) {
            setIsColumnsMenuOpen(false);
          }
        }
      }
    };

    if (isColumnsMenuOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isColumnsMenuOpen]);

  // Загружаем сохраненный порядок колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchaseRequestsTableColumnOrder');
      const defaultOrder = ['excludeFromInWork', 'idPurchaseRequest', 'cfo', 'purchaser', 'name', 'budgetAmount', 'requiresPurchase', 'status', 'daysInStatus', 'isStrategicProduct', 'daysSinceCreation', 'track'];
      
      if (saved) {
        const order = JSON.parse(saved);
        // Проверяем, что все колонки присутствуют
        const validOrder = order.filter((col: string) => defaultOrder.includes(col));
        const missingCols = defaultOrder.filter(col => !validOrder.includes(col));
        
        // Убеждаемся, что daysInStatus и daysSinceCreation идут перед track
        let finalOrder = [...validOrder, ...missingCols];
        const trackIndex = finalOrder.indexOf('track');
        const daysInStatusIndex = finalOrder.indexOf('daysInStatus');
        const daysSinceCreationIndex = finalOrder.indexOf('daysSinceCreation');
        
        // Если track найден, а колонки сроков не перед ним, перемещаем их
        if (trackIndex !== -1 && (daysInStatusIndex === -1 || daysSinceCreationIndex === -1 || daysInStatusIndex >= trackIndex || daysSinceCreationIndex >= trackIndex)) {
          // Удаляем колонки сроков из текущей позиции
          finalOrder = finalOrder.filter(col => col !== 'daysInStatus' && col !== 'daysSinceCreation');
          // Вставляем их перед track
          const newTrackIndex = finalOrder.indexOf('track');
          if (newTrackIndex !== -1) {
            finalOrder.splice(newTrackIndex, 0, 'daysInStatus', 'daysSinceCreation');
          } else {
            // Если track не найден, добавляем в конец
            finalOrder.push('daysInStatus', 'daysSinceCreation');
          }
        }
        
        setColumnOrder(finalOrder);
        // Сохраняем исправленный порядок
        try {
          localStorage.setItem('purchaseRequestsTableColumnOrder', JSON.stringify(finalOrder));
        } catch (saveErr) {
          console.error('Error saving column order:', saveErr);
        }
      } else {
        // Если нет сохраненного порядка, используем дефолтный
        setColumnOrder(defaultOrder);
      }
    } catch (err) {
      console.error('Error loading column order:', err);
      // В случае ошибки используем дефолтный порядок
      const defaultOrder = ['excludeFromInWork', 'idPurchaseRequest', 'cfo', 'purchaser', 'name', 'budgetAmount', 'requiresPurchase', 'status', 'daysInStatus', 'daysSinceCreation', 'track'];
      setColumnOrder(defaultOrder);
    }
  }, []);

  // Загружаем сохраненные фильтры из localStorage при монтировании и при возврате с детальной страницы
  useEffect(() => {
    try {
      // Проверяем, есть ли данные навигации (возврат с детальной страницы)
      const navigationDataStr = localStorage.getItem('purchaseRequestNavigation');
      console.log('Checking navigation data on mount/update:', navigationDataStr);
      let yearFromNavigation: number | null = null;
      let hasNavigationData = false;
      
      if (navigationDataStr) {
        try {
          const navigationData = JSON.parse(navigationDataStr);
          console.log('Parsed navigation data:', navigationData);
          if (navigationData.selectedYear !== undefined && navigationData.selectedYear !== null) {
            yearFromNavigation = navigationData.selectedYear;
            hasNavigationData = true;
            console.log('Found year in navigation data:', yearFromNavigation);
            // НЕ удаляем navigationData здесь - удалим после применения года
          } else {
            console.log('No year in navigation data');
          }
        } catch (err) {
          console.error('Error parsing navigation data:', err);
        }
      } else {
        console.log('No navigation data found in localStorage');
      }
      
      const saved = localStorage.getItem('purchaseRequestsTableFilters');
      if (saved) {
        const savedFilters = JSON.parse(saved);
        
        // Инициализируем дефолтные значения для всех полей фильтров
        const defaultFilters: Record<string, string> = {
          idPurchaseRequest: '',
          cfo: '',
          purchaseRequestInitiator: '',
          purchaser: '',
          name: '',
          budgetAmount: '',
          budgetAmountOperator: 'gte', // По умолчанию "больше равно"
          costType: '',
          contractType: '',
          contractDurationMonths: '',
          isPlanned: '',
          requiresPurchase: '',
          status: '',
        };
        
        // Восстанавливаем текстовые фильтры, объединяя с дефолтными значениями
        if (savedFilters.filters) {
          const mergedFilters = { ...defaultFilters, ...savedFilters.filters };
          setFilters(mergedFilters);
          setLocalFilters(mergedFilters);
        } else if (savedFilters.localFilters) {
          // Если filters нет, но есть localFilters, используем их
          const mergedFilters = { ...defaultFilters, ...savedFilters.localFilters };
          setFilters(mergedFilters);
          setLocalFilters(mergedFilters);
        } else {
          // Если ничего нет, используем дефолтные значения
          setFilters(defaultFilters);
          setLocalFilters(defaultFilters);
        }
        
        // Восстанавливаем множественные фильтры (Set нужно преобразовать из массива)
        if (savedFilters.cfoFilter && Array.isArray(savedFilters.cfoFilter)) {
          setCfoFilter(new Set(savedFilters.cfoFilter));
        }
        if (savedFilters.statusFilter && Array.isArray(savedFilters.statusFilter) && savedFilters.statusFilter.length > 0) {
          console.log('Loading statusFilter from localStorage:', savedFilters.statusFilter);
          const loadedStatusFilter = new Set<string>(savedFilters.statusFilter || []);
          setStatusFilter(loadedStatusFilter);
        } else {
          // Если статус фильтр не найден или пустой, оставляем пустым (по умолчанию)
          setStatusFilter(new Set());
        }
        
        // Восстанавливаем год:
        // 1. Если есть данные навигации (возврат с детальной страницы) - используем год из навигации
        // 2. Иначе - устанавливаем null (обновление страницы или переход из меню)
        if (hasNavigationData && yearFromNavigation !== null) {
          console.log('Restoring year from navigation data:', yearFromNavigation);
          setYearRestored(true); // Помечаем, что год был восстановлен
          // Устанавливаем год и ждем, чтобы useEffect с fetchData успел перезапуститься
          setSelectedYear(yearFromNavigation);
          // Удаляем navigationData после небольшой задержки, чтобы избежать повторных проверок
          setTimeout(() => {
            localStorage.removeItem('purchaseRequestNavigation');
            console.log('Navigation data removed after year restoration in main useEffect');
          }, 100);
        } else {
          console.log('No navigation data or year is null, setting year to null');
          // При обновлении страницы или переходе из меню год всегда "Все"
          // НО только если год еще не был восстановлен из navigationData
          if (!yearRestored) {
            setSelectedYear(null);
          }
          // Удаляем navigationData, если он есть, но год не был восстановлен
          if (navigationDataStr && !yearRestored) {
            localStorage.removeItem('purchaseRequestNavigation');
            console.log('Navigation data removed (no year to restore)');
          }
        }
        
        // Восстанавливаем сортировку
        if (savedFilters.sortField) {
          setSortField(savedFilters.sortField);
        }
        if (savedFilters.sortDirection) {
          setSortDirection(savedFilters.sortDirection);
        }
        
        // Восстанавливаем пагинацию
        if (savedFilters.currentPage !== undefined) {
          setCurrentPage(savedFilters.currentPage);
        }
        if (savedFilters.pageSize !== undefined) {
          setPageSize(savedFilters.pageSize);
        }
        
        // Восстанавливаем поисковые запросы в фильтрах
        if (savedFilters.cfoSearchQuery !== undefined) {
          setCfoSearchQuery(savedFilters.cfoSearchQuery);
        }
        if (savedFilters.statusSearchQuery !== undefined) {
          setStatusSearchQuery(savedFilters.statusSearchQuery);
        }
        
        // Восстанавливаем активную вкладку (если не сохранена, используем "В работе" по умолчанию)
        if (savedFilters.activeTab !== undefined) {
          setActiveTab(savedFilters.activeTab);
        } else {
          setActiveTab('in-work'); // По умолчанию "В работе"
        }
        
        console.log('Filters loaded from localStorage:', {
          filters: savedFilters.filters || savedFilters.localFilters,
          requiresPurchase: savedFilters.filters?.requiresPurchase || savedFilters.localFilters?.requiresPurchase,
        });
      } else {
        console.log('No saved filters found in localStorage');
        // При первой загрузке устанавливаем значения по умолчанию для statusFilter
        // По умолчанию фильтр пустой (как для ЦФО)
        setStatusFilter(new Set());
        // Если год не был восстановлен из navigationData, устанавливаем null
        if (!yearRestored) {
          setSelectedYear(null);
        }
      }
      
      // Помечаем, что загрузка завершена
      filtersLoadedRef.current = true;
    } catch (err) {
      console.error('Error loading filters from localStorage:', err);
      // При ошибке загрузки устанавливаем значения по умолчанию для statusFilter
      if (statusFilter.size === 0) {
        // По умолчанию фильтр пустой (как для ЦФО)
        setStatusFilter(new Set());
      }
      filtersLoadedRef.current = true; // Помечаем как загруженное даже при ошибке
    }
  }, []); // Пустой массив зависимостей - выполняется только один раз при монтировании

  // Отдельный useEffect для проверки navigationData при возврате с детальной страницы
  // Это резервный механизм на случай, если основной useEffect не сработал
  useEffect(() => {
    // Используем небольшую задержку, чтобы основной useEffect успел выполниться первым
    const timeoutId = setTimeout(() => {
      // Проверяем только если год еще не был восстановлен
      if (yearRestored) {
        console.log('Year already restored, skipping backup check');
        return;
      }
      
      try {
        const navigationDataStr = localStorage.getItem('purchaseRequestNavigation');
        if (navigationDataStr) {
          const navigationData = JSON.parse(navigationDataStr);
          if (navigationData.selectedYear !== undefined && navigationData.selectedYear !== null) {
            // Проверяем, отличается ли год от текущего
            if (selectedYear !== navigationData.selectedYear) {
              console.log('Year changed from navigation data (backup check):', navigationData.selectedYear, 'current:', selectedYear);
              setSelectedYear(navigationData.selectedYear);
              setYearRestored(true); // Помечаем, что год был восстановлен
              // Удаляем navigationData после применения
              localStorage.removeItem('purchaseRequestNavigation');
              console.log('Navigation data removed after year restoration (backup check)');
            }
          }
        }
      } catch (err) {
        console.error('Error checking navigation data:', err);
      }
    }, 200); // Небольшая задержка, чтобы основной useEffect успел выполниться

    return () => clearTimeout(timeoutId);
  }, []); // Пустой массив - выполняется только при монтировании

  // Функция для сохранения всех фильтров в localStorage
  const saveFiltersToLocalStorage = useCallback(() => {
    // Не сохраняем, если фильтры еще не загружены из localStorage (чтобы не перезаписать при первой загрузке)
    if (!filtersLoadedRef.current) {
      console.log('Skipping save - filters not loaded yet');
      return;
    }
    
    try {
      // Для select-типа фильтров (requiresPurchase, isPlanned) используем filters, для текстовых - localFilters
      const mergedFilters = { ...filters };
      // Объединяем с localFilters для текстовых полей, но приоритет у filters для select-полей
      Object.keys(localFilters).forEach(key => {
        // Если в filters есть значение для select-поля, используем его, иначе localFilters
        if (mergedFilters[key] === undefined || mergedFilters[key] === '') {
          mergedFilters[key] = localFilters[key];
        }
      });
      
      const filtersToSave = {
        filters: mergedFilters, // Сохраняем объединенные фильтры
        localFilters: localFilters, // Сохраняем также localFilters для текстовых полей с debounce
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        // selectedYear НЕ сохраняем - при переходе на страницу всегда "Все"
        sortField,
        sortDirection,
        currentPage,
        pageSize,
        cfoSearchQuery, // Сохраняем поисковые запросы
        statusSearchQuery,
        activeTab,
      };
      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
      console.log('Filters saved to localStorage:', {
        filtersCount: Object.keys(mergedFilters).length,
        requiresPurchase: mergedFilters.requiresPurchase,
        isPlanned: mergedFilters.isPlanned,
        budgetAmount: mergedFilters.budgetAmount,
        budgetAmountOperator: mergedFilters.budgetAmountOperator,
        cfoFilterSize: cfoFilter.size,
        statusFilterSize: statusFilter.size,
        selectedYear,
        currentPage,
        pageSize
      });
    } catch (err) {
      console.error('Error saving filters to localStorage:', err);
    }
  }, [filters, localFilters, cfoFilter, statusFilter, selectedYear, sortField, sortDirection, currentPage, pageSize, cfoSearchQuery, statusSearchQuery]);

  // Обновляем ref с актуальными значениями фильтров при каждом изменении
  useEffect(() => {
    // Объединяем filters и localFilters для сохранения актуальных значений
    const mergedFilters = { ...filters };
    Object.keys(localFilters).forEach(key => {
      // Если в filters есть значение для select-поля, используем его, иначе localFilters
      if (mergedFilters[key] === undefined || mergedFilters[key] === '') {
        mergedFilters[key] = localFilters[key];
      }
    });
    
    filtersStateRef.current = {
      filters: mergedFilters,
      localFilters,
      cfoFilter,
      statusFilter,
      selectedYear,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      cfoSearchQuery,
      statusSearchQuery,
      activeTab,
    };
  }, [filters, localFilters, cfoFilter, statusFilter, selectedYear, sortField, sortDirection, currentPage, pageSize, cfoSearchQuery, statusSearchQuery, activeTab]);

  // Сохраняем фильтры в localStorage при их изменении (только после загрузки)
  // selectedYear не сохраняется - при переходе на страницу всегда "Все"
  useEffect(() => {
    saveFiltersToLocalStorage();
  }, [filters, cfoFilter, statusFilter, sortField, sortDirection, currentPage, pageSize, cfoSearchQuery, statusSearchQuery, activeTab, saveFiltersToLocalStorage]);

  // Сохраняем localFilters с debounce для текстовых полей (чтобы сохранять промежуточные значения)
  useEffect(() => {
    if (!filtersLoadedRef.current) {
      return;
    }
    
    const timer = setTimeout(() => {
      saveFiltersToLocalStorage();
    }, 300); // Небольшая задержка для текстовых полей
    
    return () => clearTimeout(timer);
  }, [localFilters, saveFiltersToLocalStorage]);

  // Сохраняем фильтры при размонтировании компонента (перед переходом на другую страницу)
  useEffect(() => {
    return () => {
      // Используем ref для получения актуальных значений
      const state = filtersStateRef.current;
      try {
        const filtersToSave = {
          filters: state.filters,
          localFilters: state.localFilters,
          cfoFilter: Array.from(state.cfoFilter),
          statusFilter: Array.from(state.statusFilter),
          selectedYear: state.selectedYear,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          currentPage: state.currentPage,
          pageSize: state.pageSize,
          cfoSearchQuery: state.cfoSearchQuery,
          statusSearchQuery: state.statusSearchQuery,
        };
        localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
        console.log('Filters saved on unmount:', filtersToSave);
      } catch (err) {
        console.error('Error saving filters on unmount:', err);
      }
    };
  }, []); // Пустой массив зависимостей - эффект создается один раз

  // Сохраняем фильтры при уходе со страницы (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Используем ref для получения актуальных значений
      const state = filtersStateRef.current;
      try {
        const filtersToSave = {
          filters: state.filters,
          localFilters: state.localFilters,
          cfoFilter: Array.from(state.cfoFilter),
          statusFilter: Array.from(state.statusFilter),
          selectedYear: state.selectedYear,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          currentPage: state.currentPage,
          pageSize: state.pageSize,
          cfoSearchQuery: state.cfoSearchQuery,
          statusSearchQuery: state.statusSearchQuery,
        };
        localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
      } catch (err) {
        console.error('Error saving filters on beforeunload:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Пустой массив зависимостей

  // Сохраняем порядок колонок в localStorage
  const saveColumnOrder = useCallback((order: string[]) => {
    try {
      localStorage.setItem('purchaseRequestsTableColumnOrder', JSON.stringify(order));
    } catch (err) {
      console.error('Error saving column order:', err);
    }
  }, []);

  // Обработчики для перетаскивания колонок
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', columnKey);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnKey);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    saveColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Загружаем сохраненные ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchaseRequestsTableColumnWidths');
      if (saved) {
        const widths = JSON.parse(saved);
        setColumnWidths(widths);
      }
    } catch (err) {
      console.error('Error loading column widths:', err);
    }
  }, []);

  // Сохраняем ширины колонок в localStorage
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem('purchaseRequestsTableColumnWidths', JSON.stringify(widths));
    } catch (err) {
      console.error('Error saving column widths:', err);
    }
  }, []);

  // Обработчик начала изменения размера
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    resizeColumn.current = columnKey;
    resizeStartX.current = e.clientX;
    const currentWidth = columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
    resizeStartWidth.current = currentWidth;
  }, [columnWidths]);

  // Обработчик изменения размера
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeColumn.current) return;
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff); // Минимальная ширина 50px
      setColumnWidths(prev => {
        const updated = { ...prev, [resizeColumn.current!]: newWidth };
        saveColumnWidths(updated);
        return updated;
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      resizeColumn.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, saveColumnWidths]);

  // Функция для получения ширины колонки по умолчанию
  const getDefaultColumnWidth = (columnKey: string): number => {
    const defaults: Record<string, number> = {
      idPurchaseRequest: 64, // w-16 = 4rem = 64px
      cfo: 80, // w-20 = 5rem = 80px
      purchaseRequestInitiator: 48, // w-12 = 3rem = 48px
      purchaser: 150, // Закупщик
      name: 192, // w-48 = 12rem = 192px
      budgetAmount: 112, // w-28 = 7rem = 112px
      isPlanned: 80, // w-20 = 5rem = 80px
      requiresPurchase: 96, // w-24 = 6rem = 96px
      purchaseRequestCreationDate: 120,
      costType: 120,
      contractType: 120,
      contractDurationMonths: 120,
      daysInStatus: 120,
      daysSinceCreation: 140, // Срок с даты создания - немного шире для переноса текста
      isStrategicProduct: 160, // Стратегическая продукция - w-40 = 10rem = 160px
      guid: 192, // w-48 = 12rem = 192px
      purchaseRequestPlanYear: 96, // w-24 = 6rem = 96px
      company: 128, // w-32 = 8rem = 128px
      mcc: 96, // w-24 = 6rem = 96px
      purchaseRequestInitiator: 128, // w-32 = 8rem = 128px
      purchaseRequestCreationDate: 128, // w-32 = 8rem = 128px
      currency: 96, // w-24 = 6rem = 96px
      costType: 128, // w-32 = 8rem = 128px
      contractType: 128, // w-32 = 8rem = 128px
      contractDurationMonths: 128, // w-32 = 8rem = 128px
      isPlanned: 96, // w-24 = 6rem = 96px
      createdAt: 160, // w-40 = 10rem = 160px
      updatedAt: 160, // w-40 = 10rem = 160px
    };
    return defaults[columnKey] || 120;
  };

  // Функция для получения текущей ширины колонки
  const getColumnWidth = (columnKey: string): number => {
    return columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  };

  const fetchData = async (
    page: number, 
    size: number, 
    year: number | null = null,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {}
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));
      
      console.log('fetchData called with year:', year, 'selectedYear state:', selectedYear);
      if (year !== null) {
        params.append('year', String(year));
        console.log('Year parameter added to request:', year);
      } else {
        console.log('No year parameter - fetching all years');
      }
      
      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
      }
      
      // Добавляем параметры фильтрации
      if (filters.idPurchaseRequest && filters.idPurchaseRequest.trim() !== '') {
        const idValue = parseInt(filters.idPurchaseRequest.trim(), 10);
        if (!isNaN(idValue)) {
          params.append('idPurchaseRequest', String(idValue));
        }
      }
      // Фильтр по ЦФО - передаем все выбранные значения на бэкенд
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }
      
      // Фильтр по закупщику - множественный выбор (как ЦФО)
      if (purchaserFilter.size > 0) {
        purchaserFilter.forEach(p => {
          params.append('purchaser', p);
        });
      }
      if (filters.name && filters.name.trim() !== '') {
        params.append('name', filters.name.trim());
      }
      // Фильтр по бюджету (обрабатываем отдельно)
      // Используем оператор и значение из localFilters, если они есть, иначе из filters
      const budgetOperator = localFilters.budgetAmountOperator || filters.budgetAmountOperator;
      const budgetAmount = localFilters.budgetAmount || filters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      if (filters.costType && filters.costType.trim() !== '') {
        params.append('costType', filters.costType.trim());
      }
      if (filters.contractType && filters.contractType.trim() !== '') {
        params.append('contractType', filters.contractType.trim());
      }
      if (filters.requiresPurchase && filters.requiresPurchase.trim() !== '') {
        const requiresPurchaseValue = filters.requiresPurchase.trim();
        // Преобразуем "Закупка" в "true", "Заказ" в "false"
        if (requiresPurchaseValue === 'Закупка') {
          params.append('requiresPurchase', 'true');
        } else if (requiresPurchaseValue === 'Заказ') {
          params.append('requiresPurchase', 'false');
        }
      }
      if (filters.isStrategicProduct && filters.isStrategicProduct.trim() !== '' && filters.isStrategicProduct.trim() !== 'Все') {
        const isStrategicProductValue = filters.isStrategicProduct.trim();
        // Преобразуем "Да" в "true", "Нет" в "false"
        if (isStrategicProductValue === 'Да') {
          params.append('isStrategicProduct', 'true');
        } else if (isStrategicProductValue === 'Нет') {
          params.append('isStrategicProduct', 'false');
        }
      }
      
      // Фильтр по статусу - передаем все выбранные значения на бэкенд
      // Если активна вкладка (не "Все"), применяем фильтр по статусам вкладки
      // Если фильтр пустой и вкладка "Все", не передаем параметр (показываем все статусы)
      const effectiveStatusFilter = activeTab !== 'all' 
        ? new Set(getStatusesForTab(activeTab))
        : statusFilter;
      
      if (effectiveStatusFilter.size > 0) {
        effectiveStatusFilter.forEach(status => {
          params.append('status', status);
        });
      }
      
      const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      
      // Все фильтры, включая статус, применяются на бэкенде
      // Пагинация тоже на бэкенде
      // totalElements и totalPages уже учитывают все примененные фильтры
      setData(result);
      
      // Обновляем количество для активной вкладки из результата
      setTabCounts(prev => ({
        ...prev,
        [activeTab]: result.totalElements || 0,
      }));
      
      // Согласования загружаются только при открытии конкретной заявки на закупку
      // Здесь используем только статус из самой заявки
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Debounce для текстовых фильтров и фильтра бюджета
  useEffect(() => {
    // Проверяем, изменились ли текстовые фильтры
    const textFields = ['idPurchaseRequest', 'name', 'contractDurationMonths'];
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
  }, [localFilters, filters]);

  // Убрали useEffect, который устанавливал DEFAULT_STATUSES - теперь фильтр по умолчанию пустой

  useEffect(() => {
    // Не загружаем данные до тех пор, пока фильтры не загружены из localStorage
    if (!filtersLoadedRef.current) {
      console.log('Skipping fetchData - filters not loaded yet');
      return;
    }
    
    // Проверяем, есть ли navigationData, который еще не был обработан
    // Если есть, не вызываем fetchData сразу - дождемся восстановления года
    const navigationDataStr = localStorage.getItem('purchaseRequestNavigation');
    if (navigationDataStr && !yearRestored) {
      try {
        const navigationData = JSON.parse(navigationDataStr);
        if (navigationData.selectedYear !== undefined && navigationData.selectedYear !== null) {
          console.log('Skipping fetchData - waiting for year restoration from navigation data');
          return;
        }
      } catch (err) {
        // Игнорируем ошибки парсинга
      }
    }
    
    console.log('useEffect fetchData triggered with selectedYear:', selectedYear);
    fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters);
  }, [currentPage, pageSize, selectedYear, sortField, sortDirection, filters, cfoFilter, statusFilter, purchaserFilter, activeTab, yearRestored]);

  // Отдельный useEffect для перезапуска fetchData после восстановления года из navigationData
  // Это нужно, чтобы убедиться, что данные загружаются с правильным годом
  useEffect(() => {
    // Проверяем, был ли год восстановлен из navigationData и загружены ли фильтры
    if (yearRestored && filtersLoadedRef.current && selectedYear !== null) {
      console.log('Year was restored, re-fetching data with selectedYear:', selectedYear);
      // Небольшая задержка, чтобы убедиться, что selectedYear обновился
      const timeoutId = setTimeout(() => {
        fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [yearRestored, selectedYear]); // Зависимость от yearRestored и selectedYear

  // Восстановление фокуса после обновления localFilters
  useEffect(() => {
    if (focusedField) {
      const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
      if (input) {
        // Сохраняем позицию курсора (только для текстовых полей)
        const cursorPosition = input.type === 'number' ? null : (input.selectionStart || 0);
        const currentValue = input.value;
        
        // Восстанавливаем фокус в следующем тике, чтобы не мешать текущему вводу
        requestAnimationFrame(() => {
          const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
          if (inputAfterRender) {
            // Для фильтра бюджета проверяем, что неотформатированное значение совпадает
            if (focusedField === 'budgetAmount') {
              const currentRawValue = currentValue.replace(/\s/g, '').replace(/,/g, '');
              const afterRenderRawValue = inputAfterRender.value.replace(/\s/g, '').replace(/,/g, '');
              if (currentRawValue === afterRenderRawValue) {
                inputAfterRender.focus();
                // Для бюджета устанавливаем курсор в конец
                const length = inputAfterRender.value.length;
                inputAfterRender.setSelectionRange(length, length);
              }
            } else if (inputAfterRender.value === currentValue) {
              inputAfterRender.focus();
              // Восстанавливаем позицию курсора только для текстовых полей
              if (inputAfterRender.type !== 'number' && cursorPosition !== null) {
                const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
                inputAfterRender.setSelectionRange(newPosition, newPosition);
              }
            }
          }
        });
      }
    }
  }, [localFilters, focusedField]);

  // Синхронизация localFilters.budgetAmount с filters после загрузки данных
  // НО только если поле не в фокусе, чтобы сохранить форматирование
  useEffect(() => {
    if (!loading && data && focusedField !== 'budgetAmount') {
      // Синхронизируем значение бюджета из filters в localFilters после загрузки данных
      // Это нужно для сохранения значения после поиска
      setLocalFilters(prev => {
        // Если в filters есть значение бюджета, и оно отличается от localFilters, обновляем
        if (filters.budgetAmount !== undefined && filters.budgetAmount !== prev.budgetAmount) {
          return { ...prev, budgetAmount: filters.budgetAmount };
        }
        return prev;
      });
    }
  }, [loading, data, focusedField, filters.budgetAmount]);

  // Восстановление фокуса после завершения загрузки данных с сервера
  useEffect(() => {
    if (focusedField && !loading && data) {
      // Небольшая задержка, чтобы дать React время отрендерить обновленные данные
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input) {
          const currentValue = localFilters[focusedField] || '';
          // Для фильтра бюджета проверяем неотформатированное значение
          if (focusedField === 'budgetAmount') {
            const inputRawValue = input.value.replace(/\s/g, '').replace(/,/g, '');
            if (inputRawValue === currentValue) {
              input.focus();
              // Устанавливаем курсор в конец текста
              const length = input.value.length;
              input.setSelectionRange(length, length);
            }
          } else if (input.value === currentValue) {
            input.focus();
            // Устанавливаем курсор в конец текста
            const length = input.value.length;
            input.setSelectionRange(length, length);
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [data, loading, focusedField, localFilters]);

  // Получаем список уникальных годов из данных
  const getAvailableYears = (): number[] => {
    if (!data || !data.content) return [];
    const years = new Set<number>();
    data.content.forEach((request) => {
      if (request.purchaseRequestCreationDate) {
        const date = new Date(request.purchaseRequestCreationDate);
        const year = date.getFullYear();
        if (!isNaN(year)) {
          years.add(year);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Сортируем по убыванию
  };

  // Получаем все годы из всех данных (нужно загрузить все данные для этого)
  const [allYears, setAllYears] = useState<number[]>([]);
  
  // Получение уникальных значений для фильтров (загружаем все данные для этого)
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
    purchaseRequestInitiator: [],
    purchaser: [],
    status: [],
  });

  // Загружаем общее количество записей без фильтров
  useEffect(() => {
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-requests?page=0&size=1`);
        if (response.ok) {
          const result = await response.json();
          setTotalRecords(result.totalElements || 0);
        }
      } catch (err) {
        console.error('Error fetching total records:', err);
      }
    };
    fetchTotalRecords();
  }, []);

  useEffect(() => {
    // Загружаем все данные для получения списка годов и уникальных значений
    // Используем кэширование, чтобы не загружать каждый раз при монтировании
    const fetchMetadata = async () => {
      try {
        // Проверяем кэш
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          if (now - timestamp < CACHE_TTL) {
            // Используем кэшированные данные, но проверяем наличие статусов
            setAllYears(data.years);
            // Если в кэше нет статусов, добавляем пустой массив (они загрузятся при следующем запросе)
            const cachedUniqueValues = {
              ...data.uniqueValues,
              status: data.uniqueValues.status || []
            };
            setUniqueValues(cachedUniqueValues);
            console.log('Loaded from cache - uniqueValues:', cachedUniqueValues);
            // Проверяем, что в кэше есть статус "Утверждена"
            if (cachedUniqueValues.status && !cachedUniqueValues.status.includes('Утверждена')) {
              console.warn('WARNING: Cache does not contain "Утверждена" status, clearing cache and reloading');
              localStorage.removeItem(CACHE_KEY);
              // Продолжаем загрузку данных
            } else if (!cachedUniqueValues.status || cachedUniqueValues.status.length === 0) {
              console.log('Status values not in cache, will load from API');
            } else {
            return;
            }
          }
        }

        // Загружаем данные, если кэш отсутствует или устарел
        // Увеличиваем размер запроса, чтобы получить все записи для сбора уникальных значений
        const response = await fetch(`${getBackendUrl()}/api/purchase-requests?page=0&size=50000`);
        if (response.ok) {
          const result = await response.json();
          const years = new Set<number>();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
            purchaseRequestInitiator: new Set(),
            costType: new Set(),
            contractType: new Set(),
            purchaser: new Set(),
            status: new Set(),
          };
          
          result.content.forEach((request: PurchaseRequest) => {
            // Собираем годы
            if (request.purchaseRequestCreationDate) {
              const date = new Date(request.purchaseRequestCreationDate);
              const year = date.getFullYear();
              if (!isNaN(year)) {
                years.add(year);
              }
            }
            // Собираем уникальные значения
            if (request.cfo) values.cfo.add(request.cfo);
            if (request.purchaseRequestInitiator) values.purchaseRequestInitiator.add(request.purchaseRequestInitiator);
            if (request.purchaser) values.purchaser.add(request.purchaser);
            if (request.status) {
              // Добавляем статус как строку, убираем пробелы
              const statusStr = String(request.status).trim();
              if (statusStr) {
                values.status.add(statusStr);
                // Логируем для отладки
                if (statusStr === 'Утверждена') {
                  console.log('Found status "Утверждена" in request:', request.id, request.idPurchaseRequest);
                }
              }
            }
          });
          
          // Дополнительная проверка статуса "Утверждена"
          const hasApproved = Array.from(values.status).includes('Утверждена');
          console.log('Status "Утверждена" found in unique values:', hasApproved);
          console.log('All unique statuses before sorting:', Array.from(values.status));
          
          const yearsArray = Array.from(years).sort((a, b) => b - a);
          const uniqueValuesData = {
            cfo: Array.from(values.cfo).sort(),
            purchaseRequestInitiator: Array.from(values.purchaseRequestInitiator).sort(),
            purchaser: Array.from(values.purchaser).sort(),
            status: Array.from(values.status).sort(),
          };
          
          console.log('Loaded unique statuses from data:', uniqueValuesData.status);
          console.log('Total requests processed:', result.content.length);
          console.log('Status values found:', Array.from(values.status));
          
          // Проверяем, что статус "Утверждена" присутствует
          if (!uniqueValuesData.status.includes('Утверждена')) {
            console.warn('WARNING: Status "Утверждена" not found in unique values!');
            console.warn('All statuses:', uniqueValuesData.status);
            // Пересчитываем статусы для проверки
            const statusCounts: Record<string, number> = {};
            result.content.forEach((req: PurchaseRequest) => {
              if (req.status) {
                const statusStr = String(req.status).trim();
                statusCounts[statusStr] = (statusCounts[statusStr] || 0) + 1;
              }
            });
            console.warn('Status counts:', statusCounts);
            
            // Если статус "Утверждена" есть в данных, но не в уникальных значениях, добавляем его вручную
            if (statusCounts['Утверждена'] && statusCounts['Утверждена'] > 0) {
              console.warn('FIXING: Adding "Утверждена" to unique values manually');
              uniqueValuesData.status.push('Утверждена');
              uniqueValuesData.status.sort();
              // Очищаем кэш, чтобы перезагрузить данные
              localStorage.removeItem(CACHE_KEY);
            }
          }
          
          setAllYears(yearsArray);
          setUniqueValues(uniqueValuesData);
          
          // Сохраняем в кэш
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: {
              years: yearsArray,
              uniqueValues: uniqueValuesData,
            },
            timestamp: Date.now(),
          }));
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0); // Сбрасываем на первую страницу при изменении размера
  };

  // Обработка сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Обработка фильтров
  const handleFilterChange = (field: string, value: string, isTextFilter: boolean = false) => {
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
    }
  };

  const getUniqueValues = (field: keyof PurchaseRequest): string[] => {
    const fieldMap: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo',
      purchaseRequestInitiator: 'purchaseRequestInitiator',
      purchaser: 'purchaser',
      costType: 'costType',
      contractType: 'contractType',
      status: 'status',
    };
    return uniqueValues[fieldMap[field] || 'cfo'] || [];
  };

  // Обработчики для фильтров с чекбоксами
  const handleCfoToggle = (cfo: string) => {
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
  };

  const handleStatusToggle = (status: string) => {
    const newSet = new Set(statusFilter);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setStatusFilter(newSet);
    setCurrentPage(0);
  };

  const handleCfoSelectAll = () => {
    const allCfo = getUniqueValues('cfo');
    const newSet = new Set(allCfo);
    setCfoFilter(newSet);
    setFilters(prev => ({ ...prev, cfo: allCfo.join(',') }));
    setCurrentPage(0);
  };

  const handleCfoDeselectAll = () => {
    setCfoFilter(new Set());
    setFilters(prev => ({ ...prev, cfo: '' }));
    setCurrentPage(0);
  };

  const handlePurchaserToggle = (purchaser: string) => {
    const newSet = new Set(purchaserFilter);
    if (newSet.has(purchaser)) {
      newSet.delete(purchaser);
    } else {
      newSet.add(purchaser);
    }
    setPurchaserFilter(newSet);
    setCurrentPage(0);
  };

  const handlePurchaserSelectAll = () => {
    const allPurchasers = getUniqueValues('purchaser');
    setPurchaserFilter(new Set(allPurchasers));
    setCurrentPage(0);
  };

  const handlePurchaserDeselectAll = () => {
    setPurchaserFilter(new Set());
    setCurrentPage(0);
  };

  const handleStatusSelectAll = () => {
    const allStatuses = getUniqueValues('status');
    const newSet = new Set(allStatuses);
    setStatusFilter(newSet);
    setCurrentPage(0);
  };

  const handleStatusDeselectAll = () => {
    setStatusFilter(new Set());
    setStatusSearchQuery(''); // Очищаем поисковый запрос, чтобы показать все статусы
    setCurrentPage(0);
  };

  // Закрываем выпадающие списки при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isCfoFilterOpen && !target.closest('.cfo-filter-container')) {
        setIsCfoFilterOpen(false);
      }
      if (isStatusFilterOpen && !target.closest('.status-filter-container')) {
        setIsStatusFilterOpen(false);
      }
      if (isPurchaserFilterOpen && !target.closest('.purchaser-filter-container')) {
        setIsPurchaserFilterOpen(false);
      }
    };

    if (isCfoFilterOpen || isStatusFilterOpen || isPurchaserFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCfoFilterOpen, isStatusFilterOpen, isPurchaserFilterOpen]);

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

  // Обновляем columnOrder, когда добавляются новые колонки
  useEffect(() => {
    const missingColumns = Array.from(visibleColumns).filter(col => !columnOrder.includes(col));
    if (missingColumns.length > 0) {
      setColumnOrder(prev => {
        const newOrder = [...prev];
        // Добавляем недостающие колонки перед track, если он есть
        const trackIndex = newOrder.indexOf('track');
        if (trackIndex !== -1) {
          newOrder.splice(trackIndex, 0, ...missingColumns);
        } else {
          newOrder.push(...missingColumns);
        }
        // Сохраняем в localStorage
        try {
          localStorage.setItem('purchaseRequestsTableColumnOrder', JSON.stringify(newOrder));
        } catch (err) {
          console.error('Error saving column order:', err);
        }
        return newOrder;
      });
    }
  }, [visibleColumns, columnOrder]);

  // Фильтруем columnOrder, чтобы показывать только видимые колонки
  const filteredColumnOrder = useMemo(() => {
    return columnOrder.filter(columnKey => visibleColumns.has(columnKey));
  }, [columnOrder, visibleColumns]);

  const getFilteredStatusOptions = useMemo(() => {
    // Используем только статусы, которые есть в данных (в БД есть заявки с этими статусами)
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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <p className="text-red-600">Ошибка: {error}</p>
              <button
                onClick={() => fetchData(currentPage, pageSize)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Повторить
              </button>
        </div>
      </div>
    );
  }

  // Компонент для заголовка с сортировкой и фильтром
  const SortableHeader = ({ 
    field, 
    label, 
    filterType = 'text',
    filterOptions = [],
    width,
    columnKey
  }: { 
    field: SortField; 
    label: string;
    filterType?: 'text' | 'select';
    filterOptions?: string[];
    width?: string;
    columnKey?: string;
  }) => {
    const isSorted = sortField === field;
    const fieldKey = field || '';
    const filterValue = filterType === 'text' ? (localFilters[fieldKey] || '') : (filters[fieldKey] || '');
    const columnWidth = columnKey ? getColumnWidth(columnKey) : undefined;
    const style: React.CSSProperties = columnWidth 
      ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px` }
      : (width === 'w-12' ? { maxWidth: '3rem', minWidth: '3rem' } : {});
    
    const isDragging = draggedColumn === columnKey;
    const isDragOver = dragOverColumn === columnKey;
    
    return (
      <th 
        draggable={!!columnKey}
        onDragStart={columnKey ? (e) => handleDragStart(e, columnKey) : undefined}
        onDragOver={columnKey ? (e) => handleDragOver(e, columnKey) : undefined}
        onDragLeave={columnKey ? handleDragLeave : undefined}
        onDrop={columnKey ? (e) => handleDrop(e, columnKey) : undefined}
        className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${width || ''} ${columnKey ? 'cursor-move' : ''} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`} 
        style={{ ...style, verticalAlign: 'top', overflow: 'hidden' }}
      >
        <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
          <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
            {filterType === 'select' && filterOptions.length > 0 ? (
              <select
                value={filterValue}
                onChange={(e) => handleFilterChange(fieldKey, e.target.value, false)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              >
                <option value="">Все</option>
                {filterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : filterType === 'text' ? (
              <input
                key={`filter-${fieldKey}`}
                type="text"
                data-filter-field={fieldKey}
                value={filterValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  setLocalFilters(prev => ({
                    ...prev,
                    [fieldKey]: newValue,
                  }));
                  // Сохраняем позицию курсора после обновления
                  requestAnimationFrame(() => {
                    const input = e.target as HTMLInputElement;
                    if (input && document.activeElement === input) {
                      const newPos = Math.min(cursorPos, newValue.length);
                      input.setSelectionRange(newPos, newPos);
                    }
                  });
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  setFocusedField(fieldKey);
                }}
                onBlur={(e) => {
                  // Снимаем фокус только если пользователь явно кликнул в другое место
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement && 
                        activeElement !== e.target && 
                        !activeElement.closest('input[data-filter-field]') &&
                        !activeElement.closest('select')) {
                      setFocusedField(null);
                    }
                  }, 200);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  // Предотвращаем потерю фокуса при нажатии некоторых клавиш
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Фильтр"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
            ) : (
              <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
            )}
          </div>
          <div className="flex items-center gap-1 min-h-[20px]">
            {field ? (
              <button
                onClick={() => handleSort(field)}
                className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
              >
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                )}
              </button>
            ) : (
              <div style={{ width: '20px', minWidth: '20px', flexShrink: 0 }}></div>
            )}
            <span className={`text-xs font-medium text-gray-500 tracking-wider ${label === 'ЦФО' ? 'uppercase' : ''}`}>{label}</span>
          </div>
        </div>
        {columnKey && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, columnKey)}
            style={{ zIndex: 10 }}
          />
        )}
      </th>
    );
  };

  // Функция для экспорта в Excel
  const handleExportToExcel = async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      // Подготавливаем данные для экспорта
      const exportData = data.content.map((request) => ({
        'Номер заявки': request.idPurchaseRequest || '',
        'Дата создания': request.purchaseRequestCreationDate 
          ? new Date(request.purchaseRequestCreationDate).toLocaleDateString('ru-RU')
          : '',
        'ЦФО': request.cfo || '',
        'Наименование': request.name || '',
        'Инициатор': request.purchaseRequestInitiator || '',
        'Год плана': request.purchaseRequestPlanYear || '',
        'Бюджет': request.budgetAmount || '',
        'Тип затрат': request.costType || '',
        'Тип договора': request.contractType || '',
        'Длительность (мес)': request.contractDurationMonths || '',
        'План': request.isPlanned ? 'Плановая' : (request.isPlanned === false ? 'Внеплановая' : ''),
        'Требуется закупка': request.requiresPurchase ? 'Закупка' : (request.requiresPurchase === false ? 'Заказ' : ''),
      }));

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Устанавливаем ширину колонок
      const colWidths = [
        { wch: 15 }, // Номер заявки
        { wch: 15 }, // Дата создания
        { wch: 20 }, // ЦФО
        { wch: 30 }, // Наименование
        { wch: 25 }, // Инициатор
        { wch: 12 }, // Год плана
        { wch: 15 }, // Бюджет
        { wch: 15 }, // Тип затрат
        { wch: 15 }, // Тип договора
        { wch: 18 }, // Длительность
        { wch: 10 }, // План
        { wch: 18 }, // Требуется закупка
      ];
      ws['!cols'] = colWidths;

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'Заявки на закупку');

      // Генерируем имя файла с датой
      const fileName = `Заявки_на_закупку_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    }
  };

  // Функция для копирования в буфер обмена
  const handleCopyToClipboard = async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для копирования');
      return;
    }

    try {
      // Создаем заголовки
      const headers = [
        'Номер заявки',
        'Дата создания',
        'ЦФО',
        'Наименование',
        'Инициатор',
        'Год плана',
        'Бюджет',
        'Тип затрат',
        'Тип договора',
        'Длительность (мес)',
        'План',
        'Требуется закупка',
      ];

      // Создаем строки данных
      const rows = data.content.map((request) => [
        request.idPurchaseRequest || '',
        request.purchaseRequestCreationDate 
          ? new Date(request.purchaseRequestCreationDate).toLocaleDateString('ru-RU')
          : '',
        request.cfo || '',
        request.name || '',
        request.purchaseRequestInitiator || '',
        request.purchaseRequestPlanYear || '',
        request.budgetAmount || '',
        request.costType || '',
        request.contractType || '',
        request.contractDurationMonths || '',
        request.isPlanned ? 'Плановая' : (request.isPlanned === false ? 'Внеплановая' : ''),
        request.requiresPurchase ? 'Закупка' : (request.requiresPurchase === false ? 'Заказ' : ''),
      ]);

      // Объединяем заголовки и данные
      const allRows = [headers, ...rows];

      // Преобразуем в TSV формат (табуляция между колонками)
      const tsvContent = allRows.map(row => row.join('\t')).join('\n');

      // Копируем в буфер обмена
      await navigator.clipboard.writeText(tsvContent);
      alert('Данные скопированы в буфер обмена');
    } catch (error) {
      console.error('Ошибка при копировании в буфер обмена:', error);
      alert('Ошибка при копировании в буфер обмена');
    }
  };

  // Функция для сохранения таблицы как картинки
  const handleSaveAsImage = async () => {
    // Сохраняем оригинальные функции консоли перед началом
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    try {
      // Находим элемент таблицы - используем более точный селектор
      const tableContainer = document.querySelector('.bg-white.rounded-lg.shadow-lg.overflow-hidden');
      const tableElement = tableContainer?.querySelector('table');
      
      if (!tableElement) {
        alert('Таблица не найдена');
        return;
      }

      // Временно подавляем ошибки, связанные с lab()
      console.error = (...args: any[]) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('lab')) {
          return; // Игнорируем ошибки lab()
        }
        originalConsoleError.apply(console, args);
      };
      
      console.warn = (...args: any[]) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('lab')) {
          return; // Игнорируем предупреждения lab()
        }
        originalConsoleWarn.apply(console, args);
      };

      try {
        // Создаем canvas из таблицы
        const canvas = await html2canvas(tableElement as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2, // Увеличиваем разрешение для лучшего качества
          logging: false,
          useCORS: true,
        });

        // Преобразуем canvas в blob
        canvas.toBlob((blob: Blob | null) => {
          if (!blob) {
            alert('Ошибка при создании изображения');
            return;
          }

          // Создаем ссылку для скачивания
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Генерируем имя файла с датой
          const fileName = `Заявки_на_закупку_${new Date().toISOString().split('T')[0]}.png`;
          link.download = fileName;
          
          // Добавляем ссылку в DOM, кликаем и удаляем
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Освобождаем память
          URL.revokeObjectURL(url);
        }, 'image/png');
      } finally {
        // Восстанавливаем оригинальные функции консоли
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      }
    } catch (error) {
      // Восстанавливаем оригинальные функции консоли в случае ошибки
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      // Игнорируем ошибки, связанные с lab()
      if (error instanceof Error && error.message && error.message.includes('lab')) {
        // Тихо игнорируем ошибку парсинга lab() цвета (html2canvas не поддерживает эту функцию)
        return;
      }
      
      console.error('Ошибка при сохранении изображения:', error);
      alert('Ошибка при сохранении изображения');
    }
  };

  // Проверяем, есть ли данные для отображения
  const hasData = data && data.content && data.content.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">Фильтр по году создания:</span>
              <button
                onClick={() => {
                setSelectedYear(null);
                setCurrentPage(0); // Сбрасываем на первую страницу при сбросе фильтра
                }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedYear === null
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
              Все
              </button>
            {allYears.map((year) => (
            <button
                key={year}
              onClick={() => {
                  setSelectedYear(year);
                  setCurrentPage(0); // Сбрасываем на первую страницу при изменении года
              }}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedYear === year
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
                {year}
            </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              Всего записей: {totalRecords}
            </p>
            <div className="relative">
              <button
                ref={columnsMenuButtonRef}
                onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2"
                title="Настройка колонок"
              >
                <Settings className="w-4 h-4" />
                Колонки
              </button>
              {isColumnsMenuOpen && columnsMenuPosition && (
                <div 
                  data-columns-menu="true"
                  className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden"
                  style={{
                    top: `${columnsMenuPosition.top}px`,
                    left: `${columnsMenuPosition.left}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Выбор колонок</h3>
                  </div>
                  <div className="p-2 border-b border-gray-200 flex gap-2">
                    <button
                      onClick={selectAllColumns}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Все
                    </button>
                    <button
                      onClick={selectDefaultColumns}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      По умолчанию
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {ALL_COLUMNS.map((column) => (
                      <label
                        key={column.key}
                        className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column.key)}
                          onChange={() => toggleColumnVisibility(column.key)}
                          className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-xs text-gray-700 flex-1">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                const emptyFilters = {
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
                  isStrategicProduct: '',
                };
                setFilters(emptyFilters);
                setLocalFilters(emptyFilters);
                setCfoFilter(new Set());
                setStatusFilter(new Set()); // По умолчанию пустой, как для ЦФО
                setCfoSearchQuery('');
                setStatusSearchQuery('');
                setPurchaserFilter(new Set());
                setPurchaserSearchQuery('');
                setSelectedYear(null); // Сбрасываем фильтр по году на "Все"
                setSortField('idPurchaseRequest');
                setSortDirection('desc');
                setFocusedField(null);
                setActiveTab('in-work'); // Сбрасываем вкладку на "В работе" (по умолчанию)
              }}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Пагинация */}
      {data && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToExcel}
                className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Сохранить в Excel"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Копировать в буфер обмена"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-700">
              Показано {data?.content.length || 0} из {data?.totalElements || 0} записей
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-gray-700">
                Элементов на странице:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Первая
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Страница {currentPage + 1} из {data?.totalPages || 0}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= (data?.totalPages || 0) - 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
            <button
              onClick={() => setCurrentPage((data?.totalPages || 0) - 1)}
              disabled={currentPage >= (data?.totalPages || 0) - 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Последняя
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-auto relative">
        {/* Вкладки - слева в углу над заголовками, закреплены при прокрутке */}
        <div className="sticky top-0 left-0 right-0 z-30 flex gap-1 pt-2 pb-2 bg-white shadow-sm" style={{ minHeight: '44px', width: '100%', backgroundColor: 'white' }}>
          <button
            onClick={() => {
              setActiveTab('in-work');
              setStatusFilter(new Set());
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
              activeTab === 'in-work'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            В работе {tabCounts['in-work'] !== null ? `(${tabCounts['in-work']})` : '(0)'}
          </button>
          <button
            onClick={() => {
              setActiveTab('completed');
              setStatusFilter(new Set());
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Завершенные {tabCounts['completed'] !== null ? `(${tabCounts['completed']})` : '(0)'}
          </button>
          <button
            onClick={() => {
              setActiveTab('all');
              setStatusFilter(new Set());
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Все {tabCounts['all'] !== null ? `(${tabCounts['all']})` : '(0)'}
          </button>
          <button
            onClick={() => {
              setActiveTab('project-rejected');
              setStatusFilter(new Set());
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
              activeTab === 'project-rejected'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Проект/Отмена/Не Согласовано/Архив {tabCounts['project-rejected'] !== null ? `(${tabCounts['project-rejected']})` : '(0)'}
          </button>
        </div>
        
        {/* Таблица с закрепленными заголовками */}
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-[44px] z-20">
            <tr>
              {filteredColumnOrder.map(columnKey => {
                const isDragging = draggedColumn === columnKey;
                const isDragOver = dragOverColumn === columnKey;
                
                if (columnKey === 'excludeFromInWork') {
                  return (
                    <th 
                      key={columnKey}
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative w-12"
                    >
                      <div className="flex items-center justify-center">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                  );
                }
                
                if (columnKey === 'idPurchaseRequest') {
                  return <SortableHeader key={columnKey} field="idPurchaseRequest" label="Номер" width="w-16" columnKey="idPurchaseRequest" />;
                }
                
                if (columnKey === 'guid') {
                  return <SortableHeader key={columnKey} field="guid" label="GUID" width="w-48" columnKey="guid" />;
                }
                
                if (columnKey === 'purchaseRequestPlanYear') {
                  return <SortableHeader key={columnKey} field="purchaseRequestPlanYear" label="Год плана" width="w-24" columnKey="purchaseRequestPlanYear" />;
                }
                
                if (columnKey === 'company') {
                  return <SortableHeader key={columnKey} field="company" label="Компания" width="w-32" columnKey="company" />;
                }
                
                if (columnKey === 'mcc') {
                  return <SortableHeader key={columnKey} field="mcc" label="МЦК" width="w-24" columnKey="mcc" />;
                }
                
                if (columnKey === 'purchaseRequestInitiator') {
                  return <SortableHeader key={columnKey} field="purchaseRequestInitiator" label="Инициатор" width="w-32" columnKey="purchaseRequestInitiator" />;
                }
                
                if (columnKey === 'cfo') {
                  return (
                    <th
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                      style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px`, verticalAlign: 'top' }}
                    >
                <div className="flex flex-col gap-1">
                  <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}>
                    <div className="relative cfo-filter-container w-full h-full">
                      <button
                        ref={cfoFilterButtonRef}
                        type="button"
                        onClick={() => setIsCfoFilterOpen(!isCfoFilterOpen)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', boxSizing: 'border-box' }}
                      >
                        <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                          {cfoFilter.size === 0 
                            ? 'Все' 
                            : cfoFilter.size === 1
                            ? (Array.from(cfoFilter)[0] || 'Все')
                            : `${cfoFilter.size} выбрано`}
                        </span>
                        <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isCfoFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    {isCfoFilterOpen && cfoFilterPosition && (
                      <div 
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                        style={{
                          top: `${cfoFilterPosition.top}px`,
                          left: `${cfoFilterPosition.left}px`,
                        }}
                      >
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              type="text"
                              value={cfoSearchQuery}
                              onChange={(e) => {
                                e.stopPropagation();
                                setCfoSearchQuery(e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Поиск..."
                            />
                          </div>
                        </div>
                        <div className="p-2 border-b border-gray-200 flex gap-2">
                          <button
                            onClick={() => handleCfoSelectAll()}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Все
                          </button>
                          <button
                            onClick={() => handleCfoDeselectAll()}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Снять
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredCfoOptions.length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                          ) : (
                            getFilteredCfoOptions.map((cfo) => (
                              <label
                                key={cfo}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={cfoFilter.has(cfo)}
                                  onChange={() => handleCfoToggle(cfo)}
                                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-xs text-gray-700 flex-1">{cfo}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 min-h-[20px]">
                  <button
                    onClick={() => handleSort('cfo')}
                      className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                      style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                  >
                    {sortField === 'cfo' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <ArrowDown className="w-3 h-3 flex-shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                    )}
                  </button>
                    <span className="uppercase text-xs font-medium text-gray-500 tracking-wider">ЦФО</span>
                  </div>
                </div>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                  onMouseDown={(e) => handleResizeStart(e, 'cfo')}
                  style={{ zIndex: 10 }}
                />
              </th>
                  );
                }
                
                if (columnKey === 'purchaser') {
                  return (
                    <th
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                      style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px`, verticalAlign: 'top' }}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}>
                          <div className="relative purchaser-filter-container w-full h-full">
                            <button
                              ref={purchaserFilterButtonRef}
                              type="button"
                              onClick={() => setIsPurchaserFilterOpen(!isPurchaserFilterOpen)}
                              className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                              style={{ height: '24px', minHeight: '24px', maxHeight: '24px', boxSizing: 'border-box' }}
                            >
                              <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                                {purchaserFilter.size === 0
                                  ? 'Все'
                                  : purchaserFilter.size === 1
                                  ? (Array.from(purchaserFilter)[0] || 'Все')
                                  : `${purchaserFilter.size} выбрано`}
                              </span>
                              <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isPurchaserFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isPurchaserFilterOpen && purchaserFilterPosition && (
                              <div
                                className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                                style={{
                                  top: `${purchaserFilterPosition.top}px`,
                                  left: `${purchaserFilterPosition.left}px`,
                                }}
                              >
                                <div className="p-2 border-b border-gray-200">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                                    <input
                                      type="text"
                                      value={purchaserSearchQuery}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setPurchaserSearchQuery(e.target.value);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={(e) => e.stopPropagation()}
                                      className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      placeholder="Поиск..."
                                    />
                                  </div>
                                </div>
                                <div className="p-2 border-b border-gray-200 flex gap-2">
                                  <button
                                    onClick={() => handlePurchaserSelectAll()}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Все
                                  </button>
                                  <button
                                    onClick={() => handlePurchaserDeselectAll()}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                  >
                                    Снять
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {getFilteredPurchaserOptions.length === 0 ? (
                                    <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                                  ) : (
                                    getFilteredPurchaserOptions.map((p) => (
                                      <label
                                        key={p}
                                        className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={purchaserFilter.has(p)}
                                          onChange={() => handlePurchaserToggle(p)}
                                          className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-xs text-gray-700 flex-1">{p}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-[20px]">
                          <button
                            onClick={() => handleSort('purchaser')}
                            className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                            style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                          >
                            {sortField === 'purchaser' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <ArrowDown className="w-3 h-3 flex-shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                            )}
                          </button>
                          <span className="text-xs font-medium text-gray-500 tracking-wider">Закупщик</span>
                        </div>
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                        onMouseDown={(e) => handleResizeStart(e, 'purchaser')}
                        style={{ zIndex: 10 }}
                      />
                    </th>
                  );
                }
                
                if (columnKey === 'name') {
                  return <SortableHeader key={columnKey} field="name" label="Наименование" width="w-48" columnKey="name" />;
                }
                
                if (columnKey === 'purchaseRequestCreationDate') {
                  return <SortableHeader key={columnKey} field="purchaseRequestCreationDate" label="Дата создания" width="w-32" columnKey="purchaseRequestCreationDate" />;
                }
                
                if (columnKey === 'budgetAmount') {
                  return (
                    <th
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
                      style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px`, verticalAlign: 'top' }}
                    >
                      <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                        <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                          <div className="relative flex-1" style={{ minWidth: 0 }}>
                            <select
                              value={localFilters.budgetAmountOperator || 'gte'}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newValue = e.target.value;
                                setLocalFilters(prev => ({
                                  ...prev,
                                  budgetAmountOperator: newValue,
                                }));
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              className={`absolute left-0 top-0 h-full text-xs border-0 border-r border-gray-300 rounded-l px-1 py-0 focus:outline-none focus:ring-0 appearance-none cursor-pointer z-10 transition-colors ${
                                localFilters.budgetAmountOperator && ['gt', 'gte', 'lt', 'lte'].includes(localFilters.budgetAmountOperator)
                                  ? 'bg-blue-500 text-white font-semibold'
                                  : 'bg-gray-50 text-gray-700'
                              }`}
                              style={{ width: '42px', minWidth: '42px', paddingRight: '4px', height: '24px', minHeight: '24px', maxHeight: '24px', boxSizing: 'border-box' }}
                            >
                              <option value="gt">&gt;</option>
                              <option value="gte">&gt;=</option>
                              <option value="lt">&lt;</option>
                              <option value="lte">&lt;=</option>
                            </select>
                            <input
                              type="text"
                              data-filter-field="budgetAmount"
                              value={(() => {
                                // Используем значение из localFilters, если оно есть, иначе из filters
                                const value = localFilters.budgetAmount || filters.budgetAmount || '';
                                if (!value) return '';
                                // Убираем все нецифровые символы для парсинга
                                const numValue = value.toString().replace(/\s/g, '').replace(/,/g, '');
                                const num = parseFloat(numValue);
                                if (isNaN(num)) return value;
                                // Форматируем с разделителями разрядов
                                return new Intl.NumberFormat('ru-RU', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(num);
                              })()}
                              onChange={(e) => {
                                const newValue = e.target.value.replace(/\s/g, '').replace(/,/g, '');
                                const cursorPos = e.target.selectionStart || 0;
                                setLocalFilters(prev => ({
                                  ...prev,
                                  budgetAmount: newValue,
                                }));
                                // Сохраняем позицию курсора после обновления
                                requestAnimationFrame(() => {
                                  const input = e.target as HTMLInputElement;
                                  if (input && document.activeElement === input) {
                                    // Для бюджета устанавливаем курсор в конец (так как значение форматируется)
                                    const length = input.value.length;
                                    input.setSelectionRange(length, length);
                                  }
                                });
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                setFocusedField('budgetAmount');
                                // При фокусе показываем число без форматирования для удобства редактирования
                                const value = localFilters.budgetAmount || '';
                                if (value) {
                                  const numValue = value.replace(/\s/g, '').replace(/,/g, '');
                                  e.target.value = numValue;
                                }
                              }}
                              onBlur={(e) => {
                                setTimeout(() => {
                                  const activeElement = document.activeElement as HTMLElement;
                                  if (activeElement && activeElement !== e.target && !activeElement.closest('th')) {
                                    setFocusedField(null);
                                  }
                                }, 200);
                              }}
                              placeholder="Число"
                              className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 pl-11 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-[20px]">
                          <button
                            onClick={() => handleSort('budgetAmount')}
                            className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                            style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                          >
                            {sortField === 'budgetAmount' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <ArrowDown className="w-3 h-3 flex-shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                            )}
                          </button>
                          <span className="text-xs font-medium text-gray-500 tracking-wider">Бюджет</span>
                        </div>
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                        onMouseDown={(e) => handleResizeStart(e, 'budgetAmount')}
                        style={{ zIndex: 10 }}
                      />
                    </th>
                  );
                }
                
                if (columnKey === 'requiresPurchase') {
                  return <SortableHeader key={columnKey} field="requiresPurchase" label="Закупка" filterType="select" filterOptions={['Закупка', 'Заказ']} width="w-24" columnKey="requiresPurchase" />;
                }
                
                if (columnKey === 'status') {
                  return (
                    <th
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                      style={{ verticalAlign: 'top' }}
                    >
                <div className="flex flex-col gap-1">
                  <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}>
                    <div className="relative status-filter-container w-full h-full">
                      <button
                        ref={statusFilterButtonRef}
                        type="button"
                        onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:bg-gray-50"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', boxSizing: 'border-box' }}
                      >
                        <span className="text-gray-600 truncate">
                          {statusFilter.size === 0 
                            ? 'Все' 
                            : statusFilter.size === 1
                            ? Array.from(statusFilter)[0]
                            : `${statusFilter.size} выбрано`}
                        </span>
                        <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isStatusFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    {isStatusFilterOpen && statusFilterPosition && (
                      <div 
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden"
                        style={{
                          top: `${statusFilterPosition.top}px`,
                          left: `${statusFilterPosition.left}px`,
                        }}
                      >
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              type="text"
                              value={statusSearchQuery}
                              onChange={(e) => setStatusSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Поиск..."
                            />
                          </div>
                        </div>
                        <div className="p-2 border-b border-gray-200 flex gap-2">
                          <button
                            onClick={() => handleStatusSelectAll()}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Все
                          </button>
                          <button
                            onClick={() => handleStatusDeselectAll()}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Снять
                          </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {getFilteredStatusOptions.length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                          ) : (
                            getFilteredStatusOptions.map((status) => {
                              // Логируем для отладки
                              if (status === 'Утверждена') {
                                console.log('Rendering status "Утверждена" in UI, checked:', statusFilter.has(status), 'key:', status);
                              }
                              return (
                              <label
                                key={status}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={statusFilter.has(status)}
                                  onChange={() => handleStatusToggle(status)}
                                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-xs text-gray-700 flex-1">{status}</span>
                              </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  <span className="normal-case min-h-[20px] flex items-center">Статус</span>
                </div>
              </th>
                  );
                }
                
                if (columnKey === 'daysInStatus') {
                  // Показываем только для закупок на вкладке "в работе"
                  if (activeTab !== 'in-work') {
                    return null;
                  }
                  return (
                    <th
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                      style={{ verticalAlign: 'top' }}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}></div>
                        <span className="normal-case min-h-[20px] flex items-center">Срок в статусе</span>
                      </div>
                    </th>
                  );
                }
                
                if (columnKey === 'isStrategicProduct') {
                  return <SortableHeader key={columnKey} field="isStrategicProduct" label="Стратегическая продукция" filterType="select" filterOptions={['Да', 'Нет', 'Все']} width="w-40" columnKey="isStrategicProduct" />;
                }
                
                if (columnKey === 'daysSinceCreation') {
                  return (
                    <th
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 cursor-move relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                      style={{ 
                        verticalAlign: 'top',
                        width: `${getColumnWidth(columnKey)}px`,
                        minWidth: `${getColumnWidth(columnKey)}px`,
                        maxWidth: `${getColumnWidth(columnKey)}px`
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}></div>
                        <span className="normal-case min-h-[20px] flex items-center break-words" style={{ wordBreak: 'break-word', lineHeight: '1.2' }}>Срок с даты создания</span>
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                        onMouseDown={(e) => handleResizeStart(e, columnKey)}
                        style={{ zIndex: 10 }}
                      />
                    </th>
                  );
                }
                
                if (columnKey === 'createdAt') {
                  return <SortableHeader key={columnKey} field="createdAt" label="Дата создания (системная)" width="w-40" columnKey="createdAt" />;
                }
                
                if (columnKey === 'updatedAt') {
                  return <SortableHeader key={columnKey} field="updatedAt" label="Дата обновления" width="w-40" columnKey="updatedAt" />;
                }
                
                if (columnKey === 'track') {
                  return (
                    <th
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                      style={{ verticalAlign: 'top' }}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}></div>
                        <span className="normal-case min-h-[20px] flex items-center">Трэк</span>
                      </div>
                    </th>
                  );
                }
                
                return null;
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hasData ? (
              data?.content.map((request, index) => (
                <tr 
                  key={request.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    // Не переходим на страницу, если клик был на интерактивном элементе
                    const target = e.target as HTMLElement;
                    if (target.closest('input') || target.closest('select') || target.closest('button') || target.closest('.cursor-col-resize')) {
                      return;
                    }
                    // Сохраняем текущие фильтры и позицию для навигации
                    // Вычисляем глобальный индекс: индекс на текущей странице + смещение страницы
                    const globalIndex = currentPage * pageSize + index;
                    try {
                      // Сохраняем фильтры перед переходом
                      const filtersToSave = {
                        filters,
                        localFilters,
                        cfoFilter: Array.from(cfoFilter),
                        statusFilter: Array.from(statusFilter),
                        selectedYear,
                        sortField,
                        sortDirection,
                        currentPage,
                        pageSize,
                        cfoSearchQuery,
                        statusSearchQuery,
                      };
                      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
                      
                      // Сохраняем данные навигации
                      const navigationData = {
                        currentIndex: globalIndex,
                        page: currentPage,
                        pageSize: pageSize,
                        filters: filters,
                        localFilters: localFilters,
                        cfoFilter: Array.from(cfoFilter),
                        statusFilter: Array.from(statusFilter),
                        selectedYear: selectedYear,
                        sortField: sortField,
                        sortDirection: sortDirection,
                        totalElements: data.totalElements,
                      };
                      localStorage.setItem('purchaseRequestNavigation', JSON.stringify(navigationData));
                      console.log('Navigation data saved with year:', selectedYear, 'navigationData:', navigationData);
                    } catch (err) {
                      console.error('Error saving navigation data:', err);
                    }
                    router.push(`/purchase-request/${request.id}`);
                  }}
                >
                  {filteredColumnOrder.map(columnKey => {
                    if (columnKey === 'excludeFromInWork') {
                      const handleToggleExclude = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!canEditExcludeFromInWork) {
                          alert('Только администратор может изменять видимость заявки в работе');
                          return;
                        }
                        const newValue = !request.excludeFromInWork;
                        try {
                          const response = await fetch(`${getBackendUrl()}/api/purchase-requests/${request.idPurchaseRequest}/exclude-from-in-work`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'X-User-Role': userRole || 'user',
                            },
                            body: JSON.stringify({ excludeFromInWork: newValue }),
                          });
                          if (response.ok) {
                            const updated = await response.json();
                            setData(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                content: prev.content.map(item => 
                                  item.idPurchaseRequest === request.idPurchaseRequest 
                                    ? { ...item, excludeFromInWork: updated.excludeFromInWork }
                                    : item
                                ),
                              };
                            });
                          } else {
                            const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
                            alert(errorData.message || 'Не удалось обновить видимость заявки');
                            console.error('Failed to update excludeFromInWork');
                          }
                        } catch (error) {
                          console.error('Error updating excludeFromInWork:', error);
                          alert('Ошибка при обновлении видимости заявки');
                        }
                      };
                      
                      return (
                        <td 
                          key={columnKey}
                          className={`px-2 py-2 whitespace-nowrap border-r border-gray-200 ${canEditExcludeFromInWork ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
                          onClick={canEditExcludeFromInWork ? handleToggleExclude : undefined}
                        >
                          <div className={`flex items-center justify-center rounded p-1 transition-colors ${canEditExcludeFromInWork ? 'hover:bg-gray-100' : 'opacity-50'}`}>
                            {request.excludeFromInWork ? (
                              <span title={canEditExcludeFromInWork ? "Скрыто из вкладки 'В работе' (кликните для изменения)" : "Скрыто из вкладки 'В работе' (только администратор может изменить)"}>
                                <EyeOff className="w-4 h-4 text-gray-400" />
                              </span>
                            ) : (
                              <span title={canEditExcludeFromInWork ? "Отображается во вкладке 'В работе' (кликните для изменения)" : "Отображается во вкладке 'В работе' (только администратор может изменить)"}>
                                <Eye className="w-4 h-4 text-gray-600" />
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    }
                    
                    if (columnKey === 'idPurchaseRequest') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('idPurchaseRequest')}px`, minWidth: `${getColumnWidth('idPurchaseRequest')}px`, maxWidth: `${getColumnWidth('idPurchaseRequest')}px` }}
                        >
                          {request.idPurchaseRequest || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'guid') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('guid')}px`, minWidth: `${getColumnWidth('guid')}px`, maxWidth: `${getColumnWidth('guid')}px` }}
                          title={request.guid ? String(request.guid) : ''}
                        >
                          {request.guid ? String(request.guid) : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'purchaseRequestPlanYear') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('purchaseRequestPlanYear')}px`, minWidth: `${getColumnWidth('purchaseRequestPlanYear')}px`, maxWidth: `${getColumnWidth('purchaseRequestPlanYear')}px` }}
                        >
                          {request.purchaseRequestPlanYear || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'company') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('company')}px`, minWidth: `${getColumnWidth('company')}px`, maxWidth: `${getColumnWidth('company')}px` }}
                          title={request.company || ''}
                        >
                          {request.company || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'cfo') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px` }}
                          title={request.cfo || ''}
                        >
                          {request.cfo || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'mcc') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('mcc')}px`, minWidth: `${getColumnWidth('mcc')}px`, maxWidth: `${getColumnWidth('mcc')}px` }}
                          title={request.mcc || ''}
                        >
                          {request.mcc || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'purchaseRequestInitiator') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('purchaseRequestInitiator')}px`, minWidth: `${getColumnWidth('purchaseRequestInitiator')}px`, maxWidth: `${getColumnWidth('purchaseRequestInitiator')}px` }}
                          title={request.purchaseRequestInitiator || ''}
                        >
                          {request.purchaseRequestInitiator || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'purchaser') {
                      return (
                        <td
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200"
                          style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px` }}
                          title={request.purchaser || ''}
                        >
                          {request.purchaser || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'name') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 break-words border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('name')}px`, minWidth: `${getColumnWidth('name')}px`, maxWidth: `${getColumnWidth('name')}px` }}
                        >
                          {request.name || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'purchaseRequestCreationDate') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('purchaseRequestCreationDate')}px`, minWidth: `${getColumnWidth('purchaseRequestCreationDate')}px`, maxWidth: `${getColumnWidth('purchaseRequestCreationDate')}px` }}
                        >
                          {request.purchaseRequestCreationDate ? new Date(request.purchaseRequestCreationDate).toLocaleDateString('ru-RU') : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'budgetAmount') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px` }}
                        >
                          {request.budgetAmount ? (
                            <span className="flex items-center">
                              {new Intl.NumberFormat('ru-RU', { 
                            notation: 'compact',
                            maximumFractionDigits: 1 
                              }).format(request.budgetAmount)}
                              {getCurrencyIcon(request.currency)}
                            </span>
                          ) : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'currency') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('currency')}px`, minWidth: `${getColumnWidth('currency')}px`, maxWidth: `${getColumnWidth('currency')}px` }}
                        >
                          {request.currency ? (
                            <span className="flex items-center">
                              {getCurrencyIcon(request.currency)}
                            </span>
                          ) : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'costType') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('costType')}px`, minWidth: `${getColumnWidth('costType')}px`, maxWidth: `${getColumnWidth('costType')}px` }}
                          title={request.costType || ''}
                        >
                          {request.costType || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'contractType') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('contractType')}px`, minWidth: `${getColumnWidth('contractType')}px`, maxWidth: `${getColumnWidth('contractType')}px` }}
                          title={request.contractType || ''}
                        >
                          {request.contractType || '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'contractDurationMonths') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-center" 
                          style={{ width: `${getColumnWidth('contractDurationMonths')}px`, minWidth: `${getColumnWidth('contractDurationMonths')}px`, maxWidth: `${getColumnWidth('contractDurationMonths')}px` }}
                        >
                          {request.contractDurationMonths !== null && request.contractDurationMonths !== undefined ? (
                            <span>{request.contractDurationMonths}</span>
                          ) : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'isPlanned') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('isPlanned')}px`, minWidth: `${getColumnWidth('isPlanned')}px`, maxWidth: `${getColumnWidth('isPlanned')}px` }}
                        >
                          {request.isPlanned ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Плановая
                            </span>
                          ) : request.isPlanned === false ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Внеплановая
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                              -
                            </span>
                          )}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'requiresPurchase') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('requiresPurchase')}px`, minWidth: `${getColumnWidth('requiresPurchase')}px`, maxWidth: `${getColumnWidth('requiresPurchase')}px` }}
                        >
                          {request.requiresPurchase ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Закупка
                            </span>
                          ) : request.requiresPurchase === false ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Заказ
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                              -
                            </span>
                          )}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'status') {
                      return (
                        <td key={columnKey} className="px-2 py-2 text-xs border-r border-gray-200">
                          {request.status ? (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              request.status === 'Согласована' || request.status === 'Спецификация подписана' || request.status === 'Договор подписан'
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'Спецификация создана - Архив'
                                ? 'bg-gray-200 text-gray-700'
                                : request.status === 'Спецификация создана' || request.status === 'Закупка создана' || request.status === 'Утверждена' || request.status === 'Заявка утверждена'
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.status === 'Заявка не согласована' || request.status === 'Заявка не утверждена' || request.status === 'Закупка не согласована'
                                ? 'bg-red-100 text-red-800'
                                : request.status === 'На согласовании' || request.status === 'Заявка на согласовании' || request.status === 'На утверждении' || request.status === 'Заявка на утверждении'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status === 'Утверждена' ? 'Заявка утверждена' : request.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                              -
                            </span>
                          )}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'daysInStatus') {
                      // Показываем только для закупок на вкладке "в работе"
                      if (activeTab !== 'in-work') {
                        return null;
                      }
                      return (
                        <td 
                          key={columnKey} 
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-center"
                        >
                          {request.requiresPurchase !== false && request.daysInStatus !== null && request.daysInStatus !== undefined ? (
                            <span>{request.daysInStatus}</span>
                          ) : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'isStrategicProduct') {
                      return (
                        <td 
                          key={columnKey} 
                          className="px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('isStrategicProduct')}px`, minWidth: `${getColumnWidth('isStrategicProduct')}px`, maxWidth: `${getColumnWidth('isStrategicProduct')}px` }}
                        >
                          {request.isStrategicProduct ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Да
                            </span>
                          ) : request.isStrategicProduct === false ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Нет
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                              -
                            </span>
                          )}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'daysSinceCreation') {
                      return (
                        <td 
                          key={columnKey} 
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-center"
                          style={{ 
                            width: `${getColumnWidth(columnKey)}px`,
                            minWidth: `${getColumnWidth(columnKey)}px`,
                            maxWidth: `${getColumnWidth(columnKey)}px`
                          }}
                        >
                          {request.daysSinceCreation !== null && request.daysSinceCreation !== undefined ? (
                            <span>{request.daysSinceCreation}</span>
                          ) : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'createdAt') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('createdAt')}px`, minWidth: `${getColumnWidth('createdAt')}px`, maxWidth: `${getColumnWidth('createdAt')}px` }}
                        >
                          {request.createdAt ? new Date(request.createdAt).toLocaleString('ru-RU') : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'updatedAt') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('updatedAt')}px`, minWidth: `${getColumnWidth('updatedAt')}px`, maxWidth: `${getColumnWidth('updatedAt')}px` }}
                        >
                          {request.updatedAt ? new Date(request.updatedAt).toLocaleString('ru-RU') : '-'}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'track') {
                      return (
                        <td key={columnKey} className="px-2 py-2 text-xs border-r border-gray-200">
                    <div className="flex items-end gap-2">
                      {/* Заявка - активна */}
                      <div className="flex flex-col items-center gap-0.5">
                        {request.status === 'Спецификация подписана' || request.status === 'Договор подписан' || request.status === 'Закупка создана' ? (
                          <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title={
                            request.status === 'Спецификация подписана' ? "Заявка: Спецификация подписана" :
                            request.status === 'Договор подписан' ? "Заявка: Договор подписан" :
                            "Заявка: Закупка создана"
                          }>
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : request.status === 'Утверждена' || request.status === 'Заявка утверждена' || request.status === 'Спецификация создана' ? (
                          <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title={
                            request.status === 'Спецификация создана' ? "Заявка: Спецификация создана" :
                            "Заявка утверждена"
                          }>
                            <Clock className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : request.status === 'Заявка не утверждена' || request.status === 'Заявка не согласована' || request.status === 'Закупка не согласована' ? (
                          <div className="relative w-4 h-4 rounded-full bg-red-500 flex items-center justify-center" title={
                            request.status === 'Закупка не согласована' ? "Заявка: Закупка не согласована" :
                            "Заявка: Заявка не утверждена или Заявка не согласована"
                          }>
                            <X className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title="Заявка">
                            <Clock className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className="text-[10px] text-gray-600 whitespace-nowrap leading-none">Заявка</span>
                      </div>
                      
                      {/* Если закупка требуется: Заявка → Закупка → Договор */}
                      {request.requiresPurchase !== false ? (
                        <>
                          {/* Закупка - зеленая галочка если связанная закупка со статусом "Завершена" */}
                          <div className="flex flex-col items-center gap-0.5">
                            {request.hasCompletedPurchase ? (
                              <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5" title="Закупка: Завершена">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            ) : request.status === 'Закупка создана' ? (
                              <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Закупка: Закупка создана">
                                <Clock className="w-2.5 h-2.5 text-white" />
                              </div>
                            ) : request.status === 'Закупка не согласована' ? (
                              <div className="relative w-4 h-4 rounded-full bg-red-500 flex items-center justify-center mt-0.5" title="Закупка: Закупка не согласована">
                                <X className="w-2.5 h-2.5 text-white" />
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Закупка"></div>
                            )}
                            <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Закупка</span>
                          </div>
                          {/* Договор - желтая галочка если связанная закупка со статусом "Завершена" */}
                          <div className="flex flex-col items-center gap-0.5">
                            {request.hasCompletedPurchase ? (
                              <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Договор: Закупка завершена">
                                <Clock className="w-2.5 h-2.5 text-white" />
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Договор"></div>
                            )}
                            <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Договор</span>
                          </div>
                        </>
                      ) : (
                        /* Если закупка не требуется: Заявка → Заказ */
                        <div className="flex flex-col items-center gap-0.5">
                          {request.status === 'Спецификация подписана' || request.status === 'Договор подписан' ? (
                            <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5" title={request.status === 'Спецификация подписана' ? "Заказ: Спецификация подписана" : "Заявка: Договор подписан"}>
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          ) : request.status === 'Спецификация создана' ? (
                            <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5" title="Заказ: Спецификация создана">
                              <Clock className="w-2.5 h-2.5 text-white" />
                            </div>
                          ) : (
                          <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Заказ"></div>
                          )}
                          <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Заказ</span>
                        </div>
                      )}
                    </div>
                        </td>
                      );
                    }
                    
                    return null;
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={filteredColumnOrder.length} className="px-6 py-8 text-center text-gray-500">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

