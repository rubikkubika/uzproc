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
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
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
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMetadata();
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
      <th className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 ${width || ''}`}>
        <div className="flex flex-col gap-1 h-full">
          {field ? (
            <button
              onClick={() => handleSort(field as SortField)}
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
          {filterType === 'text' && (
            <input
              type="text"
              value={filterValue}
              onChange={(e) => {
                setFocusedField(fieldKey);
                handleFilterChange(fieldKey, e.target.value, true);
              }}
              onFocus={() => setFocusedField(fieldKey)}
              data-filter-field={fieldKey}
              className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 h-6"
              placeholder="Фильтр..."
            />
          )}
        </div>
      </th>
    );
  };

  const hasData = data && data.content && data.content.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4 flex-nowrap">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="text-sm text-gray-700 font-medium whitespace-nowrap">Год планирования:</span>
            {allYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                selectedYear === null
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Все
            </button>
          </div>
          <div className="flex items-center gap-4 flex-nowrap ml-auto">
            <p className="text-sm text-gray-500 whitespace-nowrap">
              Всего записей: {totalRecords}
            </p>
            {(Object.values(filters).some(f => f.trim() !== '') || cfoFilter.size > 0 || sortField || selectedYear !== null) && (
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
                  setSortField(null);
                  setSortDirection(null);
                  setFocusedField(null);
                  setSelectedYear(null);
                }}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors whitespace-nowrap"
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
              <SortableHeader field="year" label="Год" width="w-16" />
              <SortableHeader field="company" label="Компания" width="w-32" />
              <th 
                className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 relative" 
              >
                <div className="flex flex-col gap-1 h-full">
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
                      className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50 h-6"
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
              <SortableHeader field="purchaseSubject" label="Предмет закупки" width="w-48" />
              <SortableHeader field="budgetAmount" label="Бюджет (UZS)" width="w-28" />
              <SortableHeader field="contractEndDate" label="Срок окончания договора" width="w-32" />
              <SortableHeader field="requestDate" label="Дата заявки" width="w-28" />
              <SortableHeader field="newContractDate" label="Дата нового договора" width="w-32" />
              <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300" style={{ width: '350px', minWidth: '350px' }}>
                <div className="flex flex-col gap-1">
                  <div className="h-[24px] flex items-center flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px' }}></div>
                  <div className="flex items-center gap-1 min-h-[20px]">
                    <div style={{ width: '20px', minWidth: '20px', flexShrink: 0 }}></div>
                    <span className="text-xs font-medium text-gray-500 tracking-wider">Гант</span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hasData ? (
              data?.content.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50"
                >
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                    {item.year || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={item.company || ''}>
                    {item.company || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 truncate border-r border-gray-200" title={item.cfo || ''}>
                    {item.cfo || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 break-words border-r border-gray-200">
                    {item.purchaseSubject || '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                    {item.budgetAmount ? new Intl.NumberFormat('ru-RU', { 
                      notation: 'compact',
                      maximumFractionDigits: 1 
                    }).format(item.budgetAmount) : '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                    {item.contractEndDate ? new Date(item.contractEndDate).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                    {item.requestDate ? new Date(item.requestDate).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">
                    {item.newContractDate ? new Date(item.newContractDate).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  <td className="px-1 py-1 border-r border-gray-200" style={{ width: '350px', minWidth: '350px' }}>
                    <GanttChart
                      itemId={item.id}
                      year={item.year}
                      requestDate={item.requestDate}
                      newContractDate={item.newContractDate}
                      onDatesUpdate={(requestDate, newContractDate) => {
                        // Обновляем данные в таблице
                        if (data) {
                          const updatedContent = data.content.map(i => 
                            i.id === item.id 
                              ? { ...i, requestDate, newContractDate }
                              : i
                          );
                          setData({ ...data, content: updatedContent });
                        }
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

