'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, X, Download, Copy, Clock, Check } from 'lucide-react';
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
  name: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
  status: string | null;
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

export default function PurchaseRequestsTable() {
  const router = useRouter();
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  
  // Состояние для сортировки (по умолчанию сортировка по номеру по убыванию)
  const [sortField, setSortField] = useState<SortField>('idPurchaseRequest');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Состояние для фильтров
  const [filters, setFilters] = useState<Record<string, string>>({
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

  // Состояние для множественных фильтров (чекбоксы)
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  
  // Состояние для открытия/закрытия выпадающих списков
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  
  // Поиск внутри фильтров
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  
  // Позиции для выпадающих списков
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusFilterPosition, setStatusFilterPosition] = useState<{ top: number; left: number } | null>(null);
  
  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null);
  
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

  // Состояние для ширин колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  
  const resizeColumn = useRef<string | null>(null);

  // Состояние для порядка колонок
  const [columnOrder, setColumnOrder] = useState<string[]>(['idPurchaseRequest', 'cfo', 'purchaseRequestInitiator', 'name', 'budgetAmount', 'isPlanned', 'requiresPurchase', 'status', 'track']);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Загружаем сохраненный порядок колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchaseRequestsTableColumnOrder');
      if (saved) {
        const order = JSON.parse(saved);
        // Проверяем, что все колонки присутствуют
        const defaultOrder = ['idPurchaseRequest', 'cfo', 'purchaseRequestInitiator', 'name', 'budgetAmount', 'isPlanned', 'requiresPurchase', 'status', 'track'];
        const validOrder = order.filter((col: string) => defaultOrder.includes(col));
        const missingCols = defaultOrder.filter(col => !validOrder.includes(col));
        setColumnOrder([...validOrder, ...missingCols]);
      }
    } catch (err) {
      console.error('Error loading column order:', err);
    }
  }, []);

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
      name: 192, // w-48 = 12rem = 192px
      budgetAmount: 112, // w-28 = 7rem = 112px
      isPlanned: 80, // w-20 = 5rem = 80px
      requiresPurchase: 96, // w-24 = 6rem = 96px
      purchaseRequestCreationDate: 120,
      costType: 120,
      contractType: 120,
      contractDurationMonths: 120,
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
      
      if (year !== null) {
        params.append('year', String(year));
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
      if (filters.purchaseRequestInitiator && filters.purchaseRequestInitiator.trim() !== '') {
        params.append('purchaseRequestInitiator', filters.purchaseRequestInitiator.trim());
      }
      if (filters.name && filters.name.trim() !== '') {
        params.append('name', filters.name.trim());
      }
      if (filters.costType && filters.costType.trim() !== '') {
        params.append('costType', filters.costType.trim());
      }
      if (filters.contractType && filters.contractType.trim() !== '') {
        params.append('contractType', filters.contractType.trim());
      }
      if (filters.isPlanned && filters.isPlanned.trim() !== '') {
        const isPlannedValue = filters.isPlanned.trim();
        // Преобразуем "Плановая" в "true", "Внеплановая" в "false"
        if (isPlannedValue === 'Плановая') {
          params.append('isPlanned', 'true');
        } else if (isPlannedValue === 'Внеплановая') {
          params.append('isPlanned', 'false');
        }
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
      
      // Фильтр по статусу - передаем все выбранные значения на бэкенд
      if (statusFilter.size > 0) {
        statusFilter.forEach(status => {
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
      
      // Согласования загружаются только при открытии конкретной заявки на закупку
      // Здесь используем только статус из самой заявки
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Debounce для текстовых фильтров
  useEffect(() => {
    // Проверяем, изменились ли текстовые фильтры
    const textFields = ['idPurchaseRequest', 'name', 'budgetAmount', 'contractDurationMonths'];
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

  useEffect(() => {
    fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters);
  }, [currentPage, pageSize, selectedYear, sortField, sortDirection, filters, cfoFilter, statusFilter]);

  // Восстановление фокуса после обновления localFilters
  useEffect(() => {
    if (focusedField) {
      const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
      if (input) {
        // Сохраняем позицию курсора
        const cursorPosition = input.selectionStart || 0;
        const currentValue = input.value;
        
        // Восстанавливаем фокус в следующем тике, чтобы не мешать текущему вводу
        requestAnimationFrame(() => {
          const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
          if (inputAfterRender && inputAfterRender.value === currentValue) {
            inputAfterRender.focus();
            // Восстанавливаем позицию курсора
            const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
            inputAfterRender.setSelectionRange(newPosition, newPosition);
          }
        });
      }
    }
  }, [localFilters, focusedField]);

  // Восстановление фокуса после завершения загрузки данных с сервера
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
            // Используем кэшированные данные
            setAllYears(data.years);
            setUniqueValues(data.uniqueValues);
            return;
          }
        }

        // Загружаем данные, если кэш отсутствует или устарел
        const response = await fetch(`${getBackendUrl()}/api/purchase-requests?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const years = new Set<number>();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
            purchaseRequestInitiator: new Set(),
            costType: new Set(),
            contractType: new Set(),
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
          });
          
          const yearsArray = Array.from(years).sort((a, b) => b - a);
          const uniqueValuesData = {
            cfo: Array.from(values.cfo).sort(),
            purchaseRequestInitiator: Array.from(values.purchaseRequestInitiator).sort(),
          };
          
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
      costType: 'costType',
      contractType: 'contractType',
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

  const handleStatusSelectAll = () => {
    const allStatuses = ['На согласовании', 'На утверждении', 'Утверждена', 'Согласована', 'Не согласована', 'Не утверждена'];
    setStatusFilter(new Set(allStatuses));
    setCurrentPage(0);
  };

  const handleStatusDeselectAll = () => {
    setStatusFilter(new Set());
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
    };

    if (isCfoFilterOpen || isStatusFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCfoFilterOpen, isStatusFilterOpen]);

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

  const getFilteredStatusOptions = () => {
    const allStatuses = ['На согласовании', 'На утверждении', 'Утверждена', 'Согласована', 'Не согласована', 'Не утверждена'];
    if (!statusSearchQuery.trim()) return allStatuses;
    return allStatuses.filter(status => 
      status.toLowerCase().includes(statusSearchQuery.toLowerCase())
    );
  };

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
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">Фильтр по году создания:</span>
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
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              Всего записей: {totalRecords}
            </p>
            <button
              onClick={() => {
                const emptyFilters = {
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
                };
                setFilters(emptyFilters);
                setLocalFilters(emptyFilters);
                setCfoFilter(new Set());
                setStatusFilter(new Set());
                setCfoSearchQuery('');
                setStatusSearchQuery('');
                setSortField(null);
                setSortDirection(null);
                setFocusedField(null);
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
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
      
      <div className="overflow-x-auto relative">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {columnOrder.map(columnKey => {
                const isDragging = draggedColumn === columnKey;
                const isDragOver = dragOverColumn === columnKey;
                
                if (columnKey === 'idPurchaseRequest') {
                  return <SortableHeader key={columnKey} field="idPurchaseRequest" label="Номер" width="w-16" columnKey="idPurchaseRequest" />;
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
                              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                
                if (columnKey === 'purchaseRequestInitiator') {
                  return <SortableHeader key={columnKey} field="purchaseRequestInitiator" label="Инициатор" filterType="select" filterOptions={getUniqueValues('purchaseRequestInitiator')} width="w-12" columnKey="purchaseRequestInitiator" />;
                }
                
                if (columnKey === 'name') {
                  return <SortableHeader key={columnKey} field="name" label="Наименование" width="w-48" columnKey="name" />;
                }
                
                if (columnKey === 'budgetAmount') {
                  return <SortableHeader key={columnKey} field="budgetAmount" label="Бюджет" width="w-28" columnKey="budgetAmount" />;
                }
                
                if (columnKey === 'isPlanned') {
                  return <SortableHeader key={columnKey} field="isPlanned" label="План" filterType="select" filterOptions={['Плановая', 'Внеплановая']} width="w-20" columnKey="isPlanned" />;
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
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
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
                          {getFilteredStatusOptions().length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                          ) : (
                            getFilteredStatusOptions().map((status) => (
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
                  <span className="normal-case min-h-[20px] flex items-center">Статус</span>
                </div>
              </th>
                  );
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
              data?.content.map((request) => (
                <tr 
                  key={request.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    // Не переходим на страницу, если клик был на интерактивном элементе
                    const target = e.target as HTMLElement;
                    if (target.closest('input') || target.closest('select') || target.closest('button') || target.closest('.cursor-col-resize')) {
                      return;
                    }
                    router.push(`/purchase-request/${request.id}`);
                  }}
                >
                  {columnOrder.map(columnKey => {
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
                    
                    if (columnKey === 'budgetAmount') {
                      return (
                        <td 
                          key={columnKey}
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200" 
                          style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px` }}
                        >
                          {request.budgetAmount ? new Intl.NumberFormat('ru-RU', { 
                            notation: 'compact',
                            maximumFractionDigits: 1 
                          }).format(request.budgetAmount) : '-'}
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
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Плановая
                            </span>
                          ) : request.isPlanned === false ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Внеплановая
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
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
                              request.status === 'Утверждена' || request.status === 'Согласована'
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'Не согласована' || request.status === 'Не утверждена'
                                ? 'bg-red-100 text-red-800'
                                : request.status === 'На согласовании' || request.status === 'На утверждении'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                              -
                            </span>
                          )}
                        </td>
                      );
                    }
                    
                    if (columnKey === 'track') {
                      return (
                        <td key={columnKey} className="px-2 py-2 text-xs border-r border-gray-200">
                    <div className="flex items-end gap-2">
                      {/* Заявка - активна */}
                      <div className="flex flex-col items-center gap-0.5">
                        {request.status === 'Утверждена' ? (
                          <div className="relative w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title="Заявка утверждена">
                            <Check className="w-2.5 h-2.5 text-white" />
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
                          {/* Закупка - неактивна */}
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Закупка"></div>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Закупка</span>
                          </div>
                          {/* Договор - неактивна */}
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Договор"></div>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Договор</span>
                          </div>
                        </>
                      ) : (
                        /* Если закупка не требуется: Заявка → Заказ */
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Заказ"></div>
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
                <td colSpan={columnOrder.length} className="px-6 py-8 text-center text-gray-500">
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

