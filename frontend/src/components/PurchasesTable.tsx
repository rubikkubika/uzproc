'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, ArrowUpDown, Download, Copy, Search } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';

interface Purchase {
  id: number;
  purchaseNumber: number | null;
  innerId: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  purchaseInitiator: string | null;
  purchaseCreationDate: string | null;
  budgetAmount: number | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  purchaseRequestId: number | null;
  purchaser: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  content: Purchase[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export default function PurchasesTable() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [sortField, setSortField] = useState<string | null>('purchaseRequestId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({
    innerId: '',
    cfo: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
    purchaseRequestId: '', // Фильтр по номеру заявки
    purchaser: '', // Фильтр по закупщику
  });

  // Локальное состояние для текстовых фильтров (для сохранения фокуса)
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    innerId: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
    purchaseRequestId: '', // Фильтр по номеру заявки
    purchaser: '', // Фильтр по закупщику
  });

  // ID активного поля для восстановления фокуса
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Константы для статусов закупок (только Проект)
  const ALL_STATUSES = ['Проект'];
  // По умолчанию показываем все закупки (включая без статуса), поэтому пустой фильтр
  const DEFAULT_STATUSES: string[] = [];

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
  
  // Состояние для ширин колонок
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeColumn = useRef<string | null>(null);
  
  // Загружаем сохраненные ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchasesTableColumnWidths');
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
      localStorage.setItem('purchasesTableColumnWidths', JSON.stringify(widths));
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
      purchaseRequestId: 100, // Заявка
      innerId: 128, // w-32 = 8rem = 128px
      cfo: 80, // w-20 = 5rem = 80px
      budgetAmount: 150, // Бюджет
      status: 120, // Статус
      purchaser: 150, // Закупщик
    };
    return defaults[columnKey] || 120;
  };
  
  // Функция для получения текущей ширины колонки
  const getColumnWidth = (columnKey: string): number => {
    return columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  };
  
  // Состояние для порядка колонок
  const [columnOrder, setColumnOrder] = useState<string[]>(['purchaseRequestId', 'innerId', 'cfo', 'purchaser', 'budgetAmount', 'status']);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Загружаем сохраненный порядок колонок из localStorage
  useEffect(() => {
    try {
        const saved = localStorage.getItem('purchasesTableColumnOrder');
        if (saved) {
          const order = JSON.parse(saved);
          // Проверяем, что все колонки присутствуют
          const defaultOrder = ['purchaseRequestId', 'innerId', 'cfo', 'purchaser', 'budgetAmount', 'status'];
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
      localStorage.setItem('purchasesTableColumnOrder', JSON.stringify(order));
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

  // Получение уникальных значений для фильтров
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
  });

  // Загружаем общее количество записей без фильтров
  useEffect(() => {
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchases?page=0&size=1`);
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

  // Получаем все годы и уникальные значения из данных
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchases?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const years = new Set<number>();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
          };
          
          result.content.forEach((purchase: Purchase) => {
            // Собираем годы
            if (purchase.purchaseCreationDate) {
              const date = new Date(purchase.purchaseCreationDate);
              const year = date.getFullYear();
              if (!isNaN(year)) {
                years.add(year);
              }
            }
            // Собираем уникальные значения
            if (purchase.cfo) values.cfo.add(purchase.cfo);
          });
          
          const yearsArray = Array.from(years).sort((a, b) => b - a);
          const uniqueValuesData = {
            cfo: Array.from(values.cfo).sort(),
          };
          
          setAllYears(yearsArray);
          setUniqueValues(uniqueValuesData);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setAllYears([currentYear, currentYear - 1, currentYear - 2]);
      }
    };
    fetchMetadata();
  }, [currentYear]);

  const fetchData = async (
    page: number,
    size: number,
    year: number | null = null,
    sortField: string | null = null,
    sortDirection: 'asc' | 'desc' | null = null,
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
      
      // Фильтр по внутреннему ID
      if (filters.innerId && filters.innerId.trim() !== '') {
        params.append('innerId', filters.innerId.trim());
      }
      
      // Фильтр по бюджету (обрабатываем отдельно)
      if (filters.budgetAmountOperator && filters.budgetAmountOperator.trim() !== '' && filters.budgetAmount && filters.budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(filters.budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', filters.budgetAmountOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      
      // Фильтр по ЦФО - передаем все выбранные значения на бэкенд
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }

      // Фильтр по статусу - передаем все выбранные значения на бэкенд
      // Если фильтр пустой, не передаем параметр status, чтобы показать все закупки (включая без статуса)
      if (statusFilter.size > 0) {
        statusFilter.forEach(status => {
          params.append('status', status);
        });
      }

      // Фильтр по номеру заявки
      // Если пусто - не передаем параметр (по умолчанию на бэкенде исключаются закупки без заявки)
      // Если указано число - передаем это число
      // Если указано "null" или "-" - передаем -1 (специальное значение для показа закупок без заявки)
      if (filters.purchaseRequestId && filters.purchaseRequestId.trim() !== '') {
        const requestIdValue = filters.purchaseRequestId.trim();
        if (requestIdValue.toLowerCase() === 'null' || requestIdValue === '-') {
          // Специальное значение для показа закупок без заявки
          params.append('purchaseRequestId', '-1');
        } else {
          const requestIdNumber = parseInt(requestIdValue, 10);
          if (!isNaN(requestIdNumber) && requestIdNumber > 0) {
            params.append('purchaseRequestId', String(requestIdNumber));
          }
        }
      }

      // Фильтр по закупщику
      if (filters.purchaser && filters.purchaser.trim() !== '') {
        params.append('purchaser', filters.purchaser.trim());
      }

      const url = `${getBackendUrl()}/api/purchases?${params.toString()}`;
      const response = await fetch(url);
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

  // Debounce для текстовых фильтров и фильтра бюджета (задержка 500мс)
  useEffect(() => {
    // Проверяем, изменились ли текстовые фильтры
    const textFields = ['innerId', 'purchaseRequestId', 'purchaser'];
    const budgetFields = ['budgetAmount', 'budgetAmountOperator'];
    const hasTextChanges = textFields.some(field => localFilters[field] !== filters[field]);
    const hasBudgetChanges = budgetFields.some(field => localFilters[field] !== filters[field]);
    
    if (hasTextChanges || hasBudgetChanges) {
      const timer = setTimeout(() => {
        setFilters(prev => {
          // Обновляем только измененные текстовые поля и поля бюджета
          const updated = { ...prev };
          textFields.forEach(field => {
            updated[field] = localFilters[field];
          });
          budgetFields.forEach(field => {
            updated[field] = localFilters[field];
          });
          return updated;
        });
        setCurrentPage(0); // Сбрасываем на первую страницу после применения фильтра
      }, 500); // Задержка 500мс

      return () => clearTimeout(timer);
    }
  }, [localFilters, filters]);

  useEffect(() => {
    fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters);
  }, [currentPage, pageSize, selectedYear, sortField, sortDirection, filters, cfoFilter, statusFilter]);

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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const handleSort = (field: string) => {
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
    setCurrentPage(0);
  };

  const handleFilterChange = (field: string, value: string) => {
    // Обновляем локальное состояние для текстовых фильтров
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
    // Фильтры будут применены через debounce в useEffect
  };

  const getUniqueValues = (field: keyof Purchase): string[] => {
    const fieldMap: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo',
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
    setStatusFilter(new Set(ALL_STATUSES));
    setCurrentPage(0);
  };

  const handleStatusDeselectAll = () => {
    setStatusFilter(new Set());
    setCurrentPage(0);
  };

  const getFilteredStatusOptions = () => {
    if (!statusSearchQuery.trim()) return ALL_STATUSES;
    return ALL_STATUSES.filter(status => 
      status.toLowerCase().includes(statusSearchQuery.toLowerCase())
    );
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

  const handleExportToExcel = () => {
    // TODO: Реализовать экспорт в Excel
  };

  const handleCopyToClipboard = async () => {
    // TODO: Реализовать копирование в буфер обмена
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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

  // Функция для рендеринга заголовка колонки
  const renderColumnHeader = (columnKey: string) => {
    const isDragging = draggedColumn === columnKey;
    const isDragOver = dragOverColumn === columnKey;
    
    if (columnKey === 'purchaseRequestId') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('purchaseRequestId')}px`, minWidth: `${getColumnWidth('purchaseRequestId')}px`, maxWidth: `${getColumnWidth('purchaseRequestId')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
              <input
                type="text"
                data-filter-field="purchaseRequestId"
                value={localFilters.purchaseRequestId || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  setLocalFilters(prev => ({
                    ...prev,
                    purchaseRequestId: newValue,
                  }));
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
                  setFocusedField('purchaseRequestId');
                }}
                onBlur={(e) => {
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
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Номер или null"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>
            <div className="flex items-center gap-1 min-h-[20px]">
              <button
                onClick={() => handleSort('purchaseRequestId')}
                className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
              >
                {sortField === 'purchaseRequestId' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                )}
              </button>
              <span className="text-xs font-medium text-gray-500 tracking-wider">Заявка</span>
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'purchaseRequestId')}
            style={{ zIndex: 10 }}
          />
        </th>
      );
    }
    
    if (columnKey === 'innerId') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('innerId')}px`, minWidth: `${getColumnWidth('innerId')}px`, maxWidth: `${getColumnWidth('innerId')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
              <input
                type="text"
                data-filter-field="innerId"
                value={localFilters.innerId || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  setLocalFilters(prev => ({
                    ...prev,
                    innerId: newValue,
                  }));
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
                  setFocusedField('innerId');
                }}
                onBlur={(e) => {
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
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Фильтр"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>
            <div className="flex items-center gap-1 min-h-[20px]">
              <button
                onClick={() => handleSort('innerId')}
                className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
              >
                {sortField === 'innerId' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                )}
              </button>
              <span className="text-xs font-medium text-gray-500 tracking-wider">Внутренний ID</span>
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'innerId')}
            style={{ zIndex: 10 }}
          />
        </th>
      );
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
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
              <div className="relative cfo-filter-container w-full h-full flex-1" style={{ minWidth: 0 }}>
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
              <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">ЦФО</span>
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
    
    if (columnKey === 'status') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
          style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px`, verticalAlign: 'top' }}
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
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'status')}
            style={{ zIndex: 10 }}
          />
        </th>
      );
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
                    const newValue = e.target.value;
                    setLocalFilters(prev => ({
                      ...prev,
                      budgetAmountOperator: newValue,
                    }));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  className="absolute left-0 top-0 h-full text-xs border-0 border-r border-gray-300 rounded-l px-1 py-0 bg-gray-50 focus:outline-none focus:ring-0 appearance-none cursor-pointer z-10 text-gray-700"
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
                    const value = localFilters.budgetAmount || '';
                    if (!value) return '';
                    // Убираем все нецифровые символы для парсинга
                    const numValue = value.replace(/\s/g, '').replace(/,/g, '');
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
                  className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 pl-11 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
    
    if (columnKey === 'purchaser') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
              <input
                type="text"
                data-filter-field="purchaser"
                value={localFilters.purchaser || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  setLocalFilters(prev => ({
                    ...prev,
                    purchaser: newValue,
                  }));
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
                  setFocusedField('purchaser');
                }}
                onBlur={(e) => {
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
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Фильтр"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
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
    
    return null;
  };
  
  // Функция для рендеринга ячейки колонки
  const renderColumnCell = (columnKey: string, item: Purchase) => {
    if (columnKey === 'purchaseRequestId') {
      return (
        <td 
          key={columnKey} 
          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200"
          style={{ width: `${getColumnWidth('purchaseRequestId')}px`, minWidth: `${getColumnWidth('purchaseRequestId')}px`, maxWidth: `${getColumnWidth('purchaseRequestId')}px` }}
        >
          {item.purchaseRequestId || '-'}
        </td>
      );
    }
    
    if (columnKey === 'innerId') {
      return (
        <td 
          key={columnKey} 
          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200"
          style={{ width: `${getColumnWidth('innerId')}px`, minWidth: `${getColumnWidth('innerId')}px`, maxWidth: `${getColumnWidth('innerId')}px` }}
        >
          {item.innerId || '-'}
        </td>
      );
    }
    
    if (columnKey === 'cfo') {
      return (
        <td 
          key={columnKey} 
          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200"
          style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px` }}
        >
          {item.cfo || '-'}
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
          {item.budgetAmount ? new Intl.NumberFormat('ru-RU').format(item.budgetAmount) : '-'}
        </td>
      );
    }
    
    if (columnKey === 'purchaser') {
      return (
        <td 
          key={columnKey} 
          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200"
          style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px` }}
        >
          {item.purchaser || '-'}
        </td>
      );
    }
    
    if (columnKey === 'status') {
      return (
        <td 
          key={columnKey} 
          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200"
          style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px` }}
        >
          {item.status ? (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              item.status === 'Проект'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {item.status}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
              -
            </span>
          )}
        </td>
      );
    }
    
    return null;
  };
  
  // Компонент для заголовка с сортировкой и фильтром
  const SortableHeader = ({ 
    field, 
    label, 
    filterType = 'text',
    width
  }: { 
    field: string | null; 
    label: string;
    filterType?: 'text' | 'select';
    width?: string;
  }) => {
    const isSorted = sortField === field;
    const fieldKey = field || '';
    const filterValue = filterType === 'text' ? (localFilters[fieldKey] || '') : (filters[fieldKey] || '');

    return (
      <th className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 ${width || ''}`} style={{ verticalAlign: 'top', overflow: 'hidden' }}>
        <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
          <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
            {filterType === 'select' ? (
              <select
                value={filterValue}
                onChange={(e) => handleFilterChange(fieldKey, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              >
                <option value="">Все</option>
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
      </th>
    );
  };

  const hasData = data && data.content && data.content.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">Фильтр по году создания:</span>
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
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              Всего записей: {totalRecords}
            </p>
            <button
              onClick={() => {
                const emptyFilters = {
                  innerId: '',
                  cfo: '',
                  budgetAmount: '',
                  budgetAmountOperator: 'gte',
                  purchaseRequestId: '',
                  purchaser: '',
                };
                setFilters(emptyFilters);
                setLocalFilters({ innerId: '', budgetAmount: '', budgetAmountOperator: 'gte', purchaseRequestId: '', purchaser: '' });
                setCfoFilter(new Set());
                setCfoSearchQuery('');
                setSortField('purchaseRequestId');
                setSortDirection('desc');
                setSelectedYear(null);
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
            Страница {currentPage + 1} из {data?.totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= (data?.totalPages || 1) - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
          <button
            onClick={() => setCurrentPage((data?.totalPages || 1) - 1)}
            disabled={currentPage >= (data?.totalPages || 1) - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Последняя
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {columnOrder.map(columnKey => renderColumnHeader(columnKey))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hasData ? (
              data?.content.map((item, index) => (
                <tr 
                  key={index} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    router.push(`/purchase/${item.id}`);
                  }}
                >
                  {columnOrder.map(columnKey => renderColumnCell(columnKey, item))}
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

