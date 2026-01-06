'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Download, Settings, Plus, X } from 'lucide-react';
import GanttChart from './GanttChart';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';

interface PurchasePlanItem {
  id: number;
  guid: string;
  year: number | null;
  company: string | null;
  cfo: string | null;
  purchaseSubject: string | null;
  budgetAmount: number | null;
  contractEndDate: string | null;
  requestDate: string | null;
  newContractDate: string | null;
  purchaser: string | null;
  product: string | null;
  hasContract: boolean | null;
  currentKa: string | null;
  currentAmount: number | null;
  currentContractAmount: number | null;
  currentContractBalance: number | null;
  currentContractEndDate: string | null;
  autoRenewal: boolean | null;
  complexity: string | null;
  holding: string | null;
  category: string | null;
  status: string | null;
  purchaseRequestId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseRequest {
  idPurchaseRequest: number;
  name: string | null;
  budgetAmount: number | null;
  contractDurationMonths: number | null;
  cfo: string | null;
  purchaseRequestInitiator: string | null;
  costType: string | null;
  contractType: string | null;
  requiresPurchase: boolean | null;
  isPlanned: boolean | null;
  innerId: string | null;
  title: string | null;
  [key: string]: any;
}

interface PageResponse {
  content: PurchasePlanItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort: { sorted: boolean; unsorted: boolean; empty: boolean };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  sort?: { sorted: boolean; unsorted: boolean; empty: boolean };
}

type SortField = keyof PurchasePlanItem | null;
type SortDirection = 'asc' | 'desc' | null;

// Ключ для сохранения фильтров в localStorage
const FILTERS_STORAGE_KEY = 'purchasePlanItems_filters';
const COLUMNS_VISIBILITY_STORAGE_KEY = 'purchasePlanItems_columnsVisibility';

// Константы для статусов
const ALL_STATUSES = ['Проект', 'В плане', 'Исключена', 'Заявка', 'Пусто'];
const DEFAULT_STATUSES = ALL_STATUSES.filter(s => s !== 'Исключена');

// Определение всех возможных колонок (все поля сущности PurchasePlanItem)
const ALL_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'guid', label: 'GUID' },
  { key: 'year', label: 'Год' },
  { key: 'company', label: 'Компания' },
  { key: 'cfo', label: 'ЦФО' },
  { key: 'purchaseSubject', label: 'Предмет закупки' },
  { key: 'budgetAmount', label: 'Бюджет (UZS)' },
  { key: 'requestDate', label: 'Дата заявки' },
  { key: 'newContractDate', label: 'Дата завершения закупки' },
  { key: 'purchaser', label: 'Закупщик' },
  { key: 'product', label: 'Продукция' },
  { key: 'hasContract', label: 'Есть договор' },
  { key: 'currentKa', label: 'КА действующего' },
  { key: 'currentAmount', label: 'Сумма текущего' },
  { key: 'currentContractAmount', label: 'Сумма текущего договора' },
  { key: 'currentContractBalance', label: 'Остаток текущего договора' },
  { key: 'currentContractEndDate', label: 'Дата окончания действующего' },
  { key: 'autoRenewal', label: 'Автопролонгация' },
  { key: 'complexity', label: 'Сложность' },
  { key: 'holding', label: 'Холдинг' },
  { key: 'category', label: 'Категория' },
  { key: 'status', label: 'Статус' },
  { key: 'purchaseRequestId', label: 'Заявка на закупку' },
  { key: 'createdAt', label: 'Дата создания' },
  { key: 'updatedAt', label: 'Дата обновления' },
] as const;

// Колонки, которые отображаются по умолчанию
const DEFAULT_VISIBLE_COLUMNS = [
  'id',
  'company',
  'purchaseRequestId',
  'cfo',
  'purchaseSubject',
  'purchaser',
  'budgetAmount',
  'requestDate',
  'newContractDate',
  'status',
];

