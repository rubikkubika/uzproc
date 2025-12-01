'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import GanttChart from './GanttChart';

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
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  content: PurchasePlanItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

type SortField = keyof PurchasePlanItem | null;
type SortDirection = 'asc' | 'desc' | null;

export default function PurchasePlanItemsTable() {
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  
  // Состояние для сортировки
  const [sortField, setSortField] = useState<SortField>('requestDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Состояние для фильтров
  const [filters, setFilters] = useState<Record<string, string>>({
    company: '',
    cfo: '',
    purchaseSubject: '',
  });

  // Состояние для множественных фильтров (чекбоксы)
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  
  // Состояние для открытия/закрытия выпадающих списков
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  
  // Поиск внутри фильтров
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  
  // Позиции для выпадающих списков
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  
  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  
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

  // Локальное состояние для текстовых фильтров
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    company: '',
    purchaseSubject: '',
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
  const [editingDate, setEditingDate] = useState<{ itemId: number; field: 'requestDate' | 'newContractDate' | 'contractEndDate' } | null>(null);
  
  // Функция для обновления даты на бэкенде
  const handleDateUpdate = async (itemId: number, field: 'requestDate' | 'newContractDate' | 'contractEndDate', newDate: string) => {
    if (!newDate || newDate.trim() === '') return;
    
    try {
      const item = data?.content.find(i => i.id === itemId);
      if (!item) return;
      
      // Нормализуем дату (убираем время, если есть)
      const normalizedDate = newDate.split('T')[0];
      
      // Если это contractEndDate, используем отдельный endpoint
      if (field === 'contractEndDate') {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/contract-end-date`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractEndDate: normalizedDate,
          }),
        });

        if (response.ok) {
          const updatedItem = await response.json();
          console.log('Contract end date updated successfully:', updatedItem);
          // Обновляем данные в таблице
          if (data) {
            const updatedContent = data.content.map(i => 
              i.id === itemId 
                ? { ...i, contractEndDate: updatedItem.contractEndDate }
                : i
            );
            setData({ ...data, content: updatedContent });
          }
          // Закрываем режим редактирования
          setEditingDate(null);
        } else {
          const errorText = await response.text();
          console.error('Failed to update contract end date:', response.status, errorText);
        }
        return;
      }
      
      // Получаем текущие даты и обновляем нужное поле
      const currentRequestDate = item.requestDate ? item.requestDate.split('T')[0] : null;
      const currentNewContractDate = item.newContractDate ? item.newContractDate.split('T')[0] : null;
      
      const requestDate = field === 'requestDate' ? normalizedDate : currentRequestDate;
      const newContractDate = field === 'newContractDate' ? normalizedDate : currentNewContractDate;
      
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
      year: 64, // w-16 = 4rem = 64px
      company: 128, // w-32 = 8rem = 128px
      cfo: 128, // w-32 = 8rem = 128px
      purchaseSubject: 192, // w-48 = 12rem = 192px
      budgetAmount: 112, // w-28 = 7rem = 112px
      contractEndDate: 128, // w-32 = 8rem = 128px
      requestDate: 112, // w-28 = 7rem = 112px
      newContractDate: 128, // w-32 = 8rem = 128px
    };
    return defaults[columnKey] || 120;
  };

  // Функция для получения текущей ширины колонки
  const getColumnWidth = (columnKey: string): number => {
    return columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
  };

  // Функция для подсчета количества закупок по месяцам
  const getMonthlyDistribution = useMemo(() => {
    if (!data?.content || data.content.length === 0) {
      return Array(13).fill(0);
    }

    // Определяем год для отображения (используем selectedYear или год из первой записи)
    const displayYear = selectedYear || data.content[0]?.year || new Date().getFullYear();
    const prevYear = displayYear - 1;

    // Инициализируем массив для 13 месяцев: декабрь предыдущего года + 12 месяцев текущего года
    const monthCounts = Array(13).fill(0);
    
    // Месяцы: [Дек пред.года, Янв, Фев, Мар, Апр, Май, Июн, Июл, Авг, Сен, Окт, Ноя, Дек]
    data.content.forEach((item) => {
      if (!item.requestDate) return;
      
      const requestDate = new Date(item.requestDate);
      const itemYear = requestDate.getFullYear();
      const itemMonth = requestDate.getMonth(); // 0-11
      
      // Проверяем, попадает ли дата в период отображения
      if (itemYear === prevYear && itemMonth === 11) {
        // Декабрь предыдущего года
        monthCounts[0]++;
      } else if (itemYear === displayYear) {
        // Месяцы текущего года (0-11 -> индексы 1-12)
        monthCounts[itemMonth + 1]++;
      }
    });

    return monthCounts;
  }, [data?.content, selectedYear]);

  // Максимальное значение для нормализации высоты столбцов
  const maxCount = Math.max(...getMonthlyDistribution, 1);
  
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
          };
          
          result.content.forEach((item: PurchasePlanItem) => {
            // Собираем годы
            if (item.year) {
              years.add(item.year);
            }
            // Собираем уникальные значения
            if (item.cfo) values.cfo.add(item.cfo);
          });
          
          const yearsArray = Array.from(years).sort((a, b) => b - a);
          const uniqueValuesData = {
            cfo: Array.from(values.cfo).sort(),
          };
          
          setAllYears(yearsArray);
          
          // Устанавливаем по умолчанию последний год планирования
          if (yearsArray.length > 0 && selectedYear === null) {
            setSelectedYear(yearsArray[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (filters.company && filters.company.trim() !== '') {
        params.append('company', filters.company.trim());
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

  // Debounce для текстовых фильтров
  useEffect(() => {
    const textFields = ['company', 'purchaseSubject'];
    const hasTextChanges = textFields.some(field => localFilters[field] !== filters[field]);
    
    if (hasTextChanges) {
      const timer = setTimeout(() => {
        setFilters(prev => {
          const updated = { ...prev };
          textFields.forEach(field => {
            updated[field] = localFilters[field];
          });
          return updated;
        });
        setCurrentPage(0);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localFilters]);

  useEffect(() => {
    fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters);
  }, [currentPage, pageSize, selectedYear, sortField, sortDirection, filters, cfoFilter]);

  // Восстановление фокуса после обновления localFilters
  useEffect(() => {
    if (focusedField) {
      const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
      if (input) {
        const cursorPosition = input.selectionStart || 0;
        const currentValue = input.value;
        
        requestAnimationFrame(() => {
          const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
          if (inputAfterRender && inputAfterRender.value === currentValue) {
            inputAfterRender.focus();
            const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
            inputAfterRender.setSelectionRange(newPosition, newPosition);
          }
        });
      }
    }
  }, [localFilters, focusedField]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
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

  // Получение уникальных значений для фильтров
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({
    cfo: [],
  });

  useEffect(() => {
    const fetchUniqueValues = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=10000`);
        if (response.ok) {
          const result = await response.json();
          const values: Record<string, Set<string>> = {
            cfo: new Set(),
          };
          
          result.content.forEach((item: PurchasePlanItem) => {
            if (item.cfo) values.cfo.add(item.cfo);
          });
          
          setUniqueValues({
            cfo: Array.from(values.cfo).sort(),
          });
        }
      } catch (err) {
        console.error('Error fetching unique values:', err);
      }
    };
    fetchUniqueValues();
  }, []);

  const getUniqueValues = (field: keyof PurchasePlanItem): string[] => {
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

  // Закрываем выпадающие списки при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isCfoFilterOpen && !target.closest('.cfo-filter-container')) {
        setIsCfoFilterOpen(false);
      }
    };

    if (isCfoFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCfoFilterOpen]);

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
  const SortableHeader = ({ 
    field, 
    label, 
    filterType = 'text',
    width,
    columnKey
  }: { 
    field: string | null; 
    label: string;
    filterType?: 'text' | 'select';
    width?: string;
    columnKey?: string;
  }) => {
    const isSorted = sortField === field;
    const fieldKey = field || '';
    const filterValue = filterType === 'text' ? (localFilters[fieldKey] || '') : (filters[fieldKey] || '');
    const columnWidth = columnKey ? getColumnWidth(columnKey) : undefined;
    const style: React.CSSProperties = columnWidth 
      ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px`, verticalAlign: 'top', overflow: 'hidden' }
      : { verticalAlign: 'top', overflow: 'hidden' };

    return (
      <th className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${width || ''}`} style={style}>
      <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
          <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
            {filterType === 'text' ? (
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
                  handleFilterChange(fieldKey, newValue, true);
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

  const hasData = data && data.content && data.content.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              Всего записей: {totalRecords}
            </p>
              <button
                onClick={() => {
                  const emptyFilters = {
                    company: '',
                    cfo: '',
                    purchaseSubject: '',
                  };
                  setFilters(emptyFilters);
                  setLocalFilters(emptyFilters);
                  setCfoFilter(new Set());
                setSortField('requestDate');
                setSortDirection('asc');
                  setFocusedField(null);
                setSelectedYear(allYears.length > 0 ? allYears[0] : null);
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
              <SortableHeader field="year" label="Год" columnKey="year" />
              <SortableHeader field="company" label="Компания" filterType="text" columnKey="company" />
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
              <SortableHeader field="purchaseSubject" label="Предмет закупки" filterType="text" columnKey="purchaseSubject" />
              <SortableHeader field="budgetAmount" label="Бюджет (UZS)" columnKey="budgetAmount" />
              <SortableHeader field="contractEndDate" label="Срок окончания договора" columnKey="contractEndDate" />
              <SortableHeader field="requestDate" label="Дата заявки" columnKey="requestDate" />
              <SortableHeader field="newContractDate" label="Дата нового договора" columnKey="newContractDate" />
              <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300" style={{ width: '350px', minWidth: '350px' }}>
                <div className="flex flex-col gap-1">
                  <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}></div>
                  <div className="flex items-center gap-1 min-h-[20px]">
                    <div style={{ width: '20px', minWidth: '20px', flexShrink: 0 }}></div>
                    {/* Столбчатая диаграмма распределения по месяцам */}
                    <div className="flex-1 flex items-end gap-0.5 h-16 px-1 relative" style={{ minHeight: '64px' }}>
                      {getMonthlyDistribution.map((count, index) => {
                        const monthLabels = ['Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                        const isYearDivider = index === 1; // После декабря предыдущего года
                        const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        
                  return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-0.5 relative" style={{ minWidth: 0 }}>
                            {/* Столбец */}
                            <div 
                              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group cursor-pointer"
                              style={{ 
                                height: `${Math.max(heightPercent, count > 0 ? 5 : 0)}%`,
                                minHeight: count > 0 ? '4px' : '0px'
                              }}
                              title={`${monthLabels[index]}: ${count} закупок`}
                            >
                              {/* Число на столбце (показываем только если столбец достаточно высокий) */}
                              {count > 0 && heightPercent > 15 && (
                                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[8px] text-gray-600 font-medium whitespace-nowrap pointer-events-none">
                                  {count}
                                </div>
                              )}
                            </div>
                            {/* Подпись месяца */}
                            <div className={`text-[8px] text-center ${isYearDivider ? 'font-bold text-gray-800 border-l-2 border-gray-700 pl-0.5' : 'text-gray-500'}`} style={{ lineHeight: '1' }}>
                              {monthLabels[index]}
                            </div>
                            {/* Показываем число под столбцом, если столбец слишком низкий */}
                            {count > 0 && heightPercent <= 15 && (
                              <div className="text-[7px] text-gray-600 font-medium -mt-0.5">
                                {count}
                              </div>
                            )}
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
              data?.content.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50"
                >
                        <td 
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200"
                          style={{ width: `${getColumnWidth('year')}px`, minWidth: `${getColumnWidth('year')}px`, maxWidth: `${getColumnWidth('year')}px` }}
                        >
                          {item.year || '-'}
                        </td>
                        <td 
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          title={item.company || ''}
                          style={{ width: `${getColumnWidth('company')}px`, minWidth: `${getColumnWidth('company')}px`, maxWidth: `${getColumnWidth('company')}px` }}
                        >
                          {item.company || '-'}
                        </td>
                        <td 
                          className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" 
                          title={item.cfo || ''}
                          style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px` }}
                        >
                          {item.cfo || '-'}
                        </td>
                        <td 
                          className="px-2 py-2 text-xs text-gray-900 break-words border-r border-gray-200"
                          style={{ width: `${getColumnWidth('purchaseSubject')}px`, minWidth: `${getColumnWidth('purchaseSubject')}px`, maxWidth: `${getColumnWidth('purchaseSubject')}px` }}
                        >
                          {item.purchaseSubject || '-'}
                        </td>
                        <td 
                          className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200"
                          style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px` }}
                        >
                          {item.budgetAmount ? new Intl.NumberFormat('ru-RU', { 
                            notation: 'compact',
                            maximumFractionDigits: 1 
                          }).format(item.budgetAmount) : '-'}
                        </td>
                        <td 
                    className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 cursor-pointer hover:bg-gray-50"
                          style={{ width: `${getColumnWidth('contractEndDate')}px`, minWidth: `${getColumnWidth('contractEndDate')}px`, maxWidth: `${getColumnWidth('contractEndDate')}px` }}
                    onClick={() => setEditingDate({ itemId: item.id, field: 'contractEndDate' })}
                  >
                    {editingDate?.itemId === item.id && editingDate?.field === 'contractEndDate' ? (
                      <input
                        type="date"
                        autoFocus
                        defaultValue={item.contractEndDate ? item.contractEndDate.split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleDateUpdate(item.id, 'contractEndDate', e.target.value);
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
                      item.contractEndDate ? new Date(item.contractEndDate).toLocaleDateString('ru-RU') : '-'
                    )}
                  </td>
                  <td 
                    className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${
                      animatingDates[item.id] ? 'animate-pulse bg-blue-50 text-blue-700 font-semibold' : 'text-gray-900'
                    }`}
                          style={{ width: `${getColumnWidth('requestDate')}px`, minWidth: `${getColumnWidth('requestDate')}px`, maxWidth: `${getColumnWidth('requestDate')}px` }}
                        >
                    {editingDate?.itemId === item.id && editingDate?.field === 'requestDate' ? (
                      <input
                        type="date"
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
                        onClick={() => setEditingDate({ itemId: item.id, field: 'requestDate' })}
                        className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
                        title="Нажмите для редактирования"
                      >
                        {tempDates[item.id]?.requestDate 
                          ? new Date(tempDates[item.id]!.requestDate!).toLocaleDateString('ru-RU')
                          : (item.requestDate ? new Date(item.requestDate).toLocaleDateString('ru-RU') : '-')}
                      </div>
                    )}
                  </td>
                  <td 
                    className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${
                      animatingDates[item.id] ? 'animate-pulse bg-blue-50 text-blue-700 font-semibold' : 'text-gray-900'
                    }`}
                          style={{ width: `${getColumnWidth('newContractDate')}px`, minWidth: `${getColumnWidth('newContractDate')}px`, maxWidth: `${getColumnWidth('newContractDate')}px` }}
                        >
                    {editingDate?.itemId === item.id && editingDate?.field === 'newContractDate' ? (
                      <input
                        type="date"
                        autoFocus
                        min={item.year ? `${item.year}-01-01` : undefined}
                        max={item.year ? `${item.year}-12-31` : undefined}
                        defaultValue={item.newContractDate ? item.newContractDate.split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleDateUpdate(item.id, 'newContractDate', e.target.value);
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
                        onClick={() => setEditingDate({ itemId: item.id, field: 'newContractDate' })}
                        className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
                        title="Нажмите для редактирования"
                      >
                        {tempDates[item.id]?.newContractDate 
                          ? new Date(tempDates[item.id]!.newContractDate!).toLocaleDateString('ru-RU')
                          : (item.newContractDate ? new Date(item.newContractDate).toLocaleDateString('ru-RU') : '-')}
                      </div>
                    )}
                        </td>
                  <td className="px-1 py-1 border-r border-gray-200" style={{ width: '350px', minWidth: '350px' }}>
                    <GanttChart
                      itemId={item.id}
                      year={item.year}
                      requestDate={item.requestDate}
                      newContractDate={item.newContractDate}
                      contractEndDate={item.contractEndDate}
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
                        // Обновляем данные в таблице после завершения перетаскивания
                        if (data) {
                          const updatedContent = data.content.map(i => 
                            i.id === item.id 
                              ? { ...i, requestDate, newContractDate }
                              : i
                          );
                          setData({ ...data, content: updatedContent });
                        }
                        // Убираем временные даты
                        setTempDates(prev => {
                          const newTemp = { ...prev };
                          delete newTemp[item.id];
                          return newTemp;
                        });
                        // Останавливаем анимацию через небольшую задержку
                        setTimeout(() => {
                          setAnimatingDates(prev => {
                            const newAnimating = { ...prev };
                            delete newAnimating[item.id];
                            return newAnimating;
                          });
                        }, 500);
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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

