'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';

interface Contract {
  id: number;
  innerId: string | null;
  guid: string;
  contractCreationDate: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  mcc: string | null;
  documentForm: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  status: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  content: Contract[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

type SortField = keyof Contract | null;
type SortDirection = 'asc' | 'desc' | null;

export default function ContractsTable() {
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Состояние для сортировки
  const [sortField, setSortField] = useState<SortField>('contractCreationDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Состояние для фильтров
  const [filters, setFilters] = useState<Record<string, string>>({
    innerId: '',
    cfo: '',
    name: '',
    documentForm: '',
    costType: '',
    contractType: '',
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
    innerId: '',
    cfo: '',
    name: '',
    documentForm: '',
    costType: '',
    contractType: '',
  });

  // Состояние для отслеживания поля с фокусом
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Получение уникальных значений ЦФО
  const [cfoOptions, setCfoOptions] = useState<string[]>([]);
  
  const fetchCfoOptions = useCallback(async () => {
    try {
      // Загружаем все данные для получения уникальных ЦФО
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '10000');
      
      const fetchUrl = `${getBackendUrl()}/api/contracts?${params.toString()}`;
      console.log('Fetching CFO options from:', fetchUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      console.log('CFO options response:', result);
      
      const uniqueCfo = new Set<string>();
      if (result.content) {
        result.content.forEach((contract: Contract) => {
          if (contract.cfo && contract.cfo.trim() !== '') {
            uniqueCfo.add(contract.cfo.trim());
          }
        });
      }
      setCfoOptions(Array.from(uniqueCfo).sort());
    } catch (err) {
      console.error('Error fetching CFO options:', err);
      // Не блокируем загрузку основной таблицы, если не удалось загрузить опции ЦФО
    }
  }, []);

  useEffect(() => {
    fetchCfoOptions();
  }, [fetchCfoOptions]);

  const getFilteredCfoOptions = cfoOptions.filter(cfo =>
    cfo.toLowerCase().includes(cfoSearchQuery.toLowerCase())
  );

  const handleCfoToggle = (cfo: string) => {
    setCfoFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cfo)) {
        newSet.delete(cfo);
      } else {
        newSet.add(cfo);
      }
      return newSet;
    });
    setCurrentPage(0);
  };

  const handleCfoSelectAll = () => {
    setCfoFilter(new Set(cfoOptions));
    setCurrentPage(0);
  };

  const handleCfoDeselectAll = () => {
    setCfoFilter(new Set());
    setCurrentPage(0);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(0);
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
      if (filters.innerId && filters.innerId.trim() !== '') {
        params.append('innerId', filters.innerId.trim());
      }
      
      // Фильтр по ЦФО - передаем все выбранные значения на бэкенд
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }
      
      if (filters.name && filters.name.trim() !== '') {
        params.append('name', filters.name.trim());
      }
      if (filters.documentForm && filters.documentForm.trim() !== '') {
        params.append('documentForm', filters.documentForm.trim());
      }
      if (filters.costType && filters.costType.trim() !== '') {
        params.append('costType', filters.costType.trim());
      }
      if (filters.contractType && filters.contractType.trim() !== '') {
        params.append('contractType', filters.contractType.trim());
      }
      
      const fetchUrl = `${getBackendUrl()}/api/contracts?${params.toString()}`;
      console.log('Fetching contracts from:', fetchUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}. ${errorText}`);
      }
      const result = await response.json();
      console.log('Contracts response:', result);
      setData(result);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Debounce для текстовых фильтров
  useEffect(() => {
    const textFields = ['innerId', 'name', 'documentForm', 'costType', 'contractType'];
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
    data.content.forEach((contract) => {
      if (contract.contractCreationDate) {
        const date = new Date(contract.contractCreationDate);
        const year = date.getFullYear();
        if (!isNaN(year)) {
          years.add(year);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const availableYears = getAvailableYears();
  const allYears = availableYears.length > 0 ? availableYears : [currentYear];

  const handleResetFilters = () => {
    setFilters({
      innerId: '',
      cfo: '',
      name: '',
      documentForm: '',
      costType: '',
      contractType: '',
    });
    setLocalFilters({
      innerId: '',
      cfo: '',
      name: '',
      documentForm: '',
      costType: '',
      contractType: '',
    });
    setCfoFilter(new Set());
    setSelectedYear(currentYear);
    setCurrentPage(0);
  };

  // Закрываем выпадающие списки при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cfoFilterButtonRef.current && !cfoFilterButtonRef.current.contains(event.target as Node)) {
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

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-500">Ошибка: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
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
              Всего записей: {data?.totalElements || 0}
            </p>
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Пагинация */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            Показано {data?.content?.length || 0} из {data?.totalElements || 0} записей
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-700">
              Элементов на странице:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
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
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-700">
            Страница {currentPage + 1} из {Math.max(1, data?.totalPages || 1)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min((data?.totalPages || 1) - 1, prev + 1))}
            disabled={currentPage >= (data?.totalPages || 1) - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(0, (data?.totalPages || 1) - 1))}
            disabled={currentPage >= (data?.totalPages || 1) - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Последняя
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="px-6 py-8 text-center text-gray-500">Загрузка...</div>
      ) : (
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <input
                        type="text"
                        value={localFilters.innerId}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart || 0;
                          setLocalFilters(prev => ({ ...prev, innerId: newValue }));
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
                        data-filter-field="innerId"
                        className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Внутренний номер</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
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
                                      onClick={(e) => e.stopPropagation()}
                                      className="mr-2"
                                    />
                                    <span className="text-xs text-gray-700">{cfo}</span>
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
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <input
                        type="text"
                        value={localFilters.name}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart || 0;
                          setLocalFilters(prev => ({ ...prev, name: newValue }));
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
                          setFocusedField('name');
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
                        data-filter-field="name"
                        className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Фильтр"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'name' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Наименование</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <input
                        type="text"
                        value={localFilters.documentForm}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart || 0;
                          setLocalFilters(prev => ({ ...prev, documentForm: newValue }));
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
                          setFocusedField('documentForm');
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
                        data-filter-field="documentForm"
                        className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Фильтр"
                        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('documentForm')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'documentForm' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Форма документа</span>
                    </div>
                </div>
              </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
                  <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                    <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                      <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
                    </div>
                    <div className="flex items-center gap-1 min-h-[20px]">
                      <button
                        onClick={() => handleSort('contractCreationDate')}
                        className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                        style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      >
                        {sortField === 'contractCreationDate' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                        )}
                      </button>
                      <span className="text-xs font-medium text-gray-500 tracking-wider">Дата создания</span>
                    </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
              {data?.content && data.content.length > 0 ? (
                data.content.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                      {contract.innerId || '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                      {contract.cfo || '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                      {contract.name || contract.title || '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                      {contract.documentForm || '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">
                      {contract.contractCreationDate 
                        ? new Date(contract.contractCreationDate).toLocaleDateString('ru-RU')
                        : '-'}
                    </td>
                  </tr>
                ))
              ) : (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                Нет данных для отображения
              </td>
            </tr>
              )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