export default function PurchasePlanItemsTable() {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set()); // Множество выбранных месяцев: -1 = без даты, 0-11 = месяц (0=январь, 11=декабрь)
  const [selectedMonthYear, setSelectedMonthYear] = useState<number | null>(null); // Год для фильтра по месяцу (если отличается от selectedYear)
  const [lastSelectedMonthIndex, setLastSelectedMonthIndex] = useState<number | null>(null); // Индекс последнего выбранного месяца для Shift+клик
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]); // Список компаний с бэкенда
  
  // Состояние для сортировки
  const [sortField, setSortField] = useState<SortField>('requestDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Состояние для фильтров
  const [filters, setFilters] = useState<Record<string, string>>({
    company: '',
    cfo: '',
    purchaseSubject: '',
    currentContractEndDate: '',
    purchaseRequestId: '',
  });

  // Состояние для множественных фильтров (чекбоксы)
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<Set<string>>(new Set(['Uzum Market']));
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
      console.error('Error loading initial purchaserFilter from localStorage:', err);
    }
    return new Set<string>();
  });
  
  // Состояние для открытия/закрытия выпадающих списков
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isPurchaserFilterOpen, setIsPurchaserFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  
  // Поиск внутри фильтров
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [purchaserSearchQuery, setPurchaserSearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  
  // Позиции для выпадающих списков
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [companyFilterPosition, setCompanyFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [categoryFilterPosition, setCategoryFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserFilterPosition, setPurchaserFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusFilterPosition, setStatusFilterPosition] = useState<{ top: number; left: number } | null>(null);
  
  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  const companyFilterButtonRef = useRef<HTMLButtonElement>(null);
  const categoryFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserFilterButtonRef = useRef<HTMLButtonElement>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null);
  
  // Состояние для видимости колонок (объявлено до использования в useEffect)
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
          let columnsUpdated = false;
          // Если 'id' отсутствует в сохраненных колонках, добавляем его перед 'company'
          if (!filteredColumns.includes('id') && DEFAULT_VISIBLE_COLUMNS.includes('id')) {
            const companyIndex = filteredColumns.indexOf('company');
            if (companyIndex >= 0) {
              filteredColumns.splice(companyIndex, 0, 'id');
            } else {
              filteredColumns.unshift('id');
            }
            columnsUpdated = true;
          }
          // Если 'company' отсутствует в сохраненных колонках, добавляем его после 'id'
          if (!filteredColumns.includes('company') && DEFAULT_VISIBLE_COLUMNS.includes('company')) {
            const idIndex = filteredColumns.indexOf('id');
            if (idIndex >= 0) {
              filteredColumns.splice(idIndex + 1, 0, 'company');
            } else {
              // Если 'id' тоже нет, добавляем 'company' в начало
              filteredColumns.unshift('company');
            }
            columnsUpdated = true;
          }
          // Сохраняем обновленный список в localStorage, если были изменения
          if (columnsUpdated) {
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

  // Состояние для открытия меню выбора колонок (объявлено до использования в useEffect)
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const columnsMenuButtonRef = useRef<HTMLButtonElement>(null);
  
  // Функция для загрузки редакций
  const loadVersions = async () => {
    if (!selectedYear) {
      setVersions([]);
      return;
    }
    setLoadingVersions(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-versions/year/${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
        // Автоматически выбираем текущую версию, если она есть
        const currentVersion = data.find((v: any) => v.isCurrent);
        if (currentVersion && !selectedVersionId) {
          setSelectedVersionId(currentVersion.id);
          setSelectedVersionInfo(currentVersion);
        }
      } else {
        console.error('Error loading versions');
        setVersions([]);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };
  
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
  
  // Обновляем позицию при открытии фильтра компаний
  useEffect(() => {
    if (isCompanyFilterOpen && companyFilterButtonRef.current) {
      const position = calculateFilterPosition(companyFilterButtonRef);
      setCompanyFilterPosition(position);
    }
  }, [isCompanyFilterOpen, calculateFilterPosition]);

  // Обновляем позицию при открытии фильтра категории
  useEffect(() => {
    if (isCategoryFilterOpen && categoryFilterButtonRef.current) {
      const position = calculateFilterPosition(categoryFilterButtonRef);
      setCategoryFilterPosition(position);
    }
  }, [isCategoryFilterOpen, calculateFilterPosition]);

  // Обновляем позицию при открытии фильтра закупщиков
  useEffect(() => {
    if (isPurchaserFilterOpen && purchaserFilterButtonRef.current) {
      const position = calculateFilterPosition(purchaserFilterButtonRef);
      setPurchaserFilterPosition(position);
    }
  }, [isPurchaserFilterOpen, calculateFilterPosition]);

  // Обновляем позицию при открытии фильтра статуса
  useEffect(() => {
    if (isStatusFilterOpen && statusFilterButtonRef.current) {
      const position = calculateFilterPosition(statusFilterButtonRef);
      setStatusFilterPosition(position);
    }
  }, [isStatusFilterOpen, calculateFilterPosition]);

  // Закрываем меню фильтра статуса при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isStatusFilterOpen) {
        const target = event.target as Node;
        // Проверяем, что клик не по кнопке фильтра
        if (statusFilterButtonRef.current && !statusFilterButtonRef.current.contains(target)) {
          // Проверяем, что клик не по самому меню фильтра статуса
          const statusMenuElement = document.querySelector('[data-status-filter-menu="true"]');
          if (statusMenuElement && !statusMenuElement.contains(target)) {
            setIsStatusFilterOpen(false);
          }
        }
      }
    };

    if (isStatusFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isStatusFilterOpen]);

  // Обновляем позицию при открытии меню выбора колонок
  useEffect(() => {
    if (isColumnsMenuOpen && columnsMenuButtonRef.current) {
      const position = calculateFilterPosition(columnsMenuButtonRef);
      setColumnsMenuPosition(position);
    }
  }, [isColumnsMenuOpen, calculateFilterPosition]);

  // Сохраняем видимость колонок в localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(COLUMNS_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
      } catch (err) {
        console.error('Error saving column visibility to localStorage:', err);
      }
    }
  }, [visibleColumns]);

  // Закрываем меню выбора колонок при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isColumnsMenuOpen && columnsMenuButtonRef.current && !columnsMenuButtonRef.current.contains(event.target as Node)) {
        const menuElement = document.querySelector('.fixed.z-50.w-64.bg-white.border.border-gray-300');
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setIsColumnsMenuOpen(false);
        }
      }
    };

    if (isColumnsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isColumnsMenuOpen]);

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

  // Локальное состояние для текстовых фильтров
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    company: '',
    purchaseSubject: '',
    currentContractEndDate: '',
    purchaseRequestId: '',
  });

  // ID активного поля для восстановления фокуса
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Состояние для ширин колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeColumn = useRef<string | null>(null);

  // Состояние для временных дат при перетаскивании Ганта
  const [tempDates, setTempDates] = useState<Record<number, { requestDate: string | null; newContractDate: string | null }>>({});
  const [animatingDates, setAnimatingDates] = useState<Record<number, boolean>>({});
  
  // Состояние для редактирования дат
  const [editingDate, setEditingDate] = useState<{ itemId: number; field: 'requestDate' } | null>(null);
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const statusSelectRef = useRef<HTMLSelectElement | null>(null);
  const [editingHolding, setEditingHolding] = useState<number | null>(null);
  const holdingSelectRef = useRef<HTMLSelectElement | null>(null);
  const [editingCompany, setEditingCompany] = useState<number | null>(null);
  const companySelectRef = useRef<HTMLSelectElement | null>(null);
  const [editingCfo, setEditingCfo] = useState<number | null>(null);
  const [creatingNewCfo, setCreatingNewCfo] = useState<number | null>(null);
  const cfoSelectRef = useRef<HTMLSelectElement | null>(null);
  const cfoInputRef = useRef<HTMLInputElement | null>(null);
  const [cfoInputValue, setCfoInputValue] = useState<Record<number, string>>({});
  const [editingPurchaseRequestId, setEditingPurchaseRequestId] = useState<number | null>(null);
  const purchaseRequestIdInputRef = useRef<HTMLInputElement | null>(null);
  const [editingPurchaseSubject, setEditingPurchaseSubject] = useState<number | null>(null);
  const purchaseSubjectInputRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Состояние для раскрытых строк
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Состояние для активной вкладки в раскрытых строках
  const [activeTab, setActiveTab] = useState<Record<number, 'data' | 'changes' | 'purchaseRequest'>>({});
  
  // Состояние для изменений
  const [changesData, setChangesData] = useState<Record<number, {
    content: any[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    loading: boolean;
  }>>({});
  
  // Состояние для данных заявок на закупку
  const [purchaseRequestData, setPurchaseRequestData] = useState<Record<number, {
    data: PurchaseRequest | null;
    loading: boolean;
  }>>({});
  
  // Функция для загрузки изменений
  const fetchChanges = useCallback(async (itemId: number, page: number) => {
    setChangesData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/changes?page=${page}&size=10`);
      if (response.ok) {
        const data = await response.json();
        setChangesData(prev => ({
          ...prev,
          [itemId]: {
            content: data.content || [],
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 0,
            currentPage: page,
            loading: false
          }
        }));
      } else {
        setChangesData(prev => ({
          ...prev,
          [itemId]: { ...prev[itemId], loading: false }
        }));
      }
    } catch (error) {
      console.error('Error fetching changes:', error);
      setChangesData(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], loading: false }
      }));
    }
  }, []);
  
  // Функция для загрузки данных заявки на закупку
  const fetchPurchaseRequest = useCallback(async (itemId: number, purchaseRequestId: number) => {
    setPurchaseRequestData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-requests/by-id-purchase-request/${purchaseRequestId}`);
      if (response.ok) {
        const data = await response.json();
        setPurchaseRequestData(prev => ({
          ...prev,
          [itemId]: {
            data: data,
            loading: false
          }
        }));
      } else {
        setPurchaseRequestData(prev => ({
          ...prev,
          [itemId]: { data: null, loading: false }
        }));
      }
    } catch (error) {
      console.error('Error fetching purchase request:', error);
      setPurchaseRequestData(prev => ({
        ...prev,
        [itemId]: { data: null, loading: false }
      }));
    }
  }, []);
  
  // Обработчик клика на строку для раскрытия/сворачивания
  const handleRowClick = useCallback((itemId: number, e: React.MouseEvent) => {
    // Не раскрываем, если клик был на интерактивном элементе (input, button, ссылка, область Ганта, select и т.д.)
    const target = e.target as HTMLElement;
    if (target.closest('input, button, a, [role="button"], [data-gantt-chart], select, [data-editing-status], [data-editing-holding], [data-editing-purchase-subject]')) {
      return;
    }
    
    // Проверяем, не кликнули ли на область Ганта (по классу или родительскому элементу)
    const ganttContainer = target.closest('.gantt-container, [class*="GanttChart"]');
    if (ganttContainer) {
      return;
    }
    
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Состояние для подтверждения изменений (повторный ввод логина/пароля)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<PurchasePlanItem>>({
    year: selectedYear || (new Date().getFullYear() + 1),
    company: 'Uzum Market',
    status: 'Проект',
  });
  
  // Состояния для версий плана закупок
  const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false);
  const [isVersionsListModalOpen, setIsVersionsListModalOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionDescription, setVersionDescription] = useState('');
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [selectedVersionInfo, setSelectedVersionInfo] = useState<any | null>(null);
  
  // Проверка, просматривается ли архивная версия (не текущая)
  const isViewingArchiveVersion = selectedVersionId !== null && selectedVersionInfo !== null && !selectedVersionInfo.isCurrent;
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
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
  
  // Проверка, может ли пользователь редактировать (только admin)
  const canEdit = userRole === 'admin';
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<{ 
    itemId: number;
    field: 'requestDate' | 'newContractDate';
    newDate: string;
    // Для перетаскивания Ганта - сохраняем старые и новые значения обоих полей
    oldRequestDate?: string | null;
    oldNewContractDate?: string | null;
    newRequestDate?: string | null;
    newNewContractDate?: string | null;
  } | null>(null);
  
  // Автоматически открываем календарь при появлении input
  useEffect(() => {
    if (editingDate) {
      // Используем небольшой таймаут для гарантии, что input уже отрендерен
      setTimeout(() => {
        // Ищем активный input по data-атрибуту
        const activeInput = document.querySelector(
          `input[type="date"][data-editing-date="${editingDate.itemId}-${editingDate.field}"]`
        ) as HTMLInputElement;
        
        if (activeInput) {
          // Пробуем использовать showPicker() если доступно (современные браузеры)
          if ('showPicker' in activeInput && typeof (activeInput as any).showPicker === 'function') {
            try {
              (activeInput as any).showPicker();
            } catch (e) {
              // Если showPicker не поддерживается, используем click()
              activeInput.click();
            }
          } else {
            // Для старых браузеров используем click()
            activeInput.click();
          }
        }
      }, 10);
    }
  }, [editingDate]);
  
  // Функция для обновления дат через перетаскивание Ганта
  const performGanttDateUpdate = async (itemId: number, requestDate: string | null, newContractDate: string | null) => {
    const item = data?.content.find(i => i.id === itemId);
    if (!item) return;
    
    // Сохраняем исходные значения для возможного отката
    const oldRequestDate = item.requestDate;
    const oldNewContractDate = item.newContractDate;
    
    try {
      
      // Нормализуем даты (убираем время, если есть)
      let normalizedRequestDate = requestDate ? requestDate.split('T')[0] : null;
      let normalizedNewContractDate = newContractDate ? newContractDate.split('T')[0] : null;
      
      // Если изменяется дата заявки и есть сложность, автоматически пересчитываем дату нового договора
      if (normalizedRequestDate && item.complexity && requestDate !== item.requestDate) {
        const calculatedDate = calculateNewContractDate(normalizedRequestDate, item.complexity);
        if (calculatedDate) {
          normalizedNewContractDate = calculatedDate;
        }
      }
      
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/dates`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestDate: normalizedRequestDate,
          newContractDate: normalizedNewContractDate,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        console.log('Gantt dates updated successfully:', updatedItem);
        // Обновляем данные в таблице
        if (data) {
          const updatedContent = data.content.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
          setData({ ...data, content: updatedContent });
        }
        // Обновляем данные для диаграммы в таблице
        setChartData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        // Обновляем данные для сводной таблицы
        setSummaryData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        // Отправляем событие для обновления диаграммы
        window.dispatchEvent(new CustomEvent('purchasePlanItemDatesUpdated', {
          detail: { itemId, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
        }));
        // Убираем временные даты
        setTempDates(prev => {
          const newTemp = { ...prev };
          delete newTemp[itemId];
          return newTemp;
        });
        // Останавливаем анимацию через небольшую задержку
        setTimeout(() => {
          setAnimatingDates(prev => {
            const newAnimating = { ...prev };
            delete newAnimating[itemId];
            return newAnimating;
          });
        }, 500);
      } else {
        const errorText = await response.text();
        console.error('Failed to update gantt dates:', response.status, errorText);
        // Откатываем изменения при ошибке
        if (data) {
          const updatedContent = data.content.map(i => 
            i.id === itemId 
              ? { 
                  ...i, 
                  requestDate: oldRequestDate, 
                  newContractDate: oldNewContractDate 
                }
              : i
          );
          setData({ ...data, content: updatedContent });
        }
      }
    } catch (error) {
      console.error('Error updating gantt dates:', error);
      // Откатываем изменения при ошибке
      if (data) {
        const updatedContent = data.content.map(i => 
          i.id === itemId 
            ? { 
                ...i, 
                requestDate: oldRequestDate, 
                newContractDate: oldNewContractDate 
              }
            : i
        );
        setData({ ...data, content: updatedContent });
      }
    }
  };

  // Низкоуровневая функция обновления даты на бэкенде (вызывается после успешной повторной аутентификации)
  const performDateUpdate = async (itemId: number, field: 'requestDate' | 'newContractDate', newDate: string) => {
    if (!newDate || newDate.trim() === '') return;
    
    try {
      const item = data?.content.find(i => i.id === itemId);
      if (!item) return;
      
      // Нормализуем дату (убираем время, если есть)
      const normalizedDate = newDate.split('T')[0];
      
      // Получаем текущие даты и обновляем нужное поле
      const currentRequestDate = item.requestDate ? item.requestDate.split('T')[0] : null;
      const currentNewContractDate = item.newContractDate ? item.newContractDate.split('T')[0] : null;
      
      let requestDate = field === 'requestDate' ? normalizedDate : currentRequestDate;
      let newContractDate = field === 'newContractDate' ? normalizedDate : currentNewContractDate;
      
      // Если изменяется дата заявки, автоматически пересчитываем дату нового договора на основе сложности
      if (field === 'requestDate' && item.complexity) {
        const calculatedDate = calculateNewContractDate(normalizedDate, item.complexity);
        if (calculatedDate) {
          newContractDate = calculatedDate;
        }
      }
      
      console.log('Updating date:', { itemId, field, newDate, normalizedDate, requestDate, newContractDate });
      
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/dates`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestDate,
          newContractDate,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        console.log('Date updated successfully:', updatedItem);
        // Обновляем данные в таблице
        if (data) {
          const updatedContent = data.content.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
          setData({ ...data, content: updatedContent });
        }
        // Обновляем данные для диаграммы в таблице
        setChartData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        // Обновляем данные для сводной таблицы
        setSummaryData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
              : i
          );
        });
        // Отправляем событие для обновления диаграммы
        window.dispatchEvent(new CustomEvent('purchasePlanItemDatesUpdated', {
          detail: { itemId, requestDate: updatedItem.requestDate, newContractDate: updatedItem.newContractDate }
        }));
        // Запускаем анимацию
        setAnimatingDates(prev => ({
          ...prev,
          [itemId]: true
        }));
        setTimeout(() => {
          setAnimatingDates(prev => {
            const newState = { ...prev };
            delete newState[itemId];
            return newState;
          });
        }, 1000);
        // Закрываем режим редактирования
        setEditingDate(null);
      } else {
        const errorText = await response.text();
        console.error('Failed to update date:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error updating date:', error);
    }
  };

  // Обертка: сразу сохраняем изменения без проверки пароля
  const handleDateUpdate = (itemId: number, field: 'requestDate', newDate: string) => {
    if (!newDate || newDate.trim() === '') return;
    // Сразу сохраняем изменения без проверки пароля
    performDateUpdate(itemId, field, newDate);
  };

  // Функция для обновления статуса
  const handleStatusUpdate = async (itemId: number, newStatus: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        console.log('Status updated successfully:', updatedItem);
        // Обновляем данные в таблице
        if (data) {
          const updatedContent = data.content.map(i => 
            i.id === itemId 
              ? { ...i, status: updatedItem.status }
              : i
          );
          setData({ ...data, content: updatedContent });
        }
        // Обновляем данные для диаграммы в таблице
        setChartData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, status: updatedItem.status }
              : i
          );
        });
        // Обновляем данные для сводной таблицы
        setSummaryData(prev => {
          if (!prev) return prev;
          return prev.map(i => 
            i.id === itemId 
              ? { ...i, status: updatedItem.status }
              : i
          );
        });
        setEditingStatus(null);
      } else {
        const errorText = await response.text();
        console.error('Failed to update status:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Функция для обновления холдинга
  const handleHoldingUpdate = async (itemId: number, newHolding: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/holding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holding: newHolding || null,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        console.log('Holding updated successfully:', updatedItem);
        // Обновляем данные в таблице
        if (data) {
          const updatedContent = data.content.map(i => 
            i.id === itemId 
              ? { ...i, holding: updatedItem.holding }
              : i
          );
          setData({ ...data, content: updatedContent });
        }
        setEditingHolding(null);
      } else {
        const errorText = await response.text();
        console.error('Failed to update holding:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error updating holding:', error);
    } finally {
    }
  };

  const handleCompanyUpdate = async (itemId: number, newCompany: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/company`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company: newCompany || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingCompany(null);
        
        // Обновляем только конкретную строку в локальном состоянии
        if (data) {
          // Проверяем, подходит ли обновленная строка под фильтр компании
          const normalizedNewCompany = newCompany ? newCompany.trim() : null;
          const shouldShowItem = companyFilter.size === 0 || (normalizedNewCompany && companyFilter.has(normalizedNewCompany));
          
          if (shouldShowItem) {
            // Обновляем строку в таблице
            const updatedContent = data.content.map(item => 
              item.id === itemId 
                ? { ...item, company: updatedItem.company, updatedAt: updatedItem.updatedAt }
                : item
            );
            setData({ ...data, content: updatedContent });
          } else {
            // Удаляем строку из отображаемых данных, так как она не подходит под фильтр
            const updatedContent = data.content.filter(item => item.id !== itemId);
            const newTotalElements = Math.max(0, (data.totalElements || 0) - 1);
            const newTotalPages = Math.ceil(newTotalElements / pageSize);
            setData({ 
              ...data, 
              content: updatedContent,
              totalElements: newTotalElements,
              totalPages: newTotalPages
            });
            
            // Если удалили последний элемент на странице и это не первая страница, переходим на предыдущую
            if (updatedContent.length === 0 && currentPage > 0) {
              setCurrentPage(currentPage - 1);
            }
          }
        }
        
        // Обновляем данные для диаграммы в таблице
        const normalizedNewCompany = newCompany ? newCompany.trim() : null;
        const shouldShowInChart = companyFilter.size === 0 || (normalizedNewCompany && companyFilter.has(normalizedNewCompany));
        
        setChartData(prev => {
          if (!prev) return prev;
          
          if (shouldShowInChart) {
            // Обновляем строку в chartData
            return prev.map(item => 
              item.id === itemId 
                ? { ...item, company: updatedItem.company, updatedAt: updatedItem.updatedAt }
                : item
            );
          } else {
            // Удаляем строку из chartData, так как она не подходит под фильтр
            return prev.filter(item => item.id !== itemId);
          }
        });
        
        // Обновляем данные для сводной таблицы с учетом фильтра по компании
        const normalizedNewCompanyForSummary = newCompany ? newCompany.trim() : null;
        const shouldShowInSummary = companyFilter.size === 0 || (normalizedNewCompanyForSummary && companyFilter.has(normalizedNewCompanyForSummary));
        
        setSummaryData(prev => {
          if (!prev) return prev;
          
          // Проверяем, есть ли запись в summaryData
          const existingItem = prev.find(item => item.id === itemId);
          
          if (shouldShowInSummary) {
            // Если запись должна быть в сводной таблице
            if (existingItem) {
              // Обновляем существующую запись
              return prev.map(item => 
                item.id === itemId 
                  ? { ...item, company: updatedItem.company, updatedAt: updatedItem.updatedAt }
                  : item
              );
            } else {
              // Добавляем новую запись (если её не было, но теперь она соответствует фильтру)
              // Используем данные из data или chartData, если они есть
              const fullItem = data?.content.find(i => i.id === itemId) || chartData.find(i => i.id === itemId);
              if (fullItem) {
                // Используем полные данные из data или chartData и обновляем компанию
                return [...prev, { ...fullItem, company: updatedItem.company, updatedAt: updatedItem.updatedAt }];
              }
              // Если полных данных нет, возвращаем prev (запись будет добавлена при следующей загрузке)
              return prev;
            }
          } else {
            // Если запись больше не должна быть в сводной таблице, удаляем её
            return prev.filter(item => item.id !== itemId);
          }
        });
        
        // Отправляем событие для обновления столбчатой диаграммы (как при изменении дат)
        window.dispatchEvent(new CustomEvent('purchasePlanItemDatesUpdated', {
          detail: { itemId, field: 'company', newValue: newCompany }
        }));
        
        // Также отправляем событие с актуальным фильтром компании, чтобы диаграмма использовала правильный фильтр
        window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
          detail: { companyFilter: Array.from(companyFilter) }
        }));
      } else {
        const errorText = await response.text();
        console.error('Failed to update company:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error updating company:', error);
    } finally {
      setEditingHolding(null);
    }
  };

  // Функция для добавления рабочих дней к дате (исключая выходные: суббота и воскресенье)
  const addWorkingDays = (date: Date, workingDays: number): Date => {
    const result = new Date(date);
    let daysAdded = 0;
    
    while (daysAdded < workingDays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay(); // 0 = воскресенье, 6 = суббота
      // Пропускаем выходные (суббота и воскресенье)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
    
    return result;
  };

  // Функция для получения количества рабочих дней на основе сложности
  const getWorkingDaysByComplexity = (complexity: string | null | undefined): number | null => {
    if (!complexity) return null;
    const complexityNum = parseInt(complexity);
    switch (complexityNum) {
      case 1: return 7;
      case 2: return 14;
      case 3: return 22;
      case 4: return 50;
      default: return null;
    }
  };

  // Функция для расчета даты нового договора на основе сложности и даты заявки
  const calculateNewContractDate = (requestDate: string | null, complexity: string | null): string | null => {
    if (!requestDate || !complexity) return null;
    
    const workingDays = getWorkingDaysByComplexity(complexity);
    if (!workingDays) return null;
    
    try {
      // Парсим дату в формате YYYY-MM-DD (input type="date" возвращает такой формат)
      const requestDateObj = new Date(requestDate + 'T00:00:00');
      if (isNaN(requestDateObj.getTime())) return null;
      
      const newContractDateObj = addWorkingDays(requestDateObj, workingDays);
      // Форматируем дату обратно в YYYY-MM-DD
      const year = newContractDateObj.getFullYear();
      const month = String(newContractDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(newContractDateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  };

  const handleCreateItem = async () => {
    try {
      // Подготавливаем данные для отправки
      const dataToSend: any = {
        year: newItemData.year || (selectedYear || (new Date().getFullYear() + 1)),
        company: newItemData.company || null,
        cfo: newItemData.cfo || null,
        purchaseSubject: newItemData.purchaseSubject || null,
        budgetAmount: newItemData.budgetAmount || null,
        requestDate: newItemData.requestDate || null,
        newContractDate: newItemData.newContractDate || null,
        purchaser: newItemData.purchaser || null,
        complexity: newItemData.complexity || null,
        status: newItemData.status || 'Проект',
      };

      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const createdItem = await response.json();
        setIsCreateModalOpen(false);
        setNewItemData({
          year: selectedYear || (new Date().getFullYear() + 1),
          company: 'Uzum Market',
          status: 'Проект',
          complexity: null,
          requestDate: null,
          newContractDate: null,
        });
        
        // Обновляем данные таблицы
        fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters, selectedMonths);
      } else {
        const errorText = await response.text();
        setErrorModal({ isOpen: true, message: errorText || 'Ошибка при создании строки плана закупок' });
      }
    } catch (error) {
      console.error('Error creating purchase plan item:', error);
      setErrorModal({ isOpen: true, message: 'Ошибка при создании строки плана закупок' });
    }
  };

  const handleCfoUpdate = async (itemId: number, newCfo: string | null) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/cfo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cfo: newCfo || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingCfo(null);
        setCreatingNewCfo(null);
        // Очищаем значение input
        setCfoInputValue(prev => {
          const newValue = { ...prev };
          delete newValue[itemId];
          return newValue;
        });
        
        // Обновляем только конкретную строку в локальном состоянии
        if (data) {
          // Проверяем, подходит ли обновленная строка под фильтр ЦФО
          const normalizedNewCfo = newCfo ? newCfo.trim() : null;
          const shouldShowItem = cfoFilter.size === 0 || (normalizedNewCfo && cfoFilter.has(normalizedNewCfo));
          
          if (shouldShowItem) {
            // Обновляем строку в таблице
            const updatedContent = data.content.map(item => 
              item.id === itemId 
                ? { ...item, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }
                : item
            );
            setData({ ...data, content: updatedContent });
          } else {
            // Удаляем строку из отображаемых данных, так как она не подходит под фильтр
            const updatedContent = data.content.filter(item => item.id !== itemId);
            const newTotalElements = Math.max(0, (data.totalElements || 0) - 1);
            const newTotalPages = Math.ceil(newTotalElements / pageSize);
            setData({ 
              ...data, 
              content: updatedContent,
              totalElements: newTotalElements,
              totalPages: newTotalPages
            });
            
            // Если удалили последний элемент на странице и это не первая страница, переходим на предыдущую
            if (updatedContent.length === 0 && currentPage > 0) {
              setCurrentPage(currentPage - 1);
            }
          }
        }
        
        // Обновляем данные для диаграммы в таблице
        const normalizedNewCfo = newCfo ? newCfo.trim() : null;
        const shouldShowInChart = cfoFilter.size === 0 || (normalizedNewCfo && cfoFilter.has(normalizedNewCfo));
        
        setChartData(prev => {
          if (!prev) return prev;
          
          if (shouldShowInChart) {
            // Обновляем строку в chartData
            return prev.map(item => 
              item.id === itemId 
                ? { ...item, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }
                : item
            );
          } else {
            // Удаляем строку из chartData, так как она не подходит под фильтр
            return prev.filter(item => item.id !== itemId);
          }
        });
        
        // Обновляем данные для сводной таблицы с учетом фильтра по ЦФО
        const normalizedNewCfoForSummary = newCfo ? newCfo.trim() : null;
        const shouldShowInSummary = cfoFilter.size === 0 || (normalizedNewCfoForSummary && cfoFilter.has(normalizedNewCfoForSummary));
        
        setSummaryData(prev => {
          if (!prev) return prev;
          
          // Проверяем, есть ли запись в summaryData
          const existingItem = prev.find(item => item.id === itemId);
          
          if (shouldShowInSummary) {
            // Если запись должна быть в сводной таблице
            if (existingItem) {
              // Обновляем существующую запись
              return prev.map(item => 
                item.id === itemId 
                  ? { ...item, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }
                  : item
              );
            } else {
              // Добавляем новую запись (если её не было, но теперь она соответствует фильтру)
              // Используем данные из data или chartData, если они есть
              const fullItem = data?.content.find(i => i.id === itemId) || chartData.find(i => i.id === itemId);
              if (fullItem) {
                // Используем полные данные из data или chartData и обновляем ЦФО
                return [...prev, { ...fullItem, cfo: updatedItem.cfo, updatedAt: updatedItem.updatedAt }];
              }
              // Если полных данных нет, возвращаем prev (запись будет добавлена при следующей загрузке)
              return prev;
            }
          } else {
            // Если запись больше не должна быть в сводной таблице, удаляем её
            return prev.filter(item => item.id !== itemId);
          }
        });
        
        // Обновляем уникальные значения для фильтра ЦФО
        if (normalizedNewCfo && !uniqueValues.cfo.includes(normalizedNewCfo)) {
          setUniqueValues(prev => ({
            ...prev,
            cfo: [...prev.cfo, normalizedNewCfo].sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
          }));
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to update cfo:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error updating cfo:', error);
    }
  };

  const handlePurchaseSubjectUpdate = async (itemId: number, newPurchaseSubject: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/purchase-subject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseSubject: newPurchaseSubject || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingPurchaseSubject(null);
        
        // Обновляем только конкретную строку в локальном состоянии
        if (data) {
          const updatedContent = data.content.map(item => 
            item.id === itemId 
              ? { ...item, purchaseSubject: updatedItem.purchaseSubject, updatedAt: updatedItem.updatedAt }
              : item
          );
          setData({ ...data, content: updatedContent });
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to update purchase subject:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error updating purchase subject:', error);
    }
  };

  const handlePurchaseRequestIdUpdate = async (itemId: number, newPurchaseRequestId: string | null) => {
    try {
      const purchaseRequestIdValue = newPurchaseRequestId && newPurchaseRequestId.trim() !== '' 
        ? parseInt(newPurchaseRequestId.trim(), 10) 
        : null;
      
      if (isNaN(purchaseRequestIdValue as any) && purchaseRequestIdValue !== null) {
        console.error('Invalid purchaseRequestId:', newPurchaseRequestId);
        return;
      }

      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/purchase-request-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseRequestId: purchaseRequestIdValue }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingPurchaseRequestId(null);
        
        // Обновляем только конкретную строку в локальном состоянии
        if (data) {
          const updatedContent = data.content.map(item => 
            item.id === itemId 
              ? { ...item, purchaseRequestId: updatedItem.purchaseRequestId, updatedAt: updatedItem.updatedAt }
              : item
          );
          setData({ ...data, content: updatedContent });
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to update purchaseRequestId:', response.status, errorText);
        // Показываем ошибку пользователю во всплывающем окне
        setErrorModal({ isOpen: true, message: errorText || 'Ошибка при обновлении номера заявки на закупку' });
        // Не закрываем режим редактирования, чтобы пользователь мог исправить значение
        return;
      }
    } catch (error) {
      console.error('Error updating purchaseRequestId:', error);
    } finally {
      setEditingPurchaseRequestId(null);
    }
  };

  const handleAuthConfirm = async () => {
    if (!pendingDateChange) return;
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });

      const dataResp = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAuthError(dataResp.error || 'Неверный логин или пароль');
        setAuthLoading(false);
        return;
      }

      // Успешная повторная аутентификация — выполняем изменение
      if (pendingDateChange.newRequestDate !== undefined && pendingDateChange.newNewContractDate !== undefined) {
        // Это изменение через перетаскивание Ганта - обновляем оба поля
        await performGanttDateUpdate(pendingDateChange.itemId, pendingDateChange.newRequestDate, pendingDateChange.newNewContractDate);
      } else {
        // Это изменение через клик по полю даты
        await performDateUpdate(pendingDateChange.itemId, pendingDateChange.field, pendingDateChange.newDate);
      }
      setIsAuthModalOpen(false);
      setPendingDateChange(null);
      setAuthPassword('');
    } catch (err) {
      console.error('Error during re-auth:', err);
      setAuthError('Ошибка при проверке пароля');
    } finally {
      setAuthLoading(false);
    }
  };
  
  // Загружаем сохраненные ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchasePlanItemsTableColumnWidths');
      if (saved) {
        const widths = JSON.parse(saved);
        setColumnWidths(widths);
      }
    } catch (err) {
      console.error('Error loading column widths:', err);
    }
  }, []);

  // Флаг для отслеживания загрузки фильтров из localStorage
  const filtersLoadedRef = useRef(false);

  // Загружаем сохраненные фильтры из localStorage при монтировании (синхронно, до других useEffect)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const savedFilters = JSON.parse(saved);
        
        // Восстанавливаем год
        if (savedFilters.selectedYear !== undefined && savedFilters.selectedYear !== null) {
          setSelectedYear(savedFilters.selectedYear);
        }
        
        // Восстанавливаем выбранные месяцы
        if (savedFilters.selectedMonths !== undefined) {
          setSelectedMonths(new Set(savedFilters.selectedMonths));
        } else if (savedFilters.selectedMonth !== undefined) {
          // Поддержка старого формата (для обратной совместимости)
          setSelectedMonths(savedFilters.selectedMonth !== null ? new Set([savedFilters.selectedMonth]) : new Set());
        }
        // Восстанавливаем год для фильтра по месяцу
        if (savedFilters.selectedMonthYear !== undefined) {
          setSelectedMonthYear(savedFilters.selectedMonthYear);
        }
        
        // Восстанавливаем текстовые фильтры
        if (savedFilters.filters) {
          // Убеждаемся, что все поля присутствуют
          const restoredFilters = {
            company: savedFilters.filters.company || '',
            cfo: savedFilters.filters.cfo || '',
            purchaseSubject: savedFilters.filters.purchaseSubject || '',
            currentContractEndDate: savedFilters.filters.currentContractEndDate || '',
          };
          setFilters(restoredFilters);
          setLocalFilters(restoredFilters);
        } else {
          // Если фильтров нет, устанавливаем пустые значения
          const emptyFilters = {
            company: '',
            cfo: '',
            purchaseSubject: '',
            currentContractEndDate: '',
            purchaseRequestId: '',
          };
          setFilters(emptyFilters);
          setLocalFilters(emptyFilters);
        }
        
        // Восстанавливаем множественные фильтры (Set нужно преобразовать из массива)
        // Важно: восстанавливаем даже пустые массивы, чтобы не потерять состояние "нет выбранных"
        if (savedFilters.cfoFilter !== undefined) {
          if (Array.isArray(savedFilters.cfoFilter)) {
            setCfoFilter(new Set(savedFilters.cfoFilter));
          } else {
            setCfoFilter(new Set());
          }
        }
        if (savedFilters.companyFilter !== undefined) {
          if (Array.isArray(savedFilters.companyFilter) && savedFilters.companyFilter.length > 0) {
            // Нормализуем сохраненные значения компании
            const normalizedCompanyFilter = savedFilters.companyFilter.map((c: string) => normalizeCompany(c)).filter((c: string | null) => c !== null) as string[];
            setCompanyFilter(new Set(normalizedCompanyFilter));
            // Отправляем начальное значение фильтра компании в диаграмму
            window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
              detail: { companyFilter: normalizedCompanyFilter }
            }));
          } else {
            // Если сохраненный фильтр пустой массив, оставляем его пустым (не устанавливаем дефолт)
            setCompanyFilter(new Set());
            window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
              detail: { companyFilter: [] }
            }));
          }
        } else {
          // Если фильтр не сохранен (первая загрузка), устанавливаем фильтр по умолчанию на "Uzum Market"
          setCompanyFilter(new Set(['Uzum Market']));
          window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
            detail: { companyFilter: ['Uzum Market'] }
          }));
        }
        if (savedFilters.categoryFilter !== undefined) {
          if (Array.isArray(savedFilters.categoryFilter)) {
            setCategoryFilter(new Set(savedFilters.categoryFilter));
          } else {
            setCategoryFilter(new Set());
          }
        }
        if (savedFilters.statusFilter !== undefined) {
          if (Array.isArray(savedFilters.statusFilter) && savedFilters.statusFilter.length > 0) {
            setStatusFilter(new Set(savedFilters.statusFilter));
          } else {
            // Если статус фильтр пустой, устанавливаем значения по умолчанию (все кроме Исключена)
            setStatusFilter(new Set(DEFAULT_STATUSES));
          }
        } else {
          // Если статус фильтр не найден, устанавливаем значения по умолчанию (все кроме Исключена)
          setStatusFilter(new Set(DEFAULT_STATUSES));
        }
        
        // Восстанавливаем сортировку
        if (savedFilters.sortField !== undefined) {
          setSortField(savedFilters.sortField);
        }
        if (savedFilters.sortDirection !== undefined) {
          setSortDirection(savedFilters.sortDirection);
        }
        
        // Восстанавливаем размер страницы
        if (savedFilters.pageSize) {
          setPageSize(savedFilters.pageSize);
        }
        
        // Восстанавливаем текущую страницу
        if (savedFilters.currentPage !== undefined) {
          setCurrentPage(savedFilters.currentPage);
        }
        
        filtersLoadedRef.current = true;
      } else {
        // Если нет сохраненных фильтров, помечаем, что загрузка завершена
        filtersLoadedRef.current = true;
        // Отправляем значение по умолчанию фильтра компании в диаграмму
        window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
          detail: { companyFilter: ['Uzum Market'] }
        }));
      }
    } catch (err) {
      console.error('Error loading saved filters:', err);
      filtersLoadedRef.current = true;
    }
  }, []);

  // Сохраняем фильтры в localStorage при их изменении
  // НЕ сохраняем при первой загрузке, пока фильтры не восстановлены из localStorage
  useEffect(() => {
    // Пропускаем сохранение, если фильтры еще не загружены из localStorage
    if (!filtersLoadedRef.current) {
      return;
    }
    
    try {
      const filtersToSave = {
        selectedYear,
        selectedMonths: Array.from(selectedMonths),
        selectedMonthYear,
        filters,
        cfoFilter: Array.from(cfoFilter),
        companyFilter: Array.from(companyFilter),
        categoryFilter: Array.from(categoryFilter),
        purchaserFilter: Array.from(purchaserFilter),
        statusFilter: Array.from(statusFilter),
        sortField,
        sortDirection,
        pageSize,
        currentPage,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (err) {
      console.error('Error saving filters:', err);
    }
  }, [selectedYear, selectedMonths, selectedMonthYear, filters, cfoFilter, companyFilter, purchaserFilter, categoryFilter, statusFilter, sortField, sortDirection, pageSize, currentPage]);
  
  // Сохраняем ширины колонок в localStorage
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem('purchasePlanItemsTableColumnWidths', JSON.stringify(widths));
    } catch (err) {
      console.error('Error saving column widths:', err);
    }
  }, []);
  
  // Функция для получения ширины колонки по умолчанию
  const getDefaultColumnWidth = (columnKey: string): number => {
    const defaults: Record<string, number> = {
      id: 64, // w-16 = 4rem = 64px
      guid: 256, // w-64 = 16rem = 256px
      year: 64, // w-16 = 4rem = 64px
      company: 128, // w-32 = 8rem = 128px
      cfo: 128, // w-32 = 8rem = 128px
      purchaseSubject: 96, // w-24 = 6rem = 96px (уменьшено на 50%)
      budgetAmount: 112, // w-28 = 7rem = 112px
      contractEndDate: 128, // w-32 = 8rem = 128px
      requestDate: 112, // w-28 = 7rem = 112px
      newContractDate: 128, // w-32 = 8rem = 128px
      purchaser: 128, // w-32 = 8rem = 128px
      product: 192, // w-48 = 12rem = 192px
      hasContract: 112, // w-28 = 7rem = 112px
      currentKa: 128, // w-32 = 8rem = 128px
      currentAmount: 128, // w-32 = 8rem = 128px
      currentContractAmount: 160, // w-40 = 10rem = 160px
      currentContractBalance: 160, // w-40 = 10rem = 160px
      currentContractEndDate: 160, // w-40 = 10rem = 160px
      autoRenewal: 128, // w-32 = 8rem = 128px
      complexity: 112, // w-28 = 7rem = 112px
      holding: 128, // w-32 = 8rem = 128px
      category: 128, // w-32 = 8rem = 128px
      status: 128, // w-32 = 8rem = 128px
      purchaseRequestId: 160, // w-40 = 10rem = 160px
      createdAt: 128, // w-32 = 8rem = 128px
      updatedAt: 128, // w-32 = 8rem = 128px
    };
    return defaults[columnKey] || 120;
  };
  
  // Функция для получения текущей ширины колонки
  // Обернута в useCallback для стабильности и использования в getSortableHeaderProps
  const getColumnWidth = useCallback((columnKey: string): number => {
    if (!columnWidths || typeof columnWidths !== 'object') {
      return getDefaultColumnWidth(columnKey);
    }
    return columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  }, [columnWidths]);
  
  // Настройка ReactToPrint для экспорта в PDF
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `План_закупок_${selectedYear || 'Все'}_${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 5mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
        .print-container {
          width: 100% !important;
          max-width: 100% !important;
          overflow: visible !important;
        }
        .print-container table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        /* Сохраняем оригинальные стили из таблицы - не переопределяем font-size и padding */
        .print-container table th.purchase-subject-column,
        .print-container table td.purchase-subject-column,
        .print-container table th[data-column="purchaseSubject"],
        .print-container table td[data-column="purchaseSubject"] {
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      }
    `,
  });

  // Функция для экспорта плана закупок в PDF
  const exportToPDF = () => {
    if (!data?.content || data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }
    handlePrint();
  };

  // Функция для подготовки данных для экспорта в Excel
  const prepareExportData = (items: PurchasePlanItem[]) => {
    return items.map((item) => ({
      'ID': item.id || '',
      'GUID': item.guid || '',
      'Год': item.year || '',
      'Компания': item.company || '',
      'ЦФО': item.cfo || '',
      'Предмет закупки': item.purchaseSubject || '',
      'Бюджет (UZS)': item.budgetAmount || '',
      'Срок окончания договора': item.contractEndDate 
        ? new Date(item.contractEndDate).toLocaleDateString('ru-RU')
        : '',
      'Дата заявки': item.requestDate 
        ? new Date(item.requestDate).toLocaleDateString('ru-RU')
        : '',
      'Дата завершения закупки': item.newContractDate 
        ? new Date(item.newContractDate).toLocaleDateString('ru-RU')
        : '',
      'Закупщик': item.purchaser || '',
      'Продукция': item.product || '',
      'Есть договор': item.hasContract ? 'Да' : (item.hasContract === false ? 'Нет' : ''),
      'КА действующего': item.currentKa || '',
      'Сумма текущего': item.currentAmount || '',
      'Сумма текущего договора': item.currentContractAmount || '',
      'Остаток текущего договора': item.currentContractBalance || '',
      'Дата окончания действующего': item.currentContractEndDate 
        ? new Date(item.currentContractEndDate).toLocaleDateString('ru-RU')
        : '',
      'Автопролонгация': item.autoRenewal ? 'Да' : (item.autoRenewal === false ? 'Нет' : ''),
      'Сложность': item.complexity || '',
      'Холдинг': item.holding || '',
      'Категория': item.category || '',
      'Дата создания': item.createdAt 
        ? new Date(item.createdAt).toLocaleDateString('ru-RU')
        : '',
      'Дата обновления': item.updatedAt 
        ? new Date(item.updatedAt).toLocaleDateString('ru-RU')
        : '',
    }));
  };

  // Функция для экспорта в Excel с примененными фильтрами
  const handleExportToExcelWithFilters = async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      const exportData = prepareExportData(data.content);

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Устанавливаем ширину колонок
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 40 }, // GUID
        { wch: 8 },  // Год
        { wch: 20 }, // Компания
        { wch: 20 }, // ЦФО
        { wch: 40 }, // Предмет закупки
        { wch: 15 }, // Бюджет
        { wch: 20 }, // Срок окончания договора
        { wch: 15 }, // Дата заявки
        { wch: 20 }, // Дата завершения закупки
        { wch: 20 }, // Закупщик
        { wch: 20 }, // Продукция
        { wch: 15 }, // Есть договор
        { wch: 20 }, // КА действующего
        { wch: 15 }, // Сумма текущего
        { wch: 20 }, // Сумма текущего договора
        { wch: 20 }, // Остаток текущего договора
        { wch: 25 }, // Дата окончания действующего
        { wch: 15 }, // Автопролонгация
        { wch: 15 }, // Сложность
        { wch: 20 }, // Холдинг
        { wch: 20 }, // Категория
        { wch: 15 }, // Дата создания
        { wch: 15 }, // Дата обновления
      ];
      ws['!cols'] = colWidths;

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'План закупок');

      // Генерируем имя файла с датой
      const fileName = `План_закупок_с_фильтрами_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    }
  };

  // Функция для экспорта в Excel всех данных без фильтров
  const handleExportToExcelAll = async () => {
    try {
      setLoading(true);
      
      // Загружаем все данные без фильтров
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '100000'); // Большое число для получения всех записей
      // Не передаем никаких фильтров

      const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const result = await response.json();
      
      if (!result.content || result.content.length === 0) {
        alert('Нет данных для экспорта');
        setLoading(false);
        return;
      }

      const exportData = prepareExportData(result.content);

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Устанавливаем ширину колонок
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 40 }, // GUID
        { wch: 8 },  // Год
        { wch: 20 }, // Компания
        { wch: 20 }, // ЦФО
        { wch: 40 }, // Предмет закупки
        { wch: 15 }, // Бюджет
        { wch: 20 }, // Срок окончания договора
        { wch: 15 }, // Дата заявки
        { wch: 20 }, // Дата завершения закупки
        { wch: 20 }, // Закупщик
        { wch: 20 }, // Продукция
        { wch: 15 }, // Есть договор
        { wch: 20 }, // КА действующего
        { wch: 15 }, // Сумма текущего
        { wch: 20 }, // Сумма текущего договора
        { wch: 20 }, // Остаток текущего договора
        { wch: 25 }, // Дата окончания действующего
        { wch: 15 }, // Автопролонгация
        { wch: 15 }, // Сложность
        { wch: 20 }, // Холдинг
        { wch: 20 }, // Категория
        { wch: 15 }, // Дата создания
        { wch: 15 }, // Дата обновления
      ];
      ws['!cols'] = colWidths;

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'План закупок');

      // Генерируем имя файла с датой
      const fileName = `План_закупок_все_данные_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Ошибка при экспорте в Excel');
      setLoading(false);
    }
  };

  // Состояние для данных диаграммы (все отфильтрованные данные)
  const [chartData, setChartData] = useState<PurchasePlanItem[]>([]);
  // Состояние для данных сводной таблицы (без учета фильтра по закупщику)
  const [summaryData, setSummaryData] = useState<PurchasePlanItem[]>([]);

  // Загружаем все отфильтрованные данные для диаграммы
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000'); // Загружаем все данные для диаграммы
        
        // Для диаграммы не применяем фильтр по году планирования, если выбран только месяц из другого года
        // Но если выбран и декабрь предыдущего года, и месяцы текущего года, нужно передать year для месяцев текущего года
        if (selectedYear !== null) {
          // Если выбран только декабрь предыдущего года (selectedMonthYear !== null и нет других месяцев текущего года)
          // то не передаем year, чтобы показать все данные
          // Но если есть месяцы текущего года в selectedMonths, передаем year
          const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
          if (selectedMonthYear === null || hasCurrentYearMonths) {
            params.append('year', String(selectedYear));
          }
        }
        
        // Добавляем параметры фильтрации
        if (companyFilter.size > 0) {
          companyFilter.forEach(company => {
            // Если выбрано "Не выбрано", передаем специальное значение для null
            if (company === 'Не выбрано') {
              params.append('company', '__NULL__');
            } else {
              params.append('company', company);
            }
          });
        }
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => {
            params.append('cfo', cfo);
          });
        }
        if (filters.purchaseSubject && filters.purchaseSubject.trim() !== '') {
          params.append('purchaseSubject', filters.purchaseSubject.trim());
        }
        // Фильтр по закупщику - передаем все выбранные значения на бэкенд
        if (purchaserFilter.size > 0) {
          purchaserFilter.forEach(purchaser => {
            params.append('purchaser', purchaser);
          });
        }
        // Фильтр по категории - передаем все выбранные значения на бэкенд
        if (categoryFilter.size > 0) {
          categoryFilter.forEach(category => {
            params.append('category', category);
          });
        }
        // Фильтр по статусу - передаем только выбранные значения на бэкенд
        // Если фильтр пустой, не передаем параметр (показываем все статусы)
        // Если фильтр не пустой, передаем только выбранные статусы
        if (statusFilter.size > 0) {
          statusFilter.forEach(status => {
            // Если выбран "Пусто", передаем специальное значение для null
            if (status === 'Пусто') {
              params.append('status', '__NULL__');
            } else {
              params.append('status', status);
            }
          });
        }
        // Для диаграммы не применяем фильтр по месяцу, чтобы показать все месяцы
        
        const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const result = await response.json();
          setChartData(result.content || []);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setChartData([]);
      }
    };
    
    fetchChartData();
  }, [selectedYear, selectedMonthYear, filters, cfoFilter, companyFilter, purchaserFilter, categoryFilter, statusFilter]);

  // Загружаем данные для сводной таблицы (без учета фильтра по закупщику)
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000'); // Загружаем все данные для сводной таблицы
        
        // Для сводной таблицы не применяем фильтр по году планирования, если выбран только месяц из другого года
        // Но если выбран и декабрь предыдущего года, и месяцы текущего года, нужно передать year для месяцев текущего года
        if (selectedYear !== null) {
          // Если выбран только декабрь предыдущего года (selectedMonthYear !== null и нет других месяцев текущего года)
          // то не передаем year, чтобы показать все данные
          // Но если есть месяцы текущего года в selectedMonths, передаем year
          const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
          if (selectedMonthYear === null || hasCurrentYearMonths) {
            params.append('year', String(selectedYear));
          }
        }
        
        // Добавляем параметры фильтрации (БЕЗ фильтра по закупщику)
        if (companyFilter.size > 0) {
          companyFilter.forEach(company => {
            params.append('company', company);
          });
        }
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => {
            params.append('cfo', cfo);
          });
        }
        if (filters.purchaseSubject && filters.purchaseSubject.trim() !== '') {
          params.append('purchaseSubject', filters.purchaseSubject.trim());
        }
        // НЕ добавляем фильтр по закупщику для сводной таблицы
        // Фильтр по категории - передаем все выбранные значения на бэкенд
        if (categoryFilter.size > 0) {
          categoryFilter.forEach(category => {
            params.append('category', category);
          });
        }
        // Фильтр по статусу - передаем только выбранные значения на бэкенд
        // Если фильтр пустой, не передаем параметр (показываем все статусы)
        // Если фильтр не пустой, передаем только выбранные статусы
        if (statusFilter.size > 0) {
          statusFilter.forEach(status => {
            // Если выбран "Пусто", передаем специальное значение для null
            if (status === 'Пусто') {
              params.append('status', '__NULL__');
            } else {
              params.append('status', status);
            }
          });
        }
        // Фильтр по месяцу (аналогично fetchData)
        if (selectedMonths.size > 0) {
          // Отправляем все выбранные месяцы
          selectedMonths.forEach(monthKey => {
            if (monthKey === -1) {
              // Без даты
              params.append('requestMonth', '-1');
            } else if (monthKey === -2) {
              // Декабрь предыдущего года
              params.append('requestMonth', '11');
              if (selectedMonthYear !== null) {
                params.append('requestYear', String(selectedMonthYear));
              }
            } else {
              // Месяцы текущего года (0-11)
              params.append('requestMonth', String(monthKey));
            }
          });
        }
        
        const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const result = await response.json();
          setSummaryData(result.content || []);
        }
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setSummaryData([]);
      }
    };
    
    fetchSummaryData();
  }, [selectedYear, selectedMonthYear, selectedMonths, filters, cfoFilter, companyFilter, categoryFilter, statusFilter]); // НЕ включаем purchaserFilter

  // Функция для подсчета количества закупок по месяцам (использует отфильтрованные данные)
  const getMonthlyDistribution = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return Array(14).fill(0); // 13 месяцев + без даты
    }

    // Определяем год для отображения (используем selectedYear или год планирования из первой записи)
    // Если selectedYear не установлен, определяем год на основе данных
    let displayYear: number;
    if (selectedYear !== null) {
      displayYear = selectedYear;
    } else {
      // Определяем год на основе года планирования из данных или года из даты заявки
      const yearFromData = chartData.find(item => item.year !== null)?.year;
      if (yearFromData) {
        displayYear = yearFromData;
      } else {
        // Если нет года планирования, используем год из даты заявки
        const itemWithDate = chartData.find(item => item.requestDate);
        if (itemWithDate && itemWithDate.requestDate) {
          displayYear = new Date(itemWithDate.requestDate).getFullYear();
        } else {
          displayYear = new Date().getFullYear();
        }
      }
    }
    const prevYear = displayYear - 1;

    // Инициализируем массив для 14 элементов: декабрь предыдущего года + 12 месяцев текущего года + без даты
    const monthCounts = Array(14).fill(0);
    
    // Месяцы: [Дек пред.года, Янв, Фев, Мар, Апр, Май, Июн, Июл, Авг, Сен, Окт, Ноя, Дек, Без даты]
    chartData.forEach((item) => {
      // Исключаем неактуальные строки из расчета диаграммы
      if (item.status === 'Исключена') {
        return;
      }
      
      if (!item.requestDate) {
        // Записи без даты - индекс 13
        monthCounts[13]++;
        return;
      }
      
      const requestDate = new Date(item.requestDate);
      const itemYear = requestDate.getFullYear();
      const itemMonth = requestDate.getMonth(); // 0-11
      
      // Распределяем записи по столбцам на основе года и месяца из requestDate
      if (itemYear === prevYear && itemMonth === 11) {
        // Декабрь предыдущего года (например, декабрь 2025 при displayYear = 2026) - индекс 0
        monthCounts[0]++;
      } else if (itemYear === displayYear) {
        // Месяцы текущего года (0-11 -> индексы 1-12)
        monthCounts[itemMonth + 1]++;
      } else if (itemYear === displayYear + 1 && itemMonth === 11) {
        // Декабрь следующего года - это может быть последний столбец (индекс 12)
        // Но обычно это не должно происходить, так как мы показываем только текущий год и предыдущий
        // Оставляем это для случаев, когда данные выходят за рамки
        monthCounts[12]++;
      }
      // Игнорируем записи из других годов
    });

    return monthCounts;
  }, [chartData, selectedYear]);

  // Максимальное значение для нормализации высоты столбцов (исключаем столбец "без даты")
  // Берем только первые 13 элементов (месяцы), исключая последний (индекс 13 - "без даты")
  // Вычисляем максимальное значение только среди обычных месяцев (без "Без даты")
  // Столбец "Без даты" будет равен максимальному, остальные - пропорционально
  const monthlyCounts = getMonthlyDistribution.slice(0, 13); // Первые 13 элементов (месяцы без "Без даты")
  const maxCount = Math.max(...monthlyCounts, 1);

  // Сводная статистика по закупщикам (использует summaryData, который не учитывает фильтр по закупщику)
  const purchaserSummary = useMemo(() => {
    if (!summaryData || summaryData.length === 0) {
      return [];
    }

    const summaryMap = new Map<string, { count: number; totalBudget: number; totalComplexity: number }>();

    summaryData.forEach((item) => {
      // Исключаем неактуальные строки из сводной таблицы
      if (item.status === 'Исключена') {
        return;
      }

      const purchaser = item.purchaser || 'Не назначен';
      const budget = item.budgetAmount || 0;
      
      // Парсим сложность как число (если это числовое значение)
      let complexity = 0;
      if (item.complexity) {
        const parsed = parseFloat(item.complexity.toString().replace(/,/g, '.').replace(/\s/g, ''));
        if (!isNaN(parsed)) {
          complexity = parsed;
        }
      }

      if (!summaryMap.has(purchaser)) {
        summaryMap.set(purchaser, { count: 0, totalBudget: 0, totalComplexity: 0 });
      }

      const stats = summaryMap.get(purchaser)!;
      stats.count++;
      stats.totalBudget += budget;
      stats.totalComplexity += complexity;
    });

    return Array.from(summaryMap.entries())
      .map(([purchaser, stats]) => ({
        purchaser,
        count: stats.count,
        totalBudget: stats.totalBudget,
        totalComplexity: stats.totalComplexity,
      }))
      .sort((a, b) => b.totalBudget - a.totalBudget); // Сортировка по сумме бюджета по убыванию
  }, [summaryData]);
  
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

  // Загружаем общее количество записей без фильтров
  useEffect(() => {
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=1`);
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

  // Функция для нормализации названия компании
  const normalizeCompany = useCallback((company: string | null): string | null => {
    if (!company) return null;
    const normalized = company.trim().toLowerCase();
    
    // Проверяем на "Узум маркет" и варианты
    if (normalized.includes('узум') && normalized.includes('маркет')) {
      return 'Uzum Market';
    }
    // Проверяем на "Uzum Market" и варианты
    if (normalized.includes('uzum') && normalized.includes('market')) {
      return 'Uzum Market';
    }
    // Проверяем на "Uzum Technologies" и варианты
    if (normalized.includes('узум') && normalized.includes('технологи')) {
      return 'Uzum Technologies';
    }
    if (normalized.includes('uzum') && normalized.includes('technolog')) {
      return 'Uzum Technologies';
    }
    
    // Если это уже правильное значение, возвращаем как есть
    if (company === 'Uzum Market' || company === 'Uzum Technologies') {
      return company;
    }
    
    // Если не распознали, возвращаем как есть (на случай других значений)
    return company;
  }, []);

  // Получаем все годы и уникальные значения из данных
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const years = new Set<number>();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
            company: new Set(),
            purchaser: new Set(),
            category: new Set(),
            status: new Set(),
          };
          
          result.content.forEach((item: PurchasePlanItem) => {
            // Собираем годы
            if (item.year) {
              years.add(item.year);
            }
            // Собираем уникальные значения
            if (item.cfo) values.cfo.add(item.cfo);
            if (item.company) {
              // Нормализуем значение компании: если это старое название, заменяем на новое
              const normalizedCompany = normalizeCompany(item.company);
              if (normalizedCompany) {
                values.company.add(normalizedCompany);
              }
            } else {
              // Если компания пустая/null, добавляем "Не выбрано"
              values.company.add('Не выбрано');
            }
            if (item.purchaser) values.purchaser.add(item.purchaser);
            if (item.category) values.category.add(item.category);
            if (item.status) values.status.add(item.status);
          });
          
          const yearsArray = Array.from(years).sort((a, b) => b - a);
          const companyArray = Array.from(values.company).sort((a, b) => {
            // "Не выбрано" всегда в конце
            if (a === 'Не выбрано') return 1;
            if (b === 'Не выбрано') return -1;
            return a.localeCompare(b, 'ru', { sensitivity: 'base' });
          });
          const uniqueValuesData = {
            cfo: Array.from(values.cfo).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            company: companyArray,
            purchaser: Array.from(values.purchaser).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            category: Array.from(values.category).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            status: Array.from(values.status).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
          };
          
          setAllYears(yearsArray);
          setUniqueValues(uniqueValuesData);
          
          // Устанавливаем по умолчанию последний год планирования только если:
          // 1. Есть годы в данных
          // 2. Год не был установлен (null)
          // 3. Фильтры из localStorage уже загружены (чтобы не перезаписать сохраненный год)
          if (yearsArray.length > 0 && selectedYear === null && filtersLoadedRef.current) {
            setSelectedYear(yearsArray[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMetadata();
  }, [normalizeCompany]);

  const fetchData = async (
    page: number, 
    size: number, 
    year: number | null = null,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {},
    months: Set<number> = new Set()
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));
      
      // Фильтр по году планирования применяем только если не выбран только месяц предыдущего года
      // Если selectedMonthYear установлен, но есть и месяцы текущего года, нужно передать year для месяцев текущего года
      if (year !== null) {
        // Если выбран только декабрь предыдущего года (selectedMonthYear !== null и нет других месяцев текущего года)
        // то не передаем year, чтобы показать все данные
        // Но если есть месяцы текущего года в months, передаем year
        const hasCurrentYearMonths = Array.from(months).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
        if (selectedMonthYear === null || hasCurrentYearMonths) {
          params.append('year', String(year));
        }
      }
      
      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
      }
      
      // Добавляем параметры фильтрации
      // Фильтр по компании - передаем все выбранные значения на бэкенд
      if (companyFilter.size > 0) {
        companyFilter.forEach(company => {
          // Если выбрано "Не выбрано", передаем специальное значение для null
          if (company === 'Не выбрано') {
            params.append('company', '__NULL__');
          } else {
            params.append('company', company);
          }
        });
      }
      // Фильтр по ЦФО - передаем все выбранные значения на бэкенд
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }
      if (filters.purchaseSubject && filters.purchaseSubject.trim() !== '') {
        params.append('purchaseSubject', filters.purchaseSubject.trim());
      }
      // Фильтр по номеру заявки на закупку
      if (filters.purchaseRequestId && filters.purchaseRequestId.trim() !== '') {
        params.append('purchaseRequestId', filters.purchaseRequestId.trim());
      }
      // Фильтр по дате окончания действующего договора
      if (filters.currentContractEndDate && filters.currentContractEndDate.trim() !== '') {
        const dateValue = filters.currentContractEndDate.trim();
        // Если пользователь ввел "-", передаем специальное значение для фильтрации по null
        if (dateValue === '-') {
          params.append('currentContractEndDate', 'null');
        } else {
          params.append('currentContractEndDate', dateValue);
        }
      }
      // Фильтр по закупщику - передаем все выбранные значения на бэкенд
      if (purchaserFilter.size > 0) {
        purchaserFilter.forEach(purchaser => {
          params.append('purchaser', purchaser);
        });
      }
      // Фильтр по категории - передаем все выбранные значения на бэкенд
      if (categoryFilter.size > 0) {
        categoryFilter.forEach(category => {
          params.append('category', category);
        });
      }
      // Фильтр по статусу - передаем только выбранные значения на бэкенд
      // Если фильтр пустой, не передаем параметр (показываем все статусы)
      // Если фильтр не пустой, передаем только выбранные статусы
      if (statusFilter.size > 0) {
        statusFilter.forEach(status => {
          // Если выбран "Пусто", передаем специальное значение для null
          if (status === 'Пусто') {
            params.append('status', '__NULL__');
          } else {
        params.append('status', status);
          }
      });
      }
      if (months.size > 0) {
        // Отправляем все выбранные месяцы
        months.forEach(monthKey => {
          if (monthKey === -1) {
            // Без даты
            params.append('requestMonth', '-1');
          } else if (monthKey === -2) {
            // Декабрь предыдущего года
            params.append('requestMonth', '11');
            if (selectedMonthYear !== null) {
              params.append('requestYear', String(selectedMonthYear));
            }
          } else {
            // Месяцы текущего года (0-11)
            params.append('requestMonth', String(monthKey));
          }
        });
      }
      
      const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Debounce для текстовых фильтров (как в PurchaseRequestsTable)
  useEffect(() => {
    // Проверяем, изменились ли текстовые фильтры
    const textFields = ['company', 'purchaseSubject', 'currentContractEndDate', 'purchaseRequestId'];
    const hasTextChanges = textFields.some(field => localFilters[field] !== filters[field]);
    
    if (hasTextChanges) {
      const timer = setTimeout(() => {
        setFilters(prev => {
          // Обновляем только измененные текстовые поля
          const updated = { ...prev };
          textFields.forEach(field => {
            updated[field] = localFilters[field];
          });
          return updated;
        });
        setCurrentPage(0); // Сбрасываем на первую страницу после применения фильтра
      }, 500); // Задержка 500мс

      return () => clearTimeout(timer);
    }
  }, [localFilters]);

  // Автоматическая подстройка размера textarea для purchaseSubject
  useEffect(() => {
    if (editingPurchaseSubject !== null && purchaseSubjectInputRef.current) {
      const textarea = purchaseSubjectInputRef.current;
      // Небольшая задержка для правильного расчета размера
      setTimeout(() => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        textarea.focus();
      }, 0);
    }
  }, [editingPurchaseSubject]);

  // Загрузка списка компаний с бэкенда при монтировании компонента
  useEffect(() => {
    if (availableCompanies.length === 0) {
      const loadCompanies = async () => {
        try {
          const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/companies`);
          if (response.ok) {
            const companies = await response.json();
            setAvailableCompanies(companies);
          } else {
            console.error('Failed to load companies');
            // Fallback к захардкоженным значениям при ошибке
            setAvailableCompanies(['Uzum Market', 'Uzum Technologies', 'Uzum Tezkor']);
          }
        } catch (error) {
          console.error('Error loading companies:', error);
          // Fallback к захардкоженным значениям при ошибке
          setAvailableCompanies(['Uzum Market', 'Uzum Technologies', 'Uzum Tezkor']);
        }
      };
      loadCompanies();
    }
  }, [availableCompanies.length]);

  // Автоматически загружаем версии и выбираем текущую при изменении года
  useEffect(() => {
    if (selectedYear && filtersLoadedRef.current) {
      loadVersions();
    }
  }, [selectedYear]);

  useEffect(() => {
    // Не вызываем fetchData до тех пор, пока фильтры не загружены из localStorage
    if (!filtersLoadedRef.current) {
      return;
    }
    fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters, selectedMonths);
  }, [currentPage, pageSize, selectedYear, selectedMonthYear, sortField, sortDirection, filters, cfoFilter, companyFilter, purchaserFilter, categoryFilter, statusFilter, selectedMonths]);

  // Автоматически загружаем данные заявок для позиций с purchaseRequestId
  useEffect(() => {
    if (data && data.content) {
      data.content.forEach((item) => {
        if (item.purchaseRequestId && !purchaseRequestData[item.id]?.data && !purchaseRequestData[item.id]?.loading) {
          fetchPurchaseRequest(item.id, item.purchaseRequestId);
        }
      });
    }
  }, [data, fetchPurchaseRequest]);

  // Восстановление фокуса после обновления localFilters
  // Отключено, чтобы не прерывать ввод текста - React сам правильно обрабатывает фокус и курсор
  // useEffect(() => {
  //   if (focusedField) {
  //     const currentValue = localFilters[focusedField] || '';
  //     const prevValue = prevLocalFiltersValueRef.current;
  //     
  //     // Восстанавливаем фокус только если значение действительно изменилось
  //     if (currentValue !== prevValue) {
  //       prevLocalFiltersValueRef.current = currentValue;
  //       
  //       const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
  //       if (input) {
  //         // Сохраняем позицию курсора
  //         const cursorPosition = input.selectionStart || 0;
  //         const inputValue = input.value;
  //         
  //         // Восстанавливаем фокус в следующем тике, чтобы не мешать текущему вводу
  //         requestAnimationFrame(() => {
  //           const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
  //           if (inputAfterRender && inputAfterRender.value === inputValue) {
  //             inputAfterRender.focus();
  //             // Восстанавливаем позицию курсора
  //             const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
  //             inputAfterRender.setSelectionRange(newPosition, newPosition);
  //           }
  //         });
  //       }
  //     }
  //   }
  // }, [localFilters, focusedField]);

  // Восстановление фокуса после обновления localFilters
  // Отключено, чтобы не мешать вводу текста - React сам правильно обрабатывает фокус и курсор
  // useEffect(() => {
  //   if (focusedField) {
  //     const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
  //     if (input) {
  //       const cursorPosition = input.selectionStart || 0;
  //       const currentValue = input.value;
  //       
  //       requestAnimationFrame(() => {
  //         const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
  //         if (inputAfterRender && inputAfterRender.value === currentValue) {
  //           inputAfterRender.focus();
  //           const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
  //           inputAfterRender.setSelectionRange(newPosition, newPosition);
  //         }
  //       });
  //     }
  //   }
  // }, [localFilters, focusedField]);

  // Восстановление фокуса после завершения загрузки данных с сервера (как в PurchaseRequestsTable)
  useEffect(() => {
    if (focusedField && !loading && data) {
      // Небольшая задержка, чтобы дать React время отрендерить обновленные данные
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input) {
          const currentValue = localFilters[focusedField] || '';
          // Проверяем, что значение в поле соответствует локальному состоянию
          if (input.value === currentValue) {
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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  // Обработка сортировки (перемещена выше, чтобы использоваться в getSortableHeaderProps)
  const handleSort = useCallback((field: SortField) => {
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
  }, [sortField, sortDirection]);

  // Создаем useCallback для колбэков, чтобы они были стабильными и не вызывали перерисовку
  // Эти хуки должны быть перед определением SortableHeader, чтобы соблюдать порядок хуков
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

  const handleResizeStartForHeader = useCallback((e: React.MouseEvent<HTMLDivElement>, columnKey: string) => {
    handleResizeStart(e, columnKey);
  }, [handleResizeStart]);

  // Создаем стабильные колбэки для каждого поля отдельно, чтобы не перерисовывать заголовки
  const handlePurchaseSubjectFilterChange = useCallback((value: string) => {
    handleFilterChangeForHeader('purchaseSubject', value);
  }, [handleFilterChangeForHeader]);

  const handlePurchaseSubjectFocus = useCallback(() => {
    handleFocusForHeader('purchaseSubject');
  }, [handleFocusForHeader]);

  const handlePurchaseSubjectBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    handleBlurForHeader(e, 'purchaseSubject');
  }, [handleBlurForHeader]);

  const handlePurchaseSubjectResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleResizeStartForHeader(e, 'purchaseSubject');
  }, [handleResizeStartForHeader]);

  const handlePurchaseSubjectSort = useCallback(() => {
    handleSort('purchaseSubject');
  }, [handleSort]);

  // Обработка фильтров
  const handleFilterChange = (field: string, value: string, isTextFilter: boolean = false) => {
    if (isTextFilter) {
      // Для текстовых фильтров обновляем только локальное состояние
      // fetchData будет вызван через debounce в useEffect
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
    } else {
      // Для не-текстовых фильтров сразу обновляем оба состояния и загружаем данные
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

  // Получение уникальных значений для фильтров
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
    company: [],
    purchaser: [],
    category: [],
    status: [],
  });

  useEffect(() => {
    const fetchUniqueValues = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
            company: new Set(),
            purchaser: new Set(),
            category: new Set(),
            status: new Set(),
          };
          
          result.content.forEach((item: PurchasePlanItem) => {
            if (item.cfo) values.cfo.add(item.cfo);
            if (item.company) {
              // Нормализуем значение компании: если это старое название, заменяем на новое
              const normalizedCompany = normalizeCompany(item.company);
              if (normalizedCompany) {
                values.company.add(normalizedCompany);
              }
            }
            if (item.purchaser) values.purchaser.add(item.purchaser);
            if (item.category) values.category.add(item.category);
            if (item.status) values.status.add(item.status);
          });
          
          setUniqueValues({
            cfo: Array.from(values.cfo).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            company: Array.from(values.company).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            purchaser: Array.from(values.purchaser).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            category: Array.from(values.category).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
            status: Array.from(values.status).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
          });
        }
      } catch (err) {
        console.error('Error fetching unique values:', err);
      }
    };
    fetchUniqueValues();
  }, [normalizeCompany]);

  const getUniqueValues = (field: keyof PurchasePlanItem): string[] => {
    const fieldMap: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo',
      company: 'company',
      purchaser: 'purchaser',
      category: 'category',
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
    setCurrentPage(0);
  };

  const handleCfoSelectAll = () => {
    const allCfo = getUniqueValues('cfo');
    const newSet = new Set(allCfo);
    setCfoFilter(newSet);
    setCurrentPage(0);
  };

  const handleCfoDeselectAll = () => {
    setCfoFilter(new Set());
    setCurrentPage(0);
  };

  // Обработчики для фильтра по компаниям
  const handleCompanyToggle = (company: string) => {
    const newSet = new Set(companyFilter);
    if (newSet.has(company)) {
      newSet.delete(company);
    } else {
      newSet.add(company);
    }
    setCompanyFilter(newSet);
    setCurrentPage(0);
    
    // Отправляем событие для обновления фильтра компании в диаграмме
    window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
      detail: { companyFilter: Array.from(newSet) }
    }));
  };

  const handleCompanySelectAll = () => {
    const allCompanies = getUniqueValues('company');
    const newSet = new Set(allCompanies);
    setCompanyFilter(newSet);
    setCurrentPage(0);
    
    // Отправляем событие для обновления фильтра компании в диаграмме
    window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
      detail: { companyFilter: Array.from(newSet) }
    }));
  };

  const handleCompanyDeselectAll = () => {
    setCompanyFilter(new Set());
    setCurrentPage(0);
    
    // Отправляем событие для обновления фильтра компании в диаграмме
    window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
      detail: { companyFilter: [] }
    }));
  };

  // Обработчики для фильтра по категории
  const handleCategoryToggle = (category: string) => {
    const newSet = new Set(categoryFilter);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setCategoryFilter(newSet);
    setCurrentPage(0);
  };

  const handleCategorySelectAll = () => {
    const allCategories = getUniqueValues('category');
    const newSet = new Set(allCategories);
    setCategoryFilter(newSet);
    setCurrentPage(0);
  };

  const handleCategoryDeselectAll = () => {
    setCategoryFilter(new Set());
    setCurrentPage(0);
  };

  // Обработчики для фильтра по статусу
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

  const handleStatusSelectAll = () => {
    const newSet = new Set(ALL_STATUSES);
    setStatusFilter(newSet);
    setCurrentPage(0);
  };

  const handleStatusDeselectAll = () => {
    setStatusFilter(new Set());
    setCurrentPage(0);
  };

  // Обработчики для фильтра по закупщикам
  const handlePurchaserToggle = (purchaser: string) => {
    const newSet = new Set(purchaserFilter);
    if (newSet.has(purchaser)) {
      newSet.delete(purchaser);
    } else {
      newSet.add(purchaser);
    }
    setPurchaserFilter(newSet);
    setCurrentPage(0);

    // Немедленно сохраняем обновленный фильтр по закупщику в localStorage,
    // чтобы не потерять выбор при быстром переходе на другую страницу
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
        pageSize,
        currentPage: 0,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (err) {
      console.error('Error saving purchaserFilter on toggle:', err);
    }
  };

  const handlePurchaserSelectAll = () => {
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
        pageSize,
        currentPage: 0,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (err) {
      console.error('Error saving purchaserFilter on select all:', err);
    }
  };

  const handlePurchaserDeselectAll = () => {
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
        pageSize,
        currentPage: 0,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (err) {
      console.error('Error saving purchaserFilter on deselect all:', err);
    }
  };

  // Закрываем выпадающие списки при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isCfoFilterOpen && !target.closest('.cfo-filter-container')) {
        setIsCfoFilterOpen(false);
      }
      if (isCompanyFilterOpen && !target.closest('.company-filter-container')) {
        setIsCompanyFilterOpen(false);
      }
      if (isCategoryFilterOpen && !target.closest('.category-filter-container')) {
        setIsCategoryFilterOpen(false);
      }
      if (isPurchaserFilterOpen && !target.closest('.purchaser-filter-container')) {
        setIsPurchaserFilterOpen(false);
      }
    };

    if (isCfoFilterOpen || isCompanyFilterOpen || isCategoryFilterOpen || isPurchaserFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCfoFilterOpen, isCompanyFilterOpen, isCategoryFilterOpen, isPurchaserFilterOpen]);

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
    // Используем все статусы из константы ALL_STATUSES вместо uniqueValues.status
    const allStatuses = ALL_STATUSES;
    if (!statusSearchQuery || !statusSearchQuery.trim()) {
      return allStatuses;
    }
    const searchLower = statusSearchQuery.toLowerCase().trim();
    return allStatuses.filter(status => {
      if (!status) return false;
      return status.toLowerCase().includes(searchLower);
    });
  }, [statusSearchQuery]);

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
            onClick={() => fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // Компонент для заголовка с сортировкой и фильтром
  // Работает как в PurchaseRequestsTable - напрямую использует состояние из родительского компонента
  const SortableHeader = ({
    field, 
    label, 
    filterType = 'text',
    width,
    columnKey,
    className
  }: { 
    field: string | null; 
    label: string;
    filterType?: 'text' | 'select';
    width?: string;
    columnKey?: string;
    className?: string;
  }) => {
    const fieldKey = field || '';
    const isSorted = sortField === field;
    const filterValue = filterType === 'text' ? (localFilters[fieldKey] || '') : (filters[fieldKey] || '');
    const columnWidth = columnKey ? getColumnWidth(columnKey) : undefined;
    const style: React.CSSProperties = columnWidth 
      ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px`, verticalAlign: 'top', overflow: 'hidden' }
      : { verticalAlign: 'top', overflow: 'hidden' };

    return (
      <th 
        className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${width || ''} ${className || ''}`} 
        style={style}
        data-column={columnKey || undefined}
      >
      <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
          <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
            {filterType === 'text' ? (
              <input
                type="text"
                data-filter-field={fieldKey}
                value={filterValue}
                autoFocus={focusedField === fieldKey}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Напрямую обновляем localFilters, как в PurchaseRequestsTable
                  setLocalFilters(prev => ({
                    ...prev,
                    [fieldKey]: newValue,
                  }));
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  setFocusedField(fieldKey);
                }}
                onBlur={(e) => {
                  // Снимаем фокус только если пользователь явно кликнул в другое место
                  // Используем setTimeout, чтобы проверить, действительно ли фокус потерян
                  // Это предотвращает мигание фокуса при перерисовке компонента
                  const currentTarget = e.currentTarget;
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    // Проверяем, что фокус действительно потерян и не вернулся на тот же элемент
                    if (activeElement && 
                        activeElement !== currentTarget && 
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
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                onClick={() => handleSort(field as SortField)}
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

  // Создаем useCallback для колбэков, чтобы они были стабильными и не вызывали перерисовку
  const hasData = data && data.content && data.content.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Сводная таблица по закупщикам и элементы управления */}
      <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start w-full">
          {/* Сводная таблица и элементы управления в одной строке */}
          <div className="flex items-start">
            {/* Сводная таблица */}
              <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
          <div className="overflow-x-auto">
                <table className="border-collapse table-auto">
            <thead className="bg-gray-50">
              <tr>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                  Закупщик
                </th>
                      <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                  Количество
                </th>
                      <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                  Сумма бюджета
                </th>
                      <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                        Сложность
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                    {purchaserSummary.length > 0 ? (
                      purchaserSummary.map((item, index) => {
                      const isSelected = purchaserFilter.size === 1 && purchaserFilter.has(item.purchaser);
                      return (
                        <tr 
                          key={index} 
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-100 hover:bg-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              // Если уже выбран, сбрасываем фильтр
                              setPurchaserFilter(new Set());
                            } else {
                              // Устанавливаем фильтр только на этого закупщика
                              setPurchaserFilter(new Set([item.purchaser]));
                            }
                            setCurrentPage(0);
                          }}
                        >
                          <td className="px-2 py-1 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                            {item.purchaser}
                  </td>
                          <td className="px-2 py-1 text-xs text-gray-900 text-right border-r border-gray-200 whitespace-nowrap">
                            {item.count}
                    </td>
                          <td className="px-2 py-1 text-xs text-gray-900 text-right border-r border-gray-200 whitespace-nowrap">
                            {item.totalBudget.toLocaleString('ru-RU', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 0 
                            })}
                    </td>
                          <td className="px-2 py-1 text-xs text-gray-900 text-right whitespace-nowrap">
                            {item.totalComplexity > 0 
                              ? item.totalComplexity.toLocaleString('ru-RU', { 
                                  minimumFractionDigits: 0, 
                                  maximumFractionDigits: 2 
                                })
                              : '-'}
                    </td>
                  </tr>
                      );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-2 py-1 text-xs text-gray-500 text-center whitespace-nowrap">
                          Нет данных
                        </td>
                      </tr>
                    )}
                  </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-300">
                  <tr 
                    className="cursor-pointer transition-colors hover:bg-gray-100"
                    onClick={() => {
                      // При клике на "Итого" сбрасываем фильтр по закупщику, чтобы показать все записи
                      setPurchaserFilter(new Set());
                      setCurrentPage(0);
                    }}
                  >
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">
                    Итого
                  </td>
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r border-gray-200 whitespace-nowrap">
                      {purchaserSummary.reduce((sum, item) => sum + item.count, 0)}
                  </td>
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r border-gray-200 whitespace-nowrap">
                      {purchaserSummary.reduce((sum, item) => sum + item.totalBudget, 0).toLocaleString('ru-RU', { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 0 
                      })}
                    </td>
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right whitespace-nowrap">
                      {(() => {
                        const totalComplexity = purchaserSummary.reduce((sum, item) => sum + item.totalComplexity, 0);
                        return totalComplexity > 0 
                          ? totalComplexity.toLocaleString('ru-RU', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 2 
                            })
                          : '-';
                      })()}
                  </td>
                </tr>
                </tfoot>
          </table>
        </div>
      </div>
            
            {/* Элементы управления справа от сводной таблицы */}
            <div className="flex items-start gap-2 flex-shrink-0 ml-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
              <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">Компания:</span>
                  <div className="relative company-filter-container">
                <button
                    ref={companyFilterButtonRef}
                    type="button"
                    onClick={() => setIsCompanyFilterOpen(!isCompanyFilterOpen)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-2 hover:bg-gray-50 min-w-[200px]"
                  >
                    <span className="text-gray-700 truncate flex-1 text-left">
                      {companyFilter.size === 0 
                        ? 'Все компании' 
                        : companyFilter.size === 1
                        ? (Array.from(companyFilter)[0] || 'Все компании')
                        : `${companyFilter.size} выбрано`}
                    </span>
                    <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${isCompanyFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                  {isCompanyFilterOpen && companyFilterPosition && (
                    <div 
                      className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                      style={{
                        top: `${companyFilterPosition.top}px`,
                        left: `${companyFilterPosition.left}px`,
                      }}
                    >
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                          <input
                            type="text"
                            value={companySearchQuery}
                            onChange={(e) => {
                              e.stopPropagation();
                              setCompanySearchQuery(e.target.value);
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
                          onClick={() => handleCompanySelectAll()}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Все
              </button>
                        <button
                          onClick={() => handleCompanyDeselectAll()}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          Снять
              </button>
            </div>
                      <div className="max-h-48 overflow-y-auto">
                        {getFilteredCompanyOptions.length === 0 ? (
                          <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                        ) : (
                          getFilteredCompanyOptions.map((company) => (
                            <label
                              key={company}
                              className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={companyFilter.has(company)}
                                onChange={() => handleCompanyToggle(company)}
                                className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-xs text-gray-700 flex-1">{company}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                      company: '',
                      cfo: '',
                      purchaseSubject: '',
                      currentContractEndDate: '',
                      purchaseRequestId: '',
                    };
                    setFilters(emptyFilters);
                    setLocalFilters(emptyFilters);
                    setCfoFilter(new Set());
                    setCompanyFilter(new Set(['Uzum Market'])); // При сбросе устанавливаем фильтр по умолчанию на "Uzum Market"
                    setCategoryFilter(new Set());
                    setPurchaserFilter(new Set());
                    // При сбросе устанавливаем фильтр по статусу на все статусы кроме "Исключена"
                    const resetStatusFilter = ALL_STATUSES.filter(s => s !== 'Исключена');
                    setStatusFilter(new Set(resetStatusFilter));
                  setSortField('requestDate');
                  setSortDirection('asc');
                    setFocusedField(null);
                  setSelectedYear(allYears.length > 0 ? allYears[0] : null);
                    setSelectedMonths(new Set());
                    setSelectedMonthYear(null);
                    setCurrentPage(0);
                    // Сохраняем сброшенные фильтры в localStorage
                    // Фильтр по компании устанавливается на "Uzum Market" по умолчанию
                    // Фильтр по статусу устанавливается на все статусы кроме "Исключена"
                    const defaultStatusFilter = ALL_STATUSES.filter(s => s !== 'Исключена');
                    setStatusFilter(new Set(defaultStatusFilter));
                    try {
                      const resetFilters = {
                        filters: emptyFilters,
                        cfoFilter: [],
                        companyFilter: ['Uzum Market'], // При сбросе устанавливаем фильтр по умолчанию на "Uzum Market"
                        categoryFilter: [],
                        purchaserFilter: [],
                        statusFilter: defaultStatusFilter, // При сбросе устанавливаем фильтр по умолчанию (все кроме Исключена)
                        sortField: 'requestDate',
                        sortDirection: 'asc',
                        pageSize: pageSize,
                        currentPage: 0,
                      };
                      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(resetFilters));
                    } catch (err) {
                      console.error('Error saving reset filters:', err);
                    }
                    // Отправляем событие для обновления фильтра компании в диаграмме
                    window.dispatchEvent(new CustomEvent('purchasePlanItemCompanyFilterUpdated', {
                      detail: { companyFilter: ['Uzum Market'] }
                    }));
                    // Устанавливаем просмотр текущей версии
                    if (selectedYear) {
                      loadVersions().then(() => {
                        // После загрузки версий текущая версия будет выбрана автоматически в loadVersions
                      });
                    } else {
                      // Если год не выбран, просто сбрасываем выбранную версию
                      setSelectedVersionId(null);
                      setSelectedVersionInfo(null);
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                >
                  Сбросить фильтры
                </button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-700 font-medium">Год планирования:</span>
                  {allYears.map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedYear === year
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedYear(null)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      selectedYear === null
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Все
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {selectedVersionId && (
                  <div className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-2 ${
                    selectedVersionInfo?.isCurrent 
                      ? 'bg-green-100 text-green-800 border-green-300' 
                      : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                  }`}>
                    <span>
                      {selectedVersionInfo?.isCurrent 
                        ? 'Просмотр текущей редакции' 
                        : `Просмотр редакции #${selectedVersionInfo?.versionNumber}`}
                    </span>
                <button
                      onClick={() => {
                        setSelectedVersionId(null);
                        setSelectedVersionInfo(null);
                        fetchData(0, pageSize, selectedYear, sortField, sortDirection, filters, selectedMonths);
                      }}
                      className={selectedVersionInfo?.isCurrent 
                        ? 'text-green-800 hover:text-green-900' 
                        : 'text-yellow-800 hover:text-yellow-900'}
                      title="Вернуться к текущей версии"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Создать новую строку плана закупок"
                  disabled={selectedVersionId !== null && !selectedVersionInfo?.isCurrent}
                >
                  <Plus className="w-4 h-4" />
                  Создать строку
                </button>
                <button
                  onClick={() => setIsCreateVersionModalOpen(true)}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Создать редакцию плана закупок"
                  disabled={selectedVersionId !== null && !selectedVersionInfo?.isCurrent}
                >
                  <Plus className="w-4 h-4" />
                  Создать редакцию
                </button>
                <button
                  onClick={() => {
                    setIsVersionsListModalOpen(true);
                    loadVersions();
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
                  title="Просмотр редакций плана закупок"
                >
                  <Settings className="w-4 h-4" />
                  Редакции
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2"
                  title="Экспорт в PDF"
                >
                  <Download className="w-4 h-4" />
                  Экспорт в PDF
                </button>
                <button
                  onClick={handleExportToExcelWithFilters}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Экспорт в Excel с фильтрами"
                  disabled={!data || !data.content || data.content.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Excel (с фильтрами)
                </button>
                <button
                  onClick={handleExportToExcelAll}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Экспорт в Excel всех данных"
                  disabled={loading}
                >
                  <Download className="w-4 h-4" />
                  Excel (все данные)
                </button>
            </div>
          </div>
            <div className="relative flex items-center">
              <div className="absolute -top-6 left-0">
                <p className="text-sm text-gray-500">
                  Всего записей: {totalRecords}
                </p>
                    </div>
                  </div>
                  </div>
                  </div>
                </div>
            </div>
      {/* Модальное окно подтверждения паролем перед изменением данных */}
      {/* Модальное окно для ошибок */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setErrorModal({ isOpen: false, message: '' })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ошибка</h2>
            <button
                onClick={() => setErrorModal({ isOpen: false, message: '' })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            </div>
            <p className="text-sm text-gray-700 mb-4">{errorModal.message}</p>
            <div className="flex justify-end">
            <button
                onClick={() => setErrorModal({ isOpen: false, message: '' })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                OK
            </button>
          </div>
        </div>
      </div>
      )}

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Подтверждение изменения</h2>
            <p className="text-sm text-gray-600 mb-4">
              Для сохранения изменения необходимо повторно ввести логин и пароль, как при входе в систему.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {authError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  // Откатываем изменения, если они были применены локально (при перетаскивании Ганта)
                  if (pendingDateChange && (pendingDateChange.oldRequestDate !== undefined || pendingDateChange.oldNewContractDate !== undefined)) {
                    // Восстанавливаем исходные данные
                    if (data) {
                      const updatedContent = data.content.map(i => 
                        i.id === pendingDateChange.itemId 
                          ? { 
                              ...i, 
                              requestDate: pendingDateChange.oldRequestDate !== undefined ? pendingDateChange.oldRequestDate : i.requestDate,
                              newContractDate: pendingDateChange.oldNewContractDate !== undefined ? pendingDateChange.oldNewContractDate : i.newContractDate
                            }
                          : i
                      );
                      setData({ ...data, content: updatedContent });
                    }
                    // Убираем временные даты
                    setTempDates(prev => {
                      const newTemp = { ...prev };
                      delete newTemp[pendingDateChange.itemId];
                      return newTemp;
                    });
                    // Останавливаем анимацию
                    setAnimatingDates(prev => {
                      const newAnimating = { ...prev };
                      delete newAnimating[pendingDateChange.itemId];
                      return newAnimating;
                    });
                  }
                  setIsAuthModalOpen(false);
                  setPendingDateChange(null);
                  setAuthPassword('');
                  setAuthError(null);
                }}
                disabled={authLoading}
              >
                Отмена
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAuthConfirm}
                disabled={authLoading || !authUsername || !authPassword}
              >
                {authLoading ? 'Проверка...' : 'Подтвердить и сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для создания новой строки */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIsCreateModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Создать новую строку плана закупок</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Год планирования</label>
                  <input
                    type="number"
                    value={newItemData.year || ''}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Год"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Компания</label>
                  <select
                    value={newItemData.company || ''}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, company: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-</option>
                    {availableCompanies.map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ЦФО</label>
                  <input
                    type="text"
                    list="cfo-list-create"
                    value={newItemData.cfo || ''}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, cfo: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Введите или выберите ЦФО"
                  />
                  <datalist id="cfo-list-create">
                    {Array.from(uniqueValues.cfo)
                      .slice()
                      .sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
                      .map((cfo) => (
                        <option key={cfo} value={cfo} />
                      ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                  <select
                    value={newItemData.status || 'Проект'}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, status: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALL_STATUSES.filter(s => s !== 'Заявка').map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Предмет закупки</label>
                <textarea
                  value={newItemData.purchaseSubject || ''}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, purchaseSubject: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Введите предмет закупки"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Бюджет (UZS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemData.budgetAmount || ''}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, budgetAmount: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Закупщик</label>
                  <input
                    type="text"
                    value={newItemData.purchaser || ''}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, purchaser: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Введите закупщика"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сложность</label>
                  <select
                    value={newItemData.complexity || ''}
                    onChange={(e) => {
                      const complexity = e.target.value || null;
                      // Всегда пересчитываем дату нового договора при изменении сложности
                      const calculatedDate = calculateNewContractDate(newItemData.requestDate || null, complexity);
                      setNewItemData(prev => ({ 
                        ...prev, 
                        complexity,
                        newContractDate: calculatedDate || null
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    1 = +7 рабочих дней, 2 = +14, 3 = +22, 4 = +50
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата заявки</label>
                  <input
                    type="date"
                    value={newItemData.requestDate ? newItemData.requestDate.split('T')[0] : ''}
                    onChange={(e) => {
                      const requestDate = e.target.value || null;
                      // Всегда пересчитываем дату нового договора при изменении даты заявки
                      const calculatedDate = calculateNewContractDate(requestDate, newItemData.complexity || null);
                      setNewItemData(prev => ({ 
                        ...prev, 
                        requestDate,
                        newContractDate: calculatedDate || null
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата завершения закупки</label>
                  <input
                    type="date"
                    value={newItemData.newContractDate ? newItemData.newContractDate.split('T')[0] : ''}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-gray-100 cursor-not-allowed"
                    title={newItemData.complexity && newItemData.requestDate ? `Автоматически рассчитано: дата заявки + ${getWorkingDaysByComplexity(newItemData.complexity)} рабочих дней (сложность ${newItemData.complexity})` : 'Укажите сложность и дату заявки для автоматического расчета'}
                  />
                  {newItemData.complexity && newItemData.requestDate ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Рассчитано автоматически: сложность {newItemData.complexity} = +{getWorkingDaysByComplexity(newItemData.complexity)} рабочих дней
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Укажите сложность и дату заявки для расчета
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewItemData({
                    year: selectedYear || (new Date().getFullYear() + 1),
                    company: 'Uzum Market',
                    status: 'Проект',
                    complexity: null,
                    requestDate: null,
                    newContractDate: null,
                  });
                }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateItem}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Пагинация */}
      {data && (
        <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-700">
              Показано {data?.content.length || 0} из {data?.totalElements || 0} записей
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-xs text-gray-700">
                Элементов на странице:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Первая
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <span className="px-2 py-1 text-xs font-medium text-gray-700">
              Страница {currentPage + 1} из {data?.totalPages || 0}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= (data?.totalPages || 0) - 1}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
            <button
              onClick={() => setCurrentPage((data?.totalPages || 0) - 1)}
              disabled={currentPage >= (data?.totalPages || 0) - 1}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Последняя
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Контейнер для печати */}
        <div ref={printRef} className="print-container h-full flex flex-col overflow-hidden">
          <style>{`
            @media print {
              .print-container {
                width: 100%;
                padding: 0;
                position: relative;
              }
              .print-header {
                display: block !important;
                margin-bottom: 15px;
                position: relative;
                padding-left: 70px;
              }
              .print-header::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                width: 60px;
                height: 60px;
                background-image: url('/images/logo-small.svg');
                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
              }
              .print-header h1 {
                font-size: 18px;
                font-weight: bold;
                margin: 0 0 5px 0;
              }
              .print-header p {
                font-size: 12px;
                margin: 0;
              }
              table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
              }
              table thead th,
              table tbody td {
                border: 1px solid #e5e7eb !important;
              }
              table thead th.purchase-subject-column,
              table tbody td.purchase-subject-column,
              table thead th[data-column="purchaseSubject"],
              table tbody td[data-column="purchaseSubject"] {
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }
              table thead th {
                background-color: #f9fafb !important;
              }
              .no-print {
                display: none !important;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            @media screen {
              .print-header {
                display: none;
              }
            }
          `}</style>
          <div className="print-header">
            <h1>План закупок</h1>
            {selectedYear !== null && <p>Год: {selectedYear}</p>}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {visibleColumns.has('id') && (
              <SortableHeader field="id" label="ID" columnKey="id" />
              )}
              {visibleColumns.has('company') && (
              <SortableHeader field="company" label="Компания" columnKey="company" />
              )}
              {visibleColumns.has('purchaseRequestId') && (
              <SortableHeader 
                field="purchaseRequestId" 
                label="Заявка на закупку" 
                filterType="text"
                columnKey="purchaseRequestId" 
              />
              )}
              {visibleColumns.has('cfo') && (
              <th 
                className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" 
                      style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px`, verticalAlign: 'top', overflow: 'hidden' }}
                    >
                <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                  <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                    <div className="relative cfo-filter-container flex-1">
                      <button
                        ref={cfoFilterButtonRef}
                        type="button"
                        onClick={() => setIsCfoFilterOpen(!isCfoFilterOpen)}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
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
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg"
                        style={{
                          top: `${cfoFilterPosition.top}px`,
                          left: `${cfoFilterPosition.left}px`,
                          maxHeight: '400px',
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
                              className="w-full pl-7 pr-7 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Поиск..."
                            />
                            {cfoSearchQuery && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCfoSearchQuery('');
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Очистить поиск"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
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
                        <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
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
              )}
              {visibleColumns.has('purchaseSubject') && (
              <SortableHeader 
                field="purchaseSubject" 
                label="Предмет закупки" 
                filterType="text" 
                columnKey="purchaseSubject"
                className="purchase-subject-column"
              />
              )}
              {visibleColumns.has('purchaser') && (
              <th 
                className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" 
                style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px`, verticalAlign: 'top', overflow: 'hidden' }}
              >
                <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                  <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                    <div className="relative purchaser-filter-container flex-1">
                      <button
                        ref={purchaserFilterButtonRef}
                        type="button"
                        onClick={() => setIsPurchaserFilterOpen(!isPurchaserFilterOpen)}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
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
                              getFilteredPurchaserOptions.map((purchaser) => (
                                <label
                                  key={purchaser}
                                  className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={purchaserFilter.has(purchaser)}
                                    onChange={() => handlePurchaserToggle(purchaser)}
                                    className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-xs text-gray-700 flex-1">{purchaser}</span>
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
              )}
              {visibleColumns.has('budgetAmount') && (
              <SortableHeader field="budgetAmount" label="Бюджет (UZS)" columnKey="budgetAmount" />
              )}
              {visibleColumns.has('requestDate') && (
              <SortableHeader field="requestDate" label="Дата заявки" columnKey="requestDate" />
              )}
              {visibleColumns.has('newContractDate') && (
              <SortableHeader field="newContractDate" label="Дата завершения закупки" columnKey="newContractDate" />
              )}
              {visibleColumns.has('guid') && (
              <SortableHeader field="guid" label="GUID" columnKey="guid" />
              )}
              {visibleColumns.has('year') && (
              <SortableHeader field="year" label="Год" columnKey="year" />
              )}
              {visibleColumns.has('product') && (
              <SortableHeader field="product" label="Продукция" columnKey="product" />
              )}
              {visibleColumns.has('currentKa') && (
              <SortableHeader field="currentKa" label="КА действующего" columnKey="currentKa" />
              )}
              {visibleColumns.has('currentAmount') && (
              <SortableHeader field="currentAmount" label="Сумма текущего" columnKey="currentAmount" />
              )}
              {visibleColumns.has('currentContractAmount') && (
              <SortableHeader field="currentContractAmount" label="Сумма текущего договора" columnKey="currentContractAmount" />
              )}
              {visibleColumns.has('currentContractBalance') && (
              <SortableHeader field="currentContractBalance" label="Остаток текущего договора" columnKey="currentContractBalance" />
              )}
              {visibleColumns.has('currentContractEndDate') && (
              <SortableHeader field="currentContractEndDate" label="Дата окончания действующего" columnKey="currentContractEndDate" />
              )}
              {visibleColumns.has('complexity') && (
              <SortableHeader field="complexity" label="Сложность" columnKey="complexity" />
              )}
              {visibleColumns.has('category') && (
              <th 
                className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" 
                style={{ width: `${getColumnWidth('category')}px`, minWidth: `${getColumnWidth('category')}px`, maxWidth: `${getColumnWidth('category')}px`, verticalAlign: 'top', overflow: 'hidden' }}
              >
                <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                  <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                    <div className="relative category-filter-container flex-1">
                      <button
                        ref={categoryFilterButtonRef}
                        type="button"
                        onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      >
                      <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                        {categoryFilter.size === 0 
                          ? 'Все' 
                          : categoryFilter.size === 1
                          ? (Array.from(categoryFilter)[0] || 'Все')
                          : `${categoryFilter.size} выбрано`}
                      </span>
                      <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isCategoryFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isCategoryFilterOpen && categoryFilterPosition && (
                      <div 
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                        style={{
                          top: `${categoryFilterPosition.top}px`,
                          left: `${categoryFilterPosition.left}px`,
                        }}
                      >
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              type="text"
                              value={categorySearchQuery}
                              onChange={(e) => {
                                e.stopPropagation();
                                setCategorySearchQuery(e.target.value);
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
                            onClick={() => handleCategorySelectAll()}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Все
                          </button>
                          <button
                            onClick={() => handleCategoryDeselectAll()}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Снять
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredCategoryOptions.length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                          ) : (
                            getFilteredCategoryOptions.map((category) => (
                              <label
                                key={category}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={categoryFilter.has(category)}
                                  onChange={() => handleCategoryToggle(category)}
                                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-xs text-gray-700 flex-1">{category}</span>
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
                    onClick={() => handleSort('category')}
                      className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                      style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                  >
                    {sortField === 'category' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <ArrowDown className="w-3 h-3 flex-shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                    )}
                  </button>
                    <span className="text-xs font-medium text-gray-500 tracking-wider">Категория</span>
                  </div>
                </div>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                  onMouseDown={(e) => handleResizeStart(e, 'category')}
                  style={{ zIndex: 10 }}
                />
              </th>
              )}
              {visibleColumns.has('status') && (
              <th 
                className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative" 
                style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px`, verticalAlign: 'top', overflow: 'hidden' }}
              >
                <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                  <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                    <div className="relative status-filter-container flex-1">
                      <button
                        ref={statusFilterButtonRef}
                        type="button"
                        onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      >
                      <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                        {statusFilter.size === 0 
                          ? 'Все' 
                          : statusFilter.size === 1
                          ? (Array.from(statusFilter)[0] || 'Все')
                          : `${statusFilter.size} выбрано`}
                      </span>
                      <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isStatusFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isStatusFilterOpen && statusFilterPosition && (
                      <div 
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                        data-status-filter-menu="true"
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
                              onChange={(e) => {
                                e.stopPropagation();
                                setStatusSearchQuery(e.target.value);
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
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredStatusOptions.length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                          ) : (
                            getFilteredStatusOptions.map((status) => (
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
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 min-h-[20px]">
                  <button
                    onClick={() => handleSort('status')}
                      className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                      style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                  >
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <ArrowDown className="w-3 h-3 flex-shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                    )}
                  </button>
                    <span className="text-xs font-medium text-gray-500 tracking-wider">Статус</span>
                  </div>
                </div>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                  onMouseDown={(e) => handleResizeStart(e, 'status')}
                  style={{ zIndex: 10 }}
                />
              </th>
              )}
              {visibleColumns.has('createdAt') && (
              <SortableHeader field="createdAt" label="Дата создания" columnKey="createdAt" />
              )}
              {visibleColumns.has('updatedAt') && (
              <SortableHeader field="updatedAt" label="Дата обновления" columnKey="updatedAt" />
              )}
              <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300" style={{ width: '350px', minWidth: '350px' }}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 min-h-[20px]">
                    {/* Столбчатая диаграмма распределения по месяцам */}
                    <div className="flex-1 flex items-end h-20 relative" style={{ minHeight: '80px', height: '80px', paddingLeft: '0', paddingRight: '0', gap: '2px', width: '100%' }}>
                      {getMonthlyDistribution.map((count, index) => {
                        const monthLabels = ['Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Без даты'];
                        const isYearDivider = index === 1; // После декабря предыдущего года
                        const isNoDate = index === 13; // Последний столбец - без даты
                        
                        // Не показываем столбец "Без даты", если в нем нет закупок
                        if (isNoDate && count === 0) {
                          return null;
                        }
                        // Столбец "Без даты" всегда равен максимальному столбцу из обычных месяцев
                        // Остальные столбцы рассчитываются с нелинейным масштабированием для большей видимости
                        // Используем абсолютную высоту в пикселях для правильного отображения
                        const containerHeight = 80; // Высота контейнера в пикселях
                        const topMargin = 2; // Небольшой отступ сверху
                        const availableHeight = containerHeight - topMargin; // Доступная высота для столбцов (78px)
                        let columnHeight = 0;
                        if (isNoDate) {
                          // Столбец "Без даты" всегда равен максимальному столбцу из обычных месяцев
                          columnHeight = availableHeight;
                        } else if (count > 0 && maxCount > 0) {
                          // Используем нелинейное масштабирование для большей видимости маленьких столбцов
                          // Степень 0.4 делает маленькие столбцы еще более заметными (ближе к максимальному)
                          const ratio = count / maxCount;
                          // Применяем степенную функцию с показателем 0.4 для более агрессивного масштабирования
                          const scaledRatio = Math.pow(ratio, 0.4);
                          columnHeight = scaledRatio * availableHeight;
                          // Минимальная высота для видимости столбца с данными (увеличена для лучшей видимости)
                          if (columnHeight < 8) {
                            columnHeight = 8;
                          }
                        }
                        const heightPercent = isNoDate ? 100 : (count > 0 && maxCount > 0 ? (count / maxCount) * 100 : 0);
                        
                        // Определяем месяц для фильтрации
                        // index 0 = декабрь предыдущего года (месяц 11 предыдущего года)
                        // index 1-12 = январь-декабрь текущего года (месяцы 0-11)
                        // index 13 = без даты (-1)
                        const displayYear = selectedYear || chartData[0]?.year || new Date().getFullYear();
                        const prevYear = displayYear - 1;
                        
                        let monthForFilter: number | null = null;
                        let yearForFilter: number | null = null;
                        if (index === 0) {
                          // Декабрь предыдущего года - для фильтрации используем месяц 11 и предыдущий год
                          monthForFilter = 11; // Декабрь
                          yearForFilter = prevYear; // Предыдущий год
                        } else if (index >= 1 && index <= 12) {
                          // Месяцы текущего года (index 1 = январь = месяц 0)
                          monthForFilter = index - 1;
                          yearForFilter = displayYear; // Текущий год
                        } else if (index === 13) {
                          // Без даты
                          monthForFilter = -1;
                          yearForFilter = null;
                        }
                        
                        // Проверяем, выбран ли этот месяц и год
                        const monthKey = monthForFilter === -1 ? -1 : (index === 0 ? -2 : monthForFilter); // -2 для декабря предыдущего года
                        let isSelected = false;
                        if (monthKey !== null && selectedMonths.has(monthKey)) {
                          if (monthForFilter === -1) {
                            // Без даты
                            isSelected = true;
                          } else if (index === 0) {
                            // Декабрь предыдущего года - проверяем, что selectedMonthYear соответствует предыдущему году
                            isSelected = selectedMonthYear === prevYear;
                          } else if (index >= 1 && index <= 12) {
                            // Месяцы текущего года - проверяем только наличие в selectedMonths
                            // selectedMonthYear может быть установлен для декабря предыдущего года, но это не должно мешать выбору месяцев текущего года
                            isSelected = true;
                          }
                        }
                        
                  return (
                          <div key={index} className="flex flex-col items-center relative" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '0 0 calc((100% - 24px) / 13)' }}>
                            {/* Столбец */}
                            <div 
                              className={`w-full rounded-t transition-colors relative group cursor-pointer ${
                                isNoDate
                                  ? isSelected
                                    ? 'bg-red-700 ring-2 ring-red-400'
                                    : 'bg-red-500 hover:bg-red-600'
                                  : isSelected 
                                    ? 'bg-blue-700 ring-2 ring-blue-400' 
                                    : count > 0 
                                      ? 'bg-blue-500 hover:bg-blue-600' 
                                      : 'bg-gray-200'
                              }`}
                              style={{ 
                                height: `${columnHeight}px`,
                                minHeight: count > 0 ? '2px' : '0px',
                                maxHeight: containerHeight + 'px',
                                flexShrink: 0
                              }}
                              title={`${monthLabels[index]}: ${count} закупок`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (monthForFilter !== null) {
                                  const currentDisplayYear = selectedYear || chartData[0]?.year || new Date().getFullYear();
                                  const currentPrevYear = currentDisplayYear - 1;
                                  const monthKey = monthForFilter === -1 ? -1 : (index === 0 ? -2 : monthForFilter); // -2 для декабря предыдущего года
                                  // Упрощенная проверка: для месяцев текущего года проверяем только наличие в selectedMonths
                                  // Для декабря предыдущего года проверяем также selectedMonthYear
                                  const isCurrentlySelected = selectedMonths.has(monthKey) && 
                                    (monthForFilter === -1 || 
                                     (index === 0 && selectedMonthYear === currentPrevYear) || 
                                     (index >= 1 && index <= 12)); // Для месяцев текущего года достаточно наличия в selectedMonths
                                  
                                  // Явно проверяем, что Shift нажат
                                  const shiftPressed = Boolean(e.shiftKey);
                                  
                                  // Shift+клик: выбираем диапазон месяцев ТОЛЬКО если Shift явно нажат
                                  if (shiftPressed && lastSelectedMonthIndex !== null && lastSelectedMonthIndex !== index && !isCurrentlySelected) {
                                    // Shift+клик: выбираем диапазон месяцев
                                    const startIndex = Math.min(lastSelectedMonthIndex, index);
                                    const endIndex = Math.max(lastSelectedMonthIndex, index);
                                    const newSelectedMonths = new Set(selectedMonths);
                                    
                                    for (let i = startIndex; i <= endIndex; i++) {
                                      let monthKeyForRange: number;
                                      let yearForRange: number | null = null;
                                      
                                      if (i === 0) {
                                        // Декабрь предыдущего года
                                        monthKeyForRange = -2;
                                        yearForRange = currentPrevYear;
                                      } else if (i >= 1 && i <= 12) {
                                        // Месяцы текущего года
                                        monthKeyForRange = i - 1;
                                        yearForRange = null;
                                      } else if (i === 13) {
                                        // Без даты
                                        monthKeyForRange = -1;
                                        yearForRange = null;
                                      } else {
                                        continue;
                                      }
                                      
                                      newSelectedMonths.add(monthKeyForRange);
                                      
                                      // Устанавливаем selectedMonthYear, если это декабрь предыдущего года
                                      if (i === 0 && yearForRange !== null) {
                                        setSelectedMonthYear(yearForRange);
                                      }
                                    }
                                    
                                    setSelectedMonths(newSelectedMonths);
                                    setLastSelectedMonthIndex(index);
                                    return;
                                  }
                                  
                                  // Обычный клик (БЕЗ Shift): выбираем только один месяц (сбрасываем предыдущий выбор)
                                  const newSelectedMonths = new Set<number>();
                                  
                                  if (!isCurrentlySelected) {
                                    // Если месяц не выбран, выбираем только его
                                    newSelectedMonths.add(monthKey);
                                    // Если это декабрь предыдущего года, сохраняем год для фильтрации по месяцу
                                    if (index === 0 && yearForFilter !== null) {
                                      setSelectedMonthYear(yearForFilter);
                                    } else if (index >= 1 && index <= 12) {
                                      // Для месяцев текущего года сбрасываем selectedMonthYear
                                      setSelectedMonthYear(null);
                                      // Для месяцев текущего года устанавливаем текущий год (если он не установлен)
                                      if (yearForFilter !== null && selectedYear === null) {
                                        setSelectedYear(yearForFilter);
                                      }
                                    } else if (monthForFilter === -1) {
                                      // Без даты
                                      setSelectedMonthYear(null);
                                    }
                                  } else {
                                    // Если месяц уже выбран, снимаем выбор (оставляем пустым)
                                    setSelectedMonthYear(null);
                                  }
                                  
                                  setSelectedMonths(newSelectedMonths);
                                  // Устанавливаем lastSelectedMonthIndex только при обычном клике (без Shift)
                                  // Это нужно для последующего Shift+клик выбора диапазона
                                  setLastSelectedMonthIndex(index);
                                }
                              }}
                            >
                              {/* Число на столбце (всегда показываем внутри столбца, белым цветом) */}
                              {count > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold whitespace-nowrap pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                  {count}
                                </div>
                              )}
                            </div>
                            {/* Подпись месяца */}
                            <div className={`text-[8px] text-center ${isSelected ? 'font-bold text-blue-700' : 'text-gray-500'}`} style={{ lineHeight: '1' }}>
                              {monthLabels[index]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                    </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 border-t-2 border-gray-400">
            {hasData ? (
              data?.content.map((item) => {
                const isExpanded = expandedRows.has(item.id);
                const isInactive = item.status === 'Исключена';
                return (
                  <React.Fragment key={item.id}>
                <tr 
                      className={`${isInactive ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'} cursor-pointer`}
                      onDoubleClick={(e) => handleRowClick(item.id, e)}
                >
                        {visibleColumns.has('id') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 text-center ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('id')}px`, minWidth: `${getColumnWidth('id')}px`, maxWidth: `${getColumnWidth('id')}px` }}>
                    {item.id}
                  </td>
                  )}
                        {visibleColumns.has('company') && (
                  <td className={`px-2 py-2 text-xs border-r border-gray-200 relative ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('company')}px`, minWidth: `${getColumnWidth('company')}px`, maxWidth: `${getColumnWidth('company')}px` }}>
                    <select
                      ref={editingCompany === item.id ? companySelectRef : null}
                      data-editing-company={item.id}
                      value={item.company || ''}
                      disabled={isInactive || isViewingArchiveVersion || !canEdit}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (canEdit && e.target.value !== item.company) {
                          handleCompanyUpdate(item.id, e.target.value);
                        }
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        if (canEdit) {
                          setEditingCompany(item.id);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setEditingCompany(null);
                        }, 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingCompany(null);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canEdit) {
                          setEditingCompany(item.id);
                        }
                      }}
                      className={`text-xs rounded px-2 py-0.5 font-medium cursor-pointer transition-all w-full ${
                        isInactive
                          ? 'bg-gray-100 text-gray-500 border-0 cursor-not-allowed'
                          : editingCompany === item.id
                          ? 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                          : 'bg-gray-100 text-gray-800 border-0'
                      }`}
                      style={{
                        ...(isInactive || editingCompany === item.id ? {} : {
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          paddingRight: '20px',
                          backgroundImage: item.company ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 4px center',
                          backgroundSize: '12px',
                        })
                      }}
                    >
                      {availableCompanies.map((company) => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </td>
                  )}
                  {visibleColumns.has('purchaseRequestId') && (
                  <td className={`px-2 py-2 text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('purchaseRequestId')}px`, minWidth: `${getColumnWidth('purchaseRequestId')}px`, maxWidth: `${getColumnWidth('purchaseRequestId')}px` }}>
                    {editingPurchaseRequestId === item.id ? (
                      <input
                        ref={purchaseRequestIdInputRef}
                        type="number"
                        defaultValue={item.purchaseRequestId?.toString() || ''}
                        onBlur={(e) => {
                          const newValue = e.target.value.trim();
                          const currentValue = item.purchaseRequestId?.toString() || '';
                          if (canEdit && newValue !== currentValue) {
                            handlePurchaseRequestIdUpdate(item.id, newValue || null);
                          } else {
                            setEditingPurchaseRequestId(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'Escape') {
                            setEditingPurchaseRequestId(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => {
                          e.stopPropagation();
                          if (canEdit) {
                            setEditingPurchaseRequestId(item.id);
                          }
                        }}
                        className="w-full text-xs border border-blue-500 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isInactive || isViewingArchiveVersion || !canEdit}
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => {
                          if (!isInactive && !isViewingArchiveVersion && canEdit) {
                            setEditingPurchaseRequestId(item.id);
                          }
                        }}
                        className={isInactive || isViewingArchiveVersion || !canEdit ? '' : 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors'}
                        title={isInactive || isViewingArchiveVersion || !canEdit ? '' : 'Нажмите для редактирования'}
                      >
                        {item.purchaseRequestId || '-'}
                      </div>
                    )}
                  </td>
                  )}
                        {visibleColumns.has('cfo') && (
                        <td 
                          className={`px-2 py-2 text-xs border-r border-gray-200 relative ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
                          style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px` }}
                        >
                          {creatingNewCfo === item.id ? (
                            <input
                              ref={cfoInputRef}
                              type="text"
                              value={cfoInputValue[item.id] !== undefined ? cfoInputValue[item.id] : ''}
                              disabled={isInactive || isViewingArchiveVersion || !canEdit}
                              onChange={(e) => {
                                e.stopPropagation();
                                setCfoInputValue(prev => ({ ...prev, [item.id]: e.target.value }));
                              }}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (canEdit && value) {
                                  handleCfoUpdate(item.id, value);
                                } else {
                                  setCreatingNewCfo(null);
                                  setCfoInputValue(prev => {
                                    const newValue = { ...prev };
                                    delete newValue[item.id];
                                    return newValue;
                                  });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setCreatingNewCfo(null);
                                  setCfoInputValue(prev => {
                                    const newValue = { ...prev };
                                    delete newValue[item.id];
                                    return newValue;
                                  });
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const value = cfoInputValue[item.id] !== undefined ? cfoInputValue[item.id] : '';
                                  if (value.trim()) {
                                    handleCfoUpdate(item.id, value.trim());
                                  } else {
                                    setCreatingNewCfo(null);
                                    setCfoInputValue(prev => {
                                      const newValue = { ...prev };
                                      delete newValue[item.id];
                                      return newValue;
                                    });
                                  }
                                }
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className={`text-xs rounded px-2 py-0.5 font-medium transition-all w-full ${
                                isInactive
                                  ? 'bg-gray-100 text-gray-500 border-0 cursor-not-allowed'
                                  : 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                              }`}
                              placeholder="Введите новое ЦФО"
                              autoFocus
                            />
                          ) : (
                            <select
                              ref={editingCfo === item.id ? cfoSelectRef : null}
                              data-editing-cfo={item.id}
                              value={item.cfo || ''}
                              disabled={isInactive || isViewingArchiveVersion || !canEdit}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.value === '__CREATE_NEW__') {
                                  setCreatingNewCfo(item.id);
                                  setCfoInputValue(prev => ({ ...prev, [item.id]: '' }));
                                  setEditingCfo(null);
                                } else if (canEdit && e.target.value !== item.cfo) {
                                  handleCfoUpdate(item.id, e.target.value || null);
                                }
                              }}
                              onMouseDown={(e) => {
                                if (!isInactive && !isViewingArchiveVersion) {
                                  e.stopPropagation();
                                  setEditingCfo(item.id);
                                  // Даем возможность браузеру открыть dropdown
                                  setTimeout(() => {
                                    if (cfoSelectRef.current) {
                                      cfoSelectRef.current.focus();
                                    }
                                  }, 0);
                                }
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                setEditingCfo(item.id);
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setEditingCfo(null);
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingCfo(null);
                                }
                              }}
                              className={`text-xs rounded px-2 py-0.5 font-medium cursor-pointer transition-all w-full ${
                                isInactive
                                  ? 'bg-gray-100 text-gray-500 border-0 cursor-not-allowed'
                                  : editingCfo === item.id
                                  ? 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                                  : 'bg-gray-100 text-gray-800 border-0'
                              }`}
                              style={{
                                ...(isInactive || editingCfo === item.id ? {} : {
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  MozAppearance: 'none',
                                  paddingRight: '20px',
                                  backgroundImage: item.cfo ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'right 4px center',
                                  backgroundSize: '12px',
                              })
                              }}
                            >
                              <option value="">-</option>
                              <option value="__CREATE_NEW__" style={{ fontStyle: 'italic', color: '#3b82f6' }}>
                                + Создать новое ЦФО...
                              </option>
                              {getUniqueValues('cfo')
                                .slice()
                                .sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
                                .map((cfo) => (
                                  <option key={cfo} value={cfo}>
                                    {cfo}
                                  </option>
                                ))}
                            </select>
                          )}
                        </td>
                        )}
                        {visibleColumns.has('purchaseSubject') && (
                        <td 
                          className={`px-2 py-2 text-xs border-r border-gray-200 relative purchase-subject-column ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
                          data-column="purchaseSubject"
                          style={{ 
                            width: `${getColumnWidth('purchaseSubject')}px`, 
                            minWidth: `${getColumnWidth('purchaseSubject')}px`, 
                            maxWidth: `${getColumnWidth('purchaseSubject')}px`,
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                          data-print-width="96"
                        >
                          {editingPurchaseSubject === item.id ? (
                            <textarea
                              ref={purchaseSubjectInputRef}
                              data-editing-purchase-subject={item.id}
                              defaultValue={item.purchaseSubject || ''}
                              onBlur={(e) => {
                                const newValue = e.target.value.trim();
                                if (canEdit && newValue !== (item.purchaseSubject || '')) {
                                  handlePurchaseSubjectUpdate(item.id, newValue);
                                } else {
                                  setEditingPurchaseSubject(null);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  if (canEdit) {
                                    const newValue = e.currentTarget.value.trim();
                                    if (newValue !== (item.purchaseSubject || '')) {
                                      handlePurchaseSubjectUpdate(item.id, newValue);
                                    } else {
                                      setEditingPurchaseSubject(null);
                                    }
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingPurchaseSubject(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => {
                                e.stopPropagation();
                                if (canEdit) {
                                  setEditingPurchaseSubject(item.id);
                                  // Автоматически подстраиваем размер под содержимое
                                  const textarea = e.target as HTMLTextAreaElement;
                                  textarea.style.height = 'auto';
                                  textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                                }
                              }}
                              onChange={(e) => {
                                // Автоматически подстраиваем размер при вводе
                                const textarea = e.target as HTMLTextAreaElement;
                                textarea.style.height = 'auto';
                                textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                              }}
                              className="w-full text-xs border border-blue-500 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                              disabled={isInactive || !canEdit}
                              autoFocus
                              rows={1}
                              style={{ minHeight: '20px', maxHeight: '200px' }}
                            />
                          ) : (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isInactive && !isViewingArchiveVersion && canEdit) {
                                  setEditingPurchaseSubject(item.id);
                                }
                              }}
                              className={isInactive || !canEdit ? 'break-words' : 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors break-words'}
                              title={isInactive || !canEdit ? '' : 'Нажмите для редактирования'}
                            >
                              {item.purchaseSubject || '-'}
                            </div>
                          )}
                        </td>
                        )}
                        {visibleColumns.has('purchaser') && (
                        <td 
                          className={`px-2 py-2 text-xs truncate border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
                          title={item.purchaser || ''}
                          style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px` }}
                        >
                          {item.purchaser || '-'}
                        </td>
                        )}
                        {visibleColumns.has('budgetAmount') && (
                        <td 
                          className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}
                          style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px` }}
                        >
                          {item.budgetAmount ? new Intl.NumberFormat('ru-RU', { 
                            notation: 'compact',
                            maximumFractionDigits: 1 
                          }).format(item.budgetAmount) : '-'}
                  </td>
                  )}
                  {visibleColumns.has('requestDate') && (
                  <td 
                    className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${
                      animatingDates[item.id] ? 'animate-pulse bg-blue-50 text-blue-700 font-semibold' : isInactive ? 'text-gray-500' : 'text-gray-900'
                    }`}
                          style={{ width: `${getColumnWidth('requestDate')}px`, minWidth: `${getColumnWidth('requestDate')}px`, maxWidth: `${getColumnWidth('requestDate')}px` }}
                        >
                    {!isInactive && editingDate?.itemId === item.id && editingDate?.field === 'requestDate' ? (
                      <input
                        type="date"
                        data-editing-date={`${item.id}-requestDate`}
                        autoFocus
                        min={item.year ? `${item.year - 1}-12-01` : undefined}
                        max={item.year ? `${item.year}-12-31` : undefined}
                        defaultValue={item.requestDate ? item.requestDate.split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleDateUpdate(item.id, 'requestDate', e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          if (!e.target.value) {
                            setEditingDate(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingDate(null);
                          }
                        }}
                        className="w-full text-xs border border-blue-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div
                        onClick={(e) => {
                          if (!isInactive && !isViewingArchiveVersion && canEdit) {
                            e.stopPropagation();
                            setEditingDate({ itemId: item.id, field: 'requestDate' });
                          }
                        }}
                        className={isInactive || !canEdit ? '' : 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors'}
                        title={isInactive || !canEdit ? '' : 'Нажмите для редактирования'}
                      >
                        {tempDates[item.id]?.requestDate 
                          ? new Date(tempDates[item.id]!.requestDate!).toLocaleDateString('ru-RU')
                          : (item.requestDate ? new Date(item.requestDate).toLocaleDateString('ru-RU') : '-')}
                      </div>
                    )}
                  </td>
                  )}
                  {visibleColumns.has('newContractDate') && (
                  <td 
                    className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${
                      animatingDates[item.id] ? 'animate-pulse bg-blue-50 text-blue-700 font-semibold' : isInactive ? 'text-gray-500' : 'text-gray-900'
                    }`}
                          style={{ width: `${getColumnWidth('newContractDate')}px`, minWidth: `${getColumnWidth('newContractDate')}px`, maxWidth: `${getColumnWidth('newContractDate')}px` }}
                        >
                      <div
                        className={isInactive ? 'text-gray-500' : 'text-gray-900 bg-gray-50 rounded px-1 py-0.5'}
                        title={item.complexity && item.requestDate ? `Рассчитано автоматически: дата заявки + ${getWorkingDaysByComplexity(item.complexity)} рабочих дней (сложность ${item.complexity})` : 'Рассчитывается автоматически на основе даты заявки и сложности'}
                      >
                        {tempDates[item.id]?.newContractDate 
                          ? new Date(tempDates[item.id]!.newContractDate!).toLocaleDateString('ru-RU')
                          : (item.newContractDate ? new Date(item.newContractDate).toLocaleDateString('ru-RU') : '-')}
                      </div>
                  </td>
                  )}
                  {visibleColumns.has('guid') && (
                  <td className={`px-2 py-2 text-xs truncate border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} title={item.guid} style={{ width: `${getColumnWidth('guid')}px`, minWidth: `${getColumnWidth('guid')}px`, maxWidth: `${getColumnWidth('guid')}px` }}>
                    {item.guid || '-'}
                  </td>
                  )}
                  {visibleColumns.has('year') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 text-center ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('year')}px`, minWidth: `${getColumnWidth('year')}px`, maxWidth: `${getColumnWidth('year')}px` }}>
                    {item.year || '-'}
                  </td>
                  )}
                  {visibleColumns.has('product') && (
                  <td className={`px-2 py-2 text-xs break-words border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('product')}px`, minWidth: `${getColumnWidth('product')}px`, maxWidth: `${getColumnWidth('product')}px` }}>
                    {item.product || '-'}
                  </td>
                  )}
                  {visibleColumns.has('currentKa') && (
                  <td className={`px-2 py-2 text-xs truncate border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} title={item.currentKa || ''} style={{ width: `${getColumnWidth('currentKa')}px`, minWidth: `${getColumnWidth('currentKa')}px`, maxWidth: `${getColumnWidth('currentKa')}px` }}>
                    {item.currentKa || '-'}
                  </td>
                  )}
                  {visibleColumns.has('currentAmount') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('currentAmount')}px`, minWidth: `${getColumnWidth('currentAmount')}px`, maxWidth: `${getColumnWidth('currentAmount')}px` }}>
                    {item.currentAmount ? new Intl.NumberFormat('ru-RU', { 
                      notation: 'compact',
                      maximumFractionDigits: 1 
                    }).format(item.currentAmount) : '-'}
                  </td>
                  )}
                  {visibleColumns.has('currentContractAmount') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('currentContractAmount')}px`, minWidth: `${getColumnWidth('currentContractAmount')}px`, maxWidth: `${getColumnWidth('currentContractAmount')}px` }}>
                    {item.currentContractAmount ? new Intl.NumberFormat('ru-RU', { 
                      notation: 'compact',
                      maximumFractionDigits: 1 
                    }).format(item.currentContractAmount) : '-'}
                  </td>
                  )}
                  {visibleColumns.has('currentContractBalance') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('currentContractBalance')}px`, minWidth: `${getColumnWidth('currentContractBalance')}px`, maxWidth: `${getColumnWidth('currentContractBalance')}px` }}>
                    {item.currentContractBalance ? new Intl.NumberFormat('ru-RU', { 
                      notation: 'compact',
                      maximumFractionDigits: 1 
                    }).format(item.currentContractBalance) : '-'}
                  </td>
                  )}
                  {visibleColumns.has('currentContractEndDate') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('currentContractEndDate')}px`, minWidth: `${getColumnWidth('currentContractEndDate')}px`, maxWidth: `${getColumnWidth('currentContractEndDate')}px` }}>
                    {item.currentContractEndDate ? new Date(item.currentContractEndDate).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  )}
                  {visibleColumns.has('complexity') && (
                  <td className={`px-2 py-2 text-xs truncate border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} title={item.complexity || ''} style={{ width: `${getColumnWidth('complexity')}px`, minWidth: `${getColumnWidth('complexity')}px`, maxWidth: `${getColumnWidth('complexity')}px` }}>
                    {item.complexity || '-'}
                  </td>
                  )}
                  {visibleColumns.has('category') && (
                  <td className={`px-2 py-2 text-xs truncate border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} title={item.category || ''} style={{ width: `${getColumnWidth('category')}px`, minWidth: `${getColumnWidth('category')}px`, maxWidth: `${getColumnWidth('category')}px` }}>
                    {item.category || '-'}
                  </td>
                  )}
                  {visibleColumns.has('status') && (
                  <td className="px-2 py-2 text-xs border-r border-gray-200 relative" style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px` }}>
                    {(() => {
                      // Если есть purchaseRequestId, показываем статус "Заявка"
                      const hasPurchaseRequest = item.purchaseRequestId !== null;
                      const displayStatus = hasPurchaseRequest ? 'Заявка' : item.status;
                      const isFromPurchaseRequest = hasPurchaseRequest;
                      
                      return (
                    <select
                      ref={editingStatus === item.id ? statusSelectRef : null}
                      data-editing-status={item.id}
                          value={displayStatus || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (canEdit && e.target.value !== displayStatus) {
                          handleStatusUpdate(item.id, e.target.value);
                        }
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        if (canEdit) {
                          setEditingStatus(item.id);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setEditingStatus(null);
                        }, 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingStatus(null);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canEdit) {
                          setEditingStatus(item.id);
                        }
                      }}
                      className={`text-xs rounded px-2 py-0.5 font-medium cursor-pointer transition-all ${
                        editingStatus === item.id 
                          ? 'border border-blue-500 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500' 
                              : displayStatus === 'В плане'
                          ? 'bg-green-100 text-green-800 border-0'
                              : displayStatus === 'Исключена'
                          ? 'bg-red-100 text-red-800 border-0'
                              : displayStatus === 'Проект'
                          ? 'bg-blue-100 text-blue-800 border-0'
                              : displayStatus === 'Заявка'
                              ? 'bg-purple-100 text-purple-800 border-0'
                          : 'bg-gray-100 text-gray-800 border-0'
                      }`}
                      style={{
                        ...(editingStatus === item.id ? {} : {
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          paddingRight: '20px',
                              backgroundImage: displayStatus ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 4px center',
                          backgroundSize: '12px',
                        })
                      }}
                    >
                      <option value="">-</option>
                          {isFromPurchaseRequest ? (
                            // Если есть заявка, показываем "Заявка" (disabled) и можно выбрать только "Исключена"
                            <>
                              <option value="Заявка" disabled>Заявка</option>
                              <option value="Исключена">Исключена</option>
                            </>
                          ) : (
                            // Если нет заявки, можно выбрать все статусы
                            <>
                      <option value="Проект">Проект</option>
                      <option value="В плане">В плане</option>
                      <option value="Исключена">Исключена</option>
                            </>
                          )}
                    </select>
                      );
                    })()}
                  </td>
                  )}
                  {visibleColumns.has('createdAt') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('createdAt')}px`, minWidth: `${getColumnWidth('createdAt')}px`, maxWidth: `${getColumnWidth('createdAt')}px` }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  )}
                  {visibleColumns.has('updatedAt') && (
                  <td className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('updatedAt')}px`, minWidth: `${getColumnWidth('updatedAt')}px`, maxWidth: `${getColumnWidth('updatedAt')}px` }}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  )}
                  <td 
                    className="px-1 py-1 border-r border-gray-200 overflow-hidden relative" 
                    style={{ width: '350px', minWidth: '350px', contain: 'layout style paint' }}
                    data-gantt-chart="true"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative w-full overflow-hidden" style={{ contain: 'layout style paint' }}>
                    <GanttChart
                      itemId={item.id}
                      year={item.year}
                      requestDate={item.requestDate}
                      newContractDate={item.newContractDate}
                      contractEndDate={item.contractEndDate}
                      currentContractEndDate={item.currentContractEndDate}
                      disabled={isInactive || isViewingArchiveVersion || !canEdit}
                      onDragStart={() => {
                        // Закрываем режим редактирования даты при начале перетаскивания Ганта
                        if (editingDate?.itemId === item.id) {
                          setEditingDate(null);
                        }
                      }}
                      onDatesChange={(requestDate, newContractDate) => {
                        // Обновляем временные даты при перетаскивании
                        setTempDates(prev => ({
                          ...prev,
                          [item.id]: { requestDate, newContractDate }
                        }));
                        // Запускаем анимацию
                        setAnimatingDates(prev => ({
                          ...prev,
                          [item.id]: true
                        }));
                      }}
                      onDatesUpdate={(requestDate, newContractDate) => {
                        // Пересчитываем newContractDate на основе requestDate и сложности
                        let finalNewContractDate = newContractDate;
                        if (item.complexity && requestDate) {
                          const calculatedDate = calculateNewContractDate(requestDate, item.complexity);
                          if (calculatedDate) {
                            finalNewContractDate = calculatedDate;
                          }
                        }
                        
                        // Временно обновляем данные в таблице для визуального отображения
                        if (data) {
                          const updatedContent = data.content.map(i => 
                            i.id === item.id 
                              ? { ...i, requestDate, newContractDate: finalNewContractDate }
                              : i
                          );
                          setData({ ...data, content: updatedContent });
                        }
                        
                        // Сразу сохраняем изменения без проверки пароля
                        performGanttDateUpdate(item.id, requestDate, finalNewContractDate);
                      }}
                    />
                    </div>
                  </td>
                </tr>
                    {/* Подстрока при раскрытии */}
                    {isExpanded && (
                      <tr className="bg-blue-50 border-t-2 border-blue-300">
                        <td colSpan={visibleColumns.size + 1} className="px-2 py-1">
                          {/* Вкладки */}
                          <div className="mb-1 border-b border-blue-200">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setActiveTab(prev => ({ ...prev, [item.id]: 'data' }))}
                                className={`px-3 py-1 text-xs font-medium rounded-t-lg transition-colors ${
                                  activeTab[item.id] === 'data' || !activeTab[item.id]
                                    ? 'bg-white text-blue-700 border-b-2 border-blue-500'
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                              >
                                Данные
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab(prev => ({ ...prev, [item.id]: 'changes' }));
                                  if (!changesData[item.id] || changesData[item.id].content.length === 0) {
                                    fetchChanges(item.id, 0);
                                  }
                                }}
                                className={`px-3 py-1 text-xs font-medium rounded-t-lg transition-colors ${
                                  activeTab[item.id] === 'changes'
                                    ? 'bg-white text-blue-700 border-b-2 border-blue-500'
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                              >
                                Изменения
                              </button>
                              {item.purchaseRequestId && (
                                <button
                                  onClick={() => {
                                    setActiveTab(prev => ({ ...prev, [item.id]: 'purchaseRequest' }));
                                    if (!purchaseRequestData[item.id] || !purchaseRequestData[item.id].data) {
                                      if (item.purchaseRequestId !== null) {
                                      fetchPurchaseRequest(item.id, item.purchaseRequestId);
                                      }
                                    }
                                  }}
                                  className={`px-3 py-1 text-xs font-medium rounded-t-lg transition-colors ${
                                    activeTab[item.id] === 'purchaseRequest'
                                      ? 'bg-white text-blue-700 border-b-2 border-blue-500'
                                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                  }`}
                                >
                                  Данные о заявке
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Содержимое вкладки "Данные" */}
                          {(activeTab[item.id] === 'data' || !activeTab[item.id]) && (
                            <div className="text-xs text-gray-700">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 gap-y-0.5">
                              <div>
                                <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">ID:</span> <span className="text-gray-900">{item.id}</span></span>
                              </div>
                              {item.guid && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200 break-all"><span className="font-semibold text-blue-700">GUID:</span> <span className="text-gray-900">{item.guid}</span></span>
                                </div>
                              )}
                              {item.company && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Компания:</span> <span className="text-gray-900">{item.company}</span></span>
                                </div>
                              )}
                              {item.purchaseSubject && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Предмет закупки:</span> <span className="text-gray-900">{item.purchaseSubject}</span></span>
                                </div>
                              )}
                              {item.purchaser && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Закупщик:</span> <span className="text-gray-900">{item.purchaser}</span></span>
                                </div>
                              )}
                              {item.product && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Продукт:</span> <span className="text-gray-900">{item.product}</span></span>
                                </div>
                              )}
                              {item.budgetAmount && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Бюджет:</span> <span className="text-gray-900">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.budgetAmount)}</span></span>
                                </div>
                              )}
                              {item.complexity && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Сложность:</span> <span className="text-gray-900">{item.complexity}</span></span>
                                </div>
                              )}
                              {item.category && (
                                <div>
                                  <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Категория:</span> <span className="text-gray-900">{item.category}</span></span>
                                </div>
                              )}
                              <div>
                                <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Есть договор:</span> <span className="text-gray-900">{item.hasContract === true ? 'Да' : item.hasContract === false ? 'Нет' : '-'}</span></span>
                              </div>
                              <div>
                                <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Автопролонгация:</span> <span className="text-gray-900">{item.autoRenewal === true ? 'Да' : item.autoRenewal === false ? 'Нет' : '-'}</span></span>
                              </div>
                            </div>
                          </div>
                          )}
                          
                          {/* Содержимое вкладки "Данные о заявке" */}
                          {activeTab[item.id] === 'purchaseRequest' && item.purchaseRequestId && (
                            <div className="text-xs text-gray-700">
                              {purchaseRequestData[item.id]?.loading ? (
                                <div className="text-center py-2">Загрузка...</div>
                              ) : purchaseRequestData[item.id]?.data ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 gap-y-0.5">
                                  {purchaseRequestData[item.id]!.data!.idPurchaseRequest && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Номер заявки:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.idPurchaseRequest}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.purchaseRequestCreationDate && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Дата создания:</span> <span className="text-gray-900">{new Date(purchaseRequestData[item.id]!.data!.purchaseRequestCreationDate!).toLocaleDateString('ru-RU')}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.innerId && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Внутренний ID:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.innerId}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.name && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Наименование:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.name}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.title && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Заголовок:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.title}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.purchaseRequestPlanYear && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Год планирования:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.purchaseRequestPlanYear}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.company && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Компания:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.company}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.cfo && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">ЦФО:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.cfo}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.mcc && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">МЦЦ:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.mcc}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.purchaseRequestInitiator && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Инициатор:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.purchaseRequestInitiator}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.purchaser && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Закупщик:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.purchaser}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.purchaseRequestSubject && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Предмет закупки:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.purchaseRequestSubject}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.budgetAmount && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Бюджет:</span> <span className="text-gray-900">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(purchaseRequestData[item.id]!.data!.budgetAmount!)}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.costType && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Тип затрат:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.costType}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.contractType && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Тип договора:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.contractType}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.contractDurationMonths && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Длительность договора (мес.):</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.contractDurationMonths}</span></span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Запланировано:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.isPlanned === true ? 'Да' : purchaseRequestData[item.id]!.data!.isPlanned === false ? 'Нет' : '-'}</span></span>
                                  </div>
                                  <div>
                                    <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Требуется закупка:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.requiresPurchase === true ? 'Да' : purchaseRequestData[item.id]!.data!.requiresPurchase === false ? 'Нет' : '-'}</span></span>
                                  </div>
                                  {purchaseRequestData[item.id]!.data!.status && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Статус:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.status}</span></span>
                                    </div>
                                  )}
                                  {purchaseRequestData[item.id]!.data!.state && (
                                    <div>
                                      <span className="inline-block bg-white px-1 py-0.5 rounded border border-blue-200"><span className="font-semibold text-blue-700">Состояние:</span> <span className="text-gray-900">{purchaseRequestData[item.id]!.data!.state}</span></span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-2 text-gray-500">Заявка не найдена</div>
                              )}
                          </div>
                          )}
                          
                          {/* Содержимое вкладки "Изменения" */}
                          {activeTab[item.id] === 'changes' && (
                            <div className="text-xs text-gray-700">
                              {changesData[item.id]?.loading ? (
                                <div className="text-center py-1 text-gray-500">Загрузка...</div>
                              ) : changesData[item.id]?.content && changesData[item.id].content.length > 0 ? (
                                <>
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="bg-blue-50 border-b border-blue-200">
                                        <th className="text-left px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 border-r border-blue-200">Поле</th>
                                        <th className="text-left px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 border-r border-blue-200">Было</th>
                                        <th className="text-left px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 border-r border-blue-200">Стало</th>
                                        <th className="text-left px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">Дата</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                    {changesData[item.id].content.map((change: any) => (
                                        <tr key={change.id} className="bg-white border-b border-blue-100 hover:bg-blue-50">
                                          <td className="px-1.5 py-0.5 text-[9px] text-gray-900 border-r border-blue-100">{change.fieldName}</td>
                                          <td className="px-1.5 py-0.5 text-[9px] text-red-600 border-r border-blue-100">{change.valueBefore || '-'}</td>
                                          <td className="px-1.5 py-0.5 text-[9px] text-green-600 border-r border-blue-100">{change.valueAfter || '-'}</td>
                                          <td className="px-1.5 py-0.5 text-[9px] text-gray-500">{new Date(change.changeDate).toLocaleString('ru-RU')}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                  </table>
                                  
                                  {/* Пагинация */}
                                  {changesData[item.id].totalPages > 1 && (
                                    <div className="flex items-center justify-between border-t border-blue-200 pt-1">
                                      <div className="text-[9px] text-gray-500">
                                        Показано {changesData[item.id].content.length} из {changesData[item.id].totalElements}
                                      </div>
                                      <div className="flex gap-0.5">
                                        <button
                                          onClick={() => fetchChanges(item.id, changesData[item.id].currentPage - 1)}
                                          disabled={changesData[item.id].currentPage === 0}
                                          className="px-1.5 py-0.5 text-[9px] bg-white border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Назад
                                        </button>
                                        <span className="px-1.5 py-0.5 text-[9px] text-gray-600">
                                          {changesData[item.id].currentPage + 1} / {changesData[item.id].totalPages}
                                        </span>
                                        <button
                                          onClick={() => fetchChanges(item.id, changesData[item.id].currentPage + 1)}
                                          disabled={changesData[item.id].currentPage >= changesData[item.id].totalPages - 1}
                                          className="px-1.5 py-0.5 text-[9px] bg-white border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Вперед
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-1 text-gray-500">Нет изменений</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        </div>
      </div>

      {/* Модальное окно создания редакции */}
      {isCreateVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIsCreateVersionModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Создать редакцию</h2>
              <button
                onClick={() => setIsCreateVersionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
                <input
                  type="number"
                  value={selectedYear || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание редакции</label>
                <textarea
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Введите описание редакции..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setIsCreateVersionModalOpen(false);
                  setVersionDescription('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (!selectedYear) {
                    alert('Выберите год');
                    return;
                  }
                  try {
                    const response = await fetch(`${getBackendUrl()}/api/purchase-plan-versions`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        year: selectedYear,
                        description: versionDescription || `Редакция от ${new Date().toLocaleDateString('ru-RU')}`,
                        createdBy: 'user', // TODO: получить из контекста пользователя
                      }),
                    });
                    if (response.ok) {
                      setIsCreateVersionModalOpen(false);
                      setVersionDescription('');
                      alert('Редакция успешно создана');
                    } else {
                      const errorText = await response.text();
                      alert(`Ошибка создания редакции: ${errorText}`);
                    }
                  } catch (error) {
                    console.error('Error creating version:', error);
                    alert('Ошибка создания редакции');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно списка редакций */}
      {isVersionsListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIsVersionsListModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Редакции плана закупок</h2>
              <button
                onClick={() => setIsVersionsListModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Год: <span className="font-medium">{selectedYear || 'Не выбран'}</span></p>
            </div>
            {loadingVersions ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Загрузка...</div>
              </div>
            ) : versions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Редакции не найдены</div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">№</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Описание</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Создано</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Строк</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {versions.map((version) => (
                      <tr 
                        key={version.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${selectedVersionId === version.id ? 'bg-blue-50' : ''}`}
                        onClick={async () => {
                          setSelectedVersionId(version.id);
                          setSelectedVersionInfo(version);
                          // Не закрываем модальное окно, чтобы бейджик не пропадал
                          // setIsVersionsListModalOpen(false);
                          // Если версия текущая, загружаем текущие данные
                          if (version.isCurrent) {
                            fetchData(0, pageSize, selectedYear, sortField, sortDirection, filters, selectedMonths);
                          } else {
                            // Загружаем данные из выбранной архивной версии
                            try {
                              const response = await fetch(`${getBackendUrl()}/api/purchase-plan-versions/${version.id}/items`);
                              if (response.ok) {
                                const versionItems = await response.json();
                                // Преобразуем в формат PageResponse
                                setData({
                                  content: versionItems,
                                  totalElements: versionItems.length,
                                  totalPages: 1,
                                  size: versionItems.length,
                                  number: 0,
                                  first: true,
                                  last: true,
                                  numberOfElements: versionItems.length,
                                  empty: versionItems.length === 0,
                                  pageable: {
                                    pageNumber: 0,
                                    pageSize: versionItems.length,
                                    sort: { sorted: false, unsorted: true, empty: true },
                                    offset: 0,
                                    paged: true,
                                    unpaged: false
                                  },
                                  sort: { sorted: false, unsorted: true, empty: true }
                                });
                                setTotalRecords(versionItems.length);
                              } else {
                                alert('Ошибка загрузки данных версии');
                              }
                            } catch (error) {
                              console.error('Error loading version items:', error);
                              alert('Ошибка загрузки данных версии');
                            }
                          }
                        }}
                      >
                        <td className="px-4 py-2 text-xs text-gray-900">{version.versionNumber}</td>
                        <td className="px-4 py-2 text-xs text-gray-900">{version.description || '-'}</td>
                        <td className="px-4 py-2 text-xs text-gray-900">
                          {version.createdAt ? new Date(version.createdAt).toLocaleString('ru-RU') : '-'}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-900">{version.itemsCount || 0}</td>
                        <td className="px-4 py-2 text-xs text-gray-900">
                          {version.isCurrent ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Текущая</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Архив</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsVersionsListModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


