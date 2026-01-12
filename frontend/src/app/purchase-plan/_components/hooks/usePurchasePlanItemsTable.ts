import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PurchasePlanItem, PageResponse, SortField, SortDirection } from '../types/purchase-plan-items.types';
import { PAGE_SIZE } from '../constants/purchase-plan-items.constants';
import { formatBudget, formatBudgetFull } from '../utils/currency.utils';
import { usePurchasePlanItemsFilters } from './usePurchasePlanItemsFilters';
import { usePurchasePlanItemsColumns } from './usePurchasePlanItemsColumns';
import { usePurchasePlanItemsData } from './usePurchasePlanItemsData';
import { usePurchasePlanItemsEditing } from './usePurchasePlanItemsEditing';
import { usePurchasePlanItemsModals } from './usePurchasePlanItemsModals';
import { usePurchasePlanItemsVersions } from './usePurchasePlanItemsVersions';

export const usePurchasePlanItemsTable = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PageResponse | null>(null);
  const [allItems, setAllItems] = useState<PurchasePlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const initialTotalElementsRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [selectedMonthYear, setSelectedMonthYear] = useState<number | null>(null);
  const [lastSelectedMonthIndex, setLastSelectedMonthIndex] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [sortField, setSortField] = useState<SortField>('requestDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [chartData, setChartData] = useState<PurchasePlanItem[]>([]);
  const [summaryData, setSummaryData] = useState<PurchasePlanItem[]>([]);
  const [newItemData, setNewItemData] = useState<Partial<PurchasePlanItem>>({
    year: selectedYear || (new Date().getFullYear() + 1),
    status: 'Проект',
  });

  // Используем все хуки
  const filtersHook = usePurchasePlanItemsFilters(
    setCurrentPage,
    selectedYear,
    selectedMonths,
    sortField,
    sortDirection,
    pageSize
  );

  const columnsHook = usePurchasePlanItemsColumns(allItems);
  const dataHook = usePurchasePlanItemsData();
  const modalsHook = usePurchasePlanItemsModals();
  const versionsHook = usePurchasePlanItemsVersions();

  const editingHook = usePurchasePlanItemsEditing(
    data,
    setData,
    setAllItems,
    setChartData,
    setSummaryData,
    filtersHook.cfoFilter,
    pageSize
  );

  // Функция для загрузки данных
  const fetchData = useCallback(async (
    page: number, 
    size: number, 
    year: number | null = null,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {},
    months: Set<number> = new Set(),
    append: boolean = false
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllItems([]);
    }
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));
      
      if (year !== null) {
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
      if (filtersHook.cfoFilter.size > 0) {
        filtersHook.cfoFilter.forEach(cfo => {
          if (cfo === 'Не выбрано') {
            params.append('cfo', '__NULL__');
          } else {
            params.append('cfo', cfo);
          }
        });
      }
      if (filtersHook.companyFilter.size > 0) {
        filtersHook.companyFilter.forEach(company => {
          if (company === 'Не выбрано') {
            params.append('company', '__NULL__');
          } else {
            params.append('company', company);
          }
        });
      }
      if (filtersHook.purchaserCompanyFilter.size > 0) {
        filtersHook.purchaserCompanyFilter.forEach(purchaserCompany => {
          if (purchaserCompany === 'Не выбрано') {
            params.append('purchaserCompany', '__NULL__');
          } else {
            params.append('purchaserCompany', purchaserCompany);
          }
        });
      }
      if (filters.id && filters.id.trim() !== '') {
        params.append('id', filters.id.trim());
      }
      if (filters.purchaseSubject && filters.purchaseSubject.trim() !== '') {
        params.append('purchaseSubject', filters.purchaseSubject.trim());
      }
      if (filters.purchaseRequestId && filters.purchaseRequestId.trim() !== '') {
        params.append('purchaseRequestId', filters.purchaseRequestId.trim());
      }
      // Фильтр бюджета
      const budgetOperator = filters.budgetAmountOperator;
      const budgetAmount = filters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      if (filters.currentContractEndDate && filters.currentContractEndDate.trim() !== '') {
        const dateValue = filters.currentContractEndDate.trim();
        if (dateValue === '-') {
          params.append('currentContractEndDate', 'null');
        } else {
          params.append('currentContractEndDate', dateValue);
        }
      }
      if (filtersHook.purchaserFilter.size > 0) {
        filtersHook.purchaserFilter.forEach(purchaser => {
          if (purchaser === 'Не назначен' || purchaser === null || purchaser === undefined || purchaser === '') {
            params.append('purchaser', '__NULL__');
          } else {
            params.append('purchaser', purchaser);
          }
        });
      }
      if (filtersHook.categoryFilter.size > 0) {
        filtersHook.categoryFilter.forEach(category => {
          params.append('category', category);
        });
      }
      if (filtersHook.statusFilter.size > 0) {
        filtersHook.statusFilter.forEach(status => {
          if (status === 'Пусто') {
            params.append('status', '__NULL__');
          } else {
            params.append('status', status);
          }
        });
      }
      
      // Фильтр по месяцу
      if (months.size > 0) {
        months.forEach(monthKey => {
          if (monthKey === -1) {
            params.append('requestMonth', '-1');
          } else if (monthKey === -2) {
            params.append('requestMonth', '11');
            if (selectedMonthYear !== null) {
              params.append('requestYear', String(selectedMonthYear));
            }
          } else {
            params.append('requestMonth', String(monthKey));
          }
        });
      }

      const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (append) {
        // Фильтруем дубликаты при добавлении данных
        setAllItems(prev => {
          const existingIds = new Set(prev.map((item: PurchasePlanItem) => item.id));
          const newItems = result.content.filter((item: PurchasePlanItem) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
        if (data) {
          const existingIds = new Set((data.content || []).map((item: PurchasePlanItem) => item.id));
          const newItems = result.content.filter((item: PurchasePlanItem) => !existingIds.has(item.id));
          setData({
            ...result,
            content: [...(data.content || []), ...newItems]
          });
        }
      } else {
        setAllItems(result.content || []);
        setData(result);
        if (initialTotalElementsRef.current === null) {
          initialTotalElementsRef.current = result.totalElements || 0;
        }
      }
      
      setHasMore(result.content && result.content.length === size && (result.number || 0) < (result.totalPages || 0) - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filtersHook, selectedMonthYear, pageSize]);

  // Загружаем данные для диаграммы
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000');
        
        if (selectedYear !== null) {
          const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
          if (selectedMonthYear === null || hasCurrentYearMonths) {
            params.append('year', String(selectedYear));
          }
        }
        
        if (filtersHook.cfoFilter.size > 0) {
          filtersHook.cfoFilter.forEach(cfo => {
            if (cfo === 'Не выбрано') {
              params.append('cfo', '__NULL__');
            } else {
              params.append('cfo', cfo);
            }
          });
        }
        if (filtersHook.companyFilter.size > 0) {
          filtersHook.companyFilter.forEach(company => {
            if (company === 'Не выбрано') {
              params.append('company', '__NULL__');
            } else {
              params.append('company', company);
            }
          });
        }
        if (filtersHook.purchaserCompanyFilter.size > 0) {
          filtersHook.purchaserCompanyFilter.forEach(purchaserCompany => {
            if (purchaserCompany === 'Не выбрано') {
              params.append('purchaserCompany', '__NULL__');
            } else {
              params.append('purchaserCompany', purchaserCompany);
            }
          });
        }
        if (filtersHook.filters.purchaseSubject && filtersHook.filters.purchaseSubject.trim() !== '') {
          params.append('purchaseSubject', filtersHook.filters.purchaseSubject.trim());
        }
        if (filtersHook.purchaserFilter.size > 0) {
          filtersHook.purchaserFilter.forEach(purchaser => {
            if (purchaser === 'Не назначен') {
              params.append('purchaser', '__NULL__');
            } else {
              params.append('purchaser', purchaser);
            }
          });
        }
        if (filtersHook.categoryFilter.size > 0) {
          filtersHook.categoryFilter.forEach(category => {
            params.append('category', category);
          });
        }
        if (filtersHook.statusFilter.size > 0) {
          filtersHook.statusFilter.forEach(status => {
            if (status === 'Пусто') {
              params.append('status', '__NULL__');
            } else {
              params.append('status', status);
            }
          });
        }
        
        const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const result = await response.json();
          setChartData(result.content || []);
        }
      } catch (err) {
        setChartData([]);
      }
    };
    
    fetchChartData();
  }, [selectedYear, selectedMonthYear, filtersHook.filters, filtersHook.cfoFilter, filtersHook.companyFilter, filtersHook.purchaserCompanyFilter, filtersHook.purchaserFilter, filtersHook.categoryFilter, filtersHook.statusFilter, selectedMonths]);

  // Загружаем данные для сводной таблицы
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000');
        
        if (selectedYear !== null) {
          const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
          if (selectedMonthYear === null || hasCurrentYearMonths) {
            params.append('year', String(selectedYear));
          }
        }
        
        if (filtersHook.cfoFilter.size > 0) {
          filtersHook.cfoFilter.forEach(cfo => {
            if (cfo === 'Не выбрано') {
              params.append('cfo', '__NULL__');
            } else {
              params.append('cfo', cfo);
            }
          });
        }
        if (filtersHook.companyFilter.size > 0) {
          filtersHook.companyFilter.forEach(company => {
            if (company === 'Не выбрано') {
              params.append('company', '__NULL__');
            } else {
              params.append('company', company);
            }
          });
        }
        if (filtersHook.purchaserCompanyFilter.size > 0) {
          filtersHook.purchaserCompanyFilter.forEach(purchaserCompany => {
            if (purchaserCompany === 'Не выбрано') {
              params.append('purchaserCompany', '__NULL__');
            } else {
              params.append('purchaserCompany', purchaserCompany);
            }
          });
        }
        if (filtersHook.filters.purchaseSubject && filtersHook.filters.purchaseSubject.trim() !== '') {
          params.append('purchaseSubject', filtersHook.filters.purchaseSubject.trim());
        }
        if (filtersHook.categoryFilter.size > 0) {
          filtersHook.categoryFilter.forEach(category => {
            params.append('category', category);
          });
        }
        if (filtersHook.statusFilter.size > 0) {
          filtersHook.statusFilter.forEach(status => {
            if (status === 'Пусто') {
              params.append('status', '__NULL__');
            } else {
              params.append('status', status);
            }
          });
        }
        if (selectedMonths.size > 0) {
          selectedMonths.forEach(monthKey => {
            if (monthKey === -1) {
              params.append('requestMonth', '-1');
            } else if (monthKey === -2) {
              params.append('requestMonth', '11');
              if (selectedMonthYear !== null) {
                params.append('requestYear', String(selectedMonthYear));
              }
            } else {
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
        setSummaryData([]);
      }
    };
    
    fetchSummaryData();
  }, [selectedYear, selectedMonthYear, selectedMonths, filtersHook.filters, filtersHook.cfoFilter, filtersHook.companyFilter, filtersHook.purchaserCompanyFilter, filtersHook.categoryFilter, filtersHook.statusFilter]);

  // Функция для расчета распределения по месяцам
  const getMonthlyDistribution = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return Array(14).fill(0);
    }

    let displayYear: number;
    if (selectedYear !== null) {
      displayYear = selectedYear;
    } else {
      const yearFromData = chartData.find(item => item.year !== null)?.year;
      if (yearFromData) {
        displayYear = yearFromData;
      } else {
        const itemWithDate = chartData.find(item => item.requestDate);
        if (itemWithDate && itemWithDate.requestDate) {
          displayYear = new Date(itemWithDate.requestDate).getFullYear();
        } else {
          displayYear = new Date().getFullYear();
        }
      }
    }
    const prevYear = displayYear - 1;

    const monthCounts = Array(14).fill(0);
    
    chartData.forEach((item) => {
      if (item.status === 'Исключена') {
        return;
      }
      
      if (!item.requestDate) {
        monthCounts[13]++;
        return;
      }
      
      const requestDate = new Date(item.requestDate);
      const itemYear = requestDate.getFullYear();
      const itemMonth = requestDate.getMonth();
      
      if (itemYear === prevYear && itemMonth === 11) {
        monthCounts[0]++;
      } else if (itemYear === displayYear) {
        monthCounts[itemMonth + 1]++;
      }
    });

    return monthCounts;
  }, [chartData, selectedYear]);

  // Обработка сортировки
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

  // Загружаем годы при монтировании
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/years`);
        if (response.ok) {
          const years = await response.json();
          setAllYears(years);
          if (years.length > 0 && !selectedYear) {
            setSelectedYear(years[0]);
          }
        }
      } catch (err) {
        // Ошибка загрузки годов игнорируется
      }
    };
    fetchYears();
  }, []);

  // Загружаем общее количество записей
  useEffect(() => {
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=1`);
        if (response.ok) {
          const result = await response.json();
          setTotalRecords(result.totalElements || 0);
        }
      } catch (err) {
        // Ошибка загрузки общего количества записей игнорируется
      }
    };
    fetchTotalRecords();
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = currentPage + 1;
          fetchData(
            nextPage,
            pageSize,
            selectedYear,
            sortField,
            sortDirection,
            filtersHook.filters,
            selectedMonths,
            true
          );
          setCurrentPage(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [currentPage, hasMore, loading, loadingMore, selectedYear, sortField, sortDirection, filtersHook.filters, selectedMonths, fetchData, pageSize]);

  // Стабилизируем строковые представления фильтров через useMemo, чтобы избежать лишних обновлений
  const cfoFilterStr = useMemo(() => Array.from(filtersHook.cfoFilter).sort().join(','), [filtersHook.cfoFilter]);
  const companyFilterStr = useMemo(() => Array.from(filtersHook.companyFilter).sort().join(','), [filtersHook.companyFilter]);
  const purchaserCompanyFilterStr = useMemo(() => Array.from(filtersHook.purchaserCompanyFilter).sort().join(','), [filtersHook.purchaserCompanyFilter]);
  const purchaserFilterStr = useMemo(() => Array.from(filtersHook.purchaserFilter).sort().join(','), [filtersHook.purchaserFilter]);
  const categoryFilterStr = useMemo(() => Array.from(filtersHook.categoryFilter).sort().join(','), [filtersHook.categoryFilter]);
  const statusFilterStr = useMemo(() => Array.from(filtersHook.statusFilter).sort().join(','), [filtersHook.statusFilter]);
  const selectedMonthsStr = useMemo(() => Array.from(selectedMonths).sort().join(','), [selectedMonths]);

  // Загружаем данные при изменении фильтров, сортировки, года
  // Используем размер Set и строковое представление для правильного отслеживания изменений Set
  useEffect(() => {
    // Пропускаем первую загрузку, если фильтр по статусу еще не инициализирован
    // Это предотвращает двойное обновление при инициализации
    if (isInitialLoadRef.current && filtersHook.statusFilter.size === 0) {
      // Ждем, пока фильтр по статусу будет инициализирован
      return;
    }
    
    // После первой инициализации фильтра, сбрасываем флаг
    if (isInitialLoadRef.current && filtersHook.statusFilter.size > 0) {
      isInitialLoadRef.current = false;
    }

    setCurrentPage(0);
    setHasMore(true);
    initialTotalElementsRef.current = null; // Сбрасываем при изменении фильтров
    fetchData(
      0,
      pageSize,
      selectedYear,
      sortField,
      sortDirection,
      filtersHook.filters,
      selectedMonths,
      false
    );
  }, [
    selectedYear, 
    selectedMonthYear, 
    sortField, 
    sortDirection, 
    filtersHook.filters, 
    filtersHook.cfoFilter.size,
    cfoFilterStr,
    filtersHook.companyFilter.size,
    companyFilterStr,
    filtersHook.purchaserCompanyFilter.size,
    purchaserCompanyFilterStr,
    filtersHook.purchaserFilter.size,
    purchaserFilterStr,
    filtersHook.categoryFilter.size,
    categoryFilterStr,
    filtersHook.statusFilter.size,
    statusFilterStr,
    selectedMonths.size,
    selectedMonthsStr
  ]);

  return {
    // Данные
    data,
    setData,
    allItems,
    setAllItems,
    loading,
    loadingMore,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    hasMore,
    loadMoreRef,
    selectedYear,
    setSelectedYear,
    allYears,
    totalRecords,
    selectedMonths,
    setSelectedMonths,
    selectedMonthYear,
    setSelectedMonthYear,
    lastSelectedMonthIndex,
    setLastSelectedMonthIndex,
    selectedCurrency,
    setSelectedCurrency,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    chartData,
    setChartData,
    summaryData,
    setSummaryData,
    newItemData,
    setNewItemData,
    printRef,
    getMonthlyDistribution,
    handleSort,
    fetchData,
    formatBudget: (amount: number | null) => formatBudget(amount, selectedCurrency),
    formatBudgetFull: (amount: number | null) => formatBudgetFull(amount, selectedCurrency),
    // Хуки
    filters: filtersHook,
    columns: columnsHook,
    modalData: dataHook,
    editing: editingHook,
    modals: modalsHook,
    versions: versionsHook,
  };
};
