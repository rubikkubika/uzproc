'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Clock, Search, X } from 'lucide-react';

interface PurchaseRequest {
  id: number;
  idPurchaseRequest: number | null;
  guid: string;
  purchasePlanYear: number | null;
  company: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseInitiator: string | null;
  name: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
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
  
  // Состояние для сортировки (по умолчанию сортировка по номеру по убыванию)
  const [sortField, setSortField] = useState<SortField>('idPurchaseRequest');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Состояние для фильтров
  const [filters, setFilters] = useState<Record<string, string>>({
    idPurchaseRequest: '',
    cfo: '',
    purchaseInitiator: '',
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
    purchaseInitiator: '',
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
        params.append('idPurchaseRequest', filters.idPurchaseRequest);
      }
      // Фильтр по ЦФО - если выбрано несколько, фильтруем на клиенте
      // НЕ отправляем параметр на бэкенд, чтобы получить все данные для клиентской фильтрации
      // Фильтрация по ЦФО будет применена на клиенте после получения данных
      if (filters.purchaseInitiator && filters.purchaseInitiator.trim() !== '') {
        params.append('purchaseInitiator', filters.purchaseInitiator);
      }
      if (filters.name && filters.name.trim() !== '') {
        params.append('name', filters.name);
      }
      if (filters.costType && filters.costType.trim() !== '') {
        params.append('costType', filters.costType);
      }
      if (filters.contractType && filters.contractType.trim() !== '') {
        params.append('contractType', filters.contractType);
      }
      if (filters.isPlanned && filters.isPlanned.trim() !== '') {
        params.append('isPlanned', filters.isPlanned);
      }
      if (filters.requiresPurchase && filters.requiresPurchase.trim() !== '') {
        params.append('requiresPurchase', filters.requiresPurchase);
      }
      
      // Если есть фильтры ЦФО или Статус, загружаем все данные для корректной фильтрации
      const hasClientFilters = cfoFilter.size > 0 || statusFilter.size > 0;
      let fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
      
      if (hasClientFilters) {
        // Загружаем все данные для фильтрации на клиенте
        // Копируем все параметры из params, но меняем page и size
        const allParams = new URLSearchParams(params);
        allParams.set('page', '0');
        allParams.set('size', '10000');
        // Убираем параметр cfo, если он был добавлен (мы фильтруем на клиенте)
        allParams.delete('cfo');
        fetchUrl = `${getBackendUrl()}/api/purchase-requests?${allParams.toString()}`;
      }
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      
      // Применяем фильтрацию на клиенте только если есть клиентские фильтры
      if (hasClientFilters) {
        let filteredContent = result.content;
        
        // Фильтрация по ЦФО - показываем записи, если ЦФО совпадает с хотя бы одним выбранным
        if (cfoFilter.size > 0) {
          filteredContent = filteredContent.filter((request: PurchaseRequest) => {
            return request.cfo && cfoFilter.has(request.cfo);
          });
        }
        
        // Фильтрация по статусу - показываем записи, если статус совпадает с хотя бы одним выбранным
        // Временная логика: все заявки имеют статус "Заявка"
        if (statusFilter.size > 0) {
          filteredContent = filteredContent.filter((request: PurchaseRequest) => {
            // Пока все заявки имеют статус "Заявка"
            // Позже здесь будет логика определения реального статуса заявки
            return statusFilter.has('Заявка');
          });
        }
        
        // Применяем пагинацию к отфильтрованным данным
        const totalFiltered = filteredContent.length;
        const startIndex = currentPage * size;
        const endIndex = startIndex + size;
        const paginatedContent = filteredContent.slice(startIndex, endIndex);
        
        setData({
          ...result,
          content: paginatedContent,
          totalElements: totalFiltered,
          totalPages: Math.ceil(totalFiltered / size),
        });
      } else {
        // Без клиентских фильтров используем данные напрямую из сервера
        setData(result);
      }
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
    purchaseInitiator: [],
  });

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
            purchaseInitiator: new Set(),
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
            if (request.purchaseInitiator) values.purchaseInitiator.add(request.purchaseInitiator);
          });
          
          const yearsArray = Array.from(years).sort((a, b) => b - a);
          const uniqueValuesData = {
            cfo: Array.from(values.cfo).sort(),
            purchaseInitiator: Array.from(values.purchaseInitiator).sort(),
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
      purchaseInitiator: 'purchaseInitiator',
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
    const allStatuses = ['Заявка', 'Закупка', 'Договор', 'Спецификация'];
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
    const allStatuses = ['Заявка', 'Закупка', 'Договор', 'Спецификация'];
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
    width
  }: { 
    field: SortField; 
    label: string;
    filterType?: 'text' | 'select';
    filterOptions?: string[];
    width?: string;
  }) => {
    const isSorted = sortField === field;
    const fieldKey = field || '';
    const filterValue = filterType === 'text' ? (localFilters[fieldKey] || '') : (filters[fieldKey] || '');

    return (
      <th className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 ${width || ''}`}>
        <div className="flex flex-col gap-1">
          {field ? (
          <button
            onClick={() => handleSort(field)}
            className="flex items-center gap-1 hover:text-gray-700 transition-colors w-full"
          >
            <span>{label}</span>
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
            <span>{label}</span>
          )}
          {filterType === 'select' && filterOptions.length > 0 ? (
            <select
              value={filterValue}
              onChange={(e) => handleFilterChange(fieldKey, e.target.value, false)}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Все</option>
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
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
              className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Фильтр"
            />
          )}
        </div>
      </th>
    );
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
              Всего записей: {data?.totalElements || 0}
            </p>
            {(Object.values(filters).some(f => f.trim() !== '') || sortField) && (
              <button
                onClick={() => {
                  const emptyFilters = {
                    idPurchaseRequest: '',
                    cfo: '',
                    purchaseInitiator: '',
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
            )}
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
              <SortableHeader field="idPurchaseRequest" label="Номер" width="w-16" />
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 w-20">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleSort('cfo')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors w-full"
                  >
                    <span>ЦФО</span>
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
                  <div className="relative cfo-filter-container">
                    <button
                      ref={cfoFilterButtonRef}
                      type="button"
                      onClick={() => setIsCfoFilterOpen(!isCfoFilterOpen)}
                      className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
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
              </th>
              <SortableHeader 
                field="purchaseInitiator" 
                label="Инициатор"
                filterType="select"
                filterOptions={getUniqueValues('purchaseInitiator')}
                width="w-24"
              />
              <SortableHeader field="name" label="Наименование" width="w-48" />
              <SortableHeader field="budgetAmount" label="Бюджет" width="w-28" />
              <SortableHeader 
                field="isPlanned" 
                label="План"
                filterType="select"
                filterOptions={['true', 'false']}
                width="w-20"
              />
              <SortableHeader 
                field="requiresPurchase" 
                label="Закупка"
                filterType="select"
                filterOptions={['true', 'false']}
                width="w-24"
              />
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                <div className="flex flex-col gap-1">
                  <span className="normal-case">Статус</span>
                  <div className="relative status-filter-container">
                    <button
                      ref={statusFilterButtonRef}
                      type="button"
                      onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                      className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:bg-gray-50"
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
              </th>
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
                    if (target.closest('input') || target.closest('select') || target.closest('button')) {
                      return;
                    }
                    router.push(`/purchase-request/${request.id}`);
                  }}
                >
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 w-16">
                    {request.idPurchaseRequest || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={request.cfo || ''}>
                    {request.cfo || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={request.purchaseInitiator || ''}>
                    {request.purchaseInitiator || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 break-words border-r border-gray-200">
                    {request.name || '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                    {request.budgetAmount ? new Intl.NumberFormat('ru-RU', { 
                      notation: 'compact',
                      maximumFractionDigits: 1 
                    }).format(request.budgetAmount) : '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200">
                    {request.isPlanned ? (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Да
                      </span>
                    ) : request.isPlanned === false ? (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Нет
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200">
                    {request.requiresPurchase ? (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Да
                      </span>
                    ) : request.requiresPurchase === false ? (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Нет
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs border-r border-gray-200">
                    <div className="flex items-end gap-2">
                      {/* Заявка - активна */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="relative w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center" title="Заявка">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[10px] text-gray-600 whitespace-nowrap leading-none">Заявка</span>
                      </div>
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
                      {/* Спецификация - неактивна */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-3 h-3 rounded-full bg-gray-300 mt-0.5" title="Спецификация"></div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Спецификация</span>
                      </div>
                    </div>
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

