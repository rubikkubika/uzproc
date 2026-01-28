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
import { useFocusRestoreAfterFetch } from '../../../purchase-requests/_components/hooks/useFocusRestoreAfterFetch';
import { useInfiniteScroll } from '../../../purchase-requests/_components/hooks/useInfiniteScroll';

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
  // Кеш для статусов заявок, чтобы не делать повторные запросы
  const purchaseRequestStatusCache = useRef<Map<number, string | null>>(new Map());
  // Кеш для годов (чтобы не делать повторные запросы)
  const yearsCacheRef = useRef<number[] | null>(null);
  const yearsLoadingRef = useRef<boolean>(false);
  const yearsFetchedRef = useRef<boolean>(false);
  // Общий кеш для fetchChartData и fetchSummaryData (они могут делать одинаковые запросы)
  const purchasePlanItemsCacheRef = useRef<Map<string, PurchasePlanItem[]>>(new Map());
  const purchasePlanItemsLoadingRef = useRef<Set<string>>(new Set());
  // Debounce таймер для fetchChartData
  const chartDataDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Debounce таймер для fetchSummaryData
  const summaryDataDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Кеш для totalRecords
  const totalRecordsCacheRef = useRef<number | null>(null);
  const totalRecordsLoadingRef = useRef<boolean>(false);
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
  const [summaryData, setSummaryData] = useState<PurchasePlanItem[]>([]); // Для обратной совместимости с usePurchasePlanItemsEditing
  // Отдельное состояние для сводной статистики из нового эндпоинта
  const [purchaserSummaryData, setPurchaserSummaryData] = useState<Array<{
    purchaser: string;
    count: number;
    totalBudget: number;
    totalComplexity: number;
  }>>([]);
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

  // Ref для хранения актуальных значений фильтров (чтобы избежать пересоздания fetchData)
  const filtersRef = useRef(filtersHook);
  filtersRef.current = filtersHook;

  // Функция для загрузки данных
  const fetchData = useCallback(async (
    page: number, 
    size: number, 
    year: number | null = null,
    sortFieldParam: SortField = null,
    sortDirectionParam: SortDirection = null,
    textFilters: Record<string, string> = {},
    months: Set<number> = new Set(),
    append: boolean = false,
    // Опциональные параметры для фильтров (если не переданы, используем filtersRef.current)
    overridePurchaserFilter?: Set<string>,
    overrideCfoFilter?: Set<string>,
    overrideCompanyFilter?: Set<string>,
    overridePurchaserCompanyFilter?: Set<string>,
    overrideCategoryFilter?: Set<string>,
    overrideStatusFilter?: Set<string>
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
      
      if (sortFieldParam && sortDirectionParam) {
        params.append('sortBy', sortFieldParam);
        params.append('sortDir', sortDirectionParam);
      }
      
      // Добавляем параметры фильтрации (используем переданные значения или filtersRef.current)
      const currentFilters = filtersRef.current;
      const cfoFilter = overrideCfoFilter ?? currentFilters.cfoFilter;
      const companyFilter = overrideCompanyFilter ?? currentFilters.companyFilter;
      const purchaserCompanyFilter = overridePurchaserCompanyFilter ?? currentFilters.purchaserCompanyFilter;
      const purchaserFilter = overridePurchaserFilter ?? currentFilters.purchaserFilter;
      const categoryFilter = overrideCategoryFilter ?? currentFilters.categoryFilter;
      const statusFilter = overrideStatusFilter ?? currentFilters.statusFilter;
      
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          if (cfo === 'Не выбрано') {
            params.append('cfo', '__NULL__');
          } else {
            params.append('cfo', cfo);
          }
        });
      }
      if (companyFilter.size > 0) {
        companyFilter.forEach(company => {
          if (company === 'Не выбрано') {
            params.append('company', '__NULL__');
          } else {
            params.append('company', company);
          }
        });
      }
      if (purchaserCompanyFilter.size > 0) {
        purchaserCompanyFilter.forEach(pc => {
          if (pc === 'Не выбрано') {
            params.append('purchaserCompany', '__NULL__');
          } else {
            params.append('purchaserCompany', pc);
          }
        });
      }
      if (textFilters.id && textFilters.id.trim() !== '') {
        params.append('id', textFilters.id.trim());
      }
      if (textFilters.purchaseSubject && textFilters.purchaseSubject.trim() !== '') {
        params.append('purchaseSubject', textFilters.purchaseSubject.trim());
      }
      if (textFilters.purchaseRequestId && textFilters.purchaseRequestId.trim() !== '') {
        params.append('purchaseRequestId', textFilters.purchaseRequestId.trim());
      }
      // Фильтр бюджета
      const budgetOperator = textFilters.budgetAmountOperator;
      const budgetAmount = textFilters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      if (textFilters.currentContractEndDate && textFilters.currentContractEndDate.trim() !== '') {
        const dateValue = textFilters.currentContractEndDate.trim();
        if (dateValue === '-') {
          params.append('currentContractEndDate', 'null');
        } else {
          params.append('currentContractEndDate', dateValue);
        }
      }
      if (purchaserFilter.size > 0) {
        purchaserFilter.forEach(p => {
          if (p === 'Не назначен' || p === null || p === undefined || p === '') {
            params.append('purchaser', '__NULL__');
          } else {
            params.append('purchaser', p);
          }
        });
      }
      if (categoryFilter.size > 0) {
        categoryFilter.forEach(category => {
          params.append('category', category);
        });
      }
      if (statusFilter.size > 0) {
        statusFilter.forEach(status => {
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
      
      // Обновляем статусы из связанных заявок одним запросом
      const itemsWithPurchaseRequest = result.content.filter((item: PurchasePlanItem) => 
        item.purchaseRequestId !== null && item.purchaseRequestId !== undefined
      );
      
      if (itemsWithPurchaseRequest.length > 0) {
        try {
          // Собираем уникальные purchaseRequestId
          const purchaseRequestIdSet = new Set<number>();
          itemsWithPurchaseRequest.forEach((item: PurchasePlanItem) => {
            if (item.purchaseRequestId != null) {
              purchaseRequestIdSet.add(item.purchaseRequestId);
            }
          });
          const uniquePurchaseRequestIds: number[] = Array.from(purchaseRequestIdSet);
          
          // Пропускаем запрос, если нет уникальных ID
          if (uniquePurchaseRequestIds.length > 0) {
            
            // Фильтруем ID, которых нет в кеше
            const idsToFetch = uniquePurchaseRequestIds.filter(id => !purchaseRequestStatusCache.current.has(id));
            const cachedStatuses = new Map<number, string | null>();
            
            // Используем кешированные статусы
            uniquePurchaseRequestIds.forEach(id => {
              if (purchaseRequestStatusCache.current.has(id)) {
                cachedStatuses.set(id, purchaseRequestStatusCache.current.get(id)!);
              }
            });
            
            // Загружаем только те заявки, которых нет в кеше
            if (idsToFetch.length > 0) {
              // Загружаем все заявки одним запросом
              const params = new URLSearchParams();
              idsToFetch.forEach((id: number) => {
                params.append('idPurchaseRequest', String(id));
              });
              
              const url = `${getBackendUrl()}/api/purchase-requests/by-id-purchase-request-list?${params.toString()}`;
              const response = await fetch(url);
              if (response.ok) {
                const purchaseRequestsMap: Record<number, { statusGroup?: string | null }> = await response.json();
                
                // Обновляем кеш
                Object.entries(purchaseRequestsMap).forEach(([idStr, pr]) => {
                  const id = Number(idStr);
                  const status = pr.statusGroup || null;
                  purchaseRequestStatusCache.current.set(id, status);
                  cachedStatuses.set(id, status);
                });
              }
            }
            
            // Создаем карту обновлений статусов (из кеша и новых данных)
            const statusMap = new Map<number, string | null>();
            itemsWithPurchaseRequest.forEach((item: PurchasePlanItem) => {
              if (item.purchaseRequestId != null) {
                const status = cachedStatuses.get(item.purchaseRequestId);
                if (status !== undefined) {
                  statusMap.set(item.id, status);
                }
              }
            });
            
            // Обновляем статусы в данных
            if (statusMap.size > 0) {
              result.content = result.content.map((item: PurchasePlanItem) => {
                const newStatus = statusMap.get(item.id);
                if (newStatus !== undefined) {
                  return { ...item, purchaseRequestStatus: newStatus };
                }
                return item;
              });
            }
          }
        } catch (error) {
          // Игнорируем ошибки загрузки статусов
        }
      }
      
      const items = result.content || [];

      if (append) {
        setAllItems(prev => [...prev, ...items]);
      } else {
        setAllItems(items);
        if (initialTotalElementsRef.current === null) {
          initialTotalElementsRef.current = result.totalElements || 0;
        }
      }

      setData(result);
      setHasMore(items.length === size && !result.last);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [selectedMonthYear, selectedCurrency]);

  // Ref для хранения всех загруженных данных версии (без фильтров)
  const versionDataRef = useRef<PurchasePlanItem[]>([]);
  // Ref для отслеживания последних примененных фильтров, чтобы избежать повторных применений
  const lastAppliedFiltersRef = useRef<string>('');
  // Ref для отслеживания того, что фильтр статуса был установлен при загрузке версии
  const statusFilterSetForVersionRef = useRef<number | null>(null);
  // Ref для отслеживания того, что нужно применить фильтры после установки фильтра статуса
  const shouldApplyFiltersAfterStatusUpdateRef = useRef(false);
  // Ref для отслеживания того, что currentPage был сброшен при загрузке версии
  const currentPageResetForVersionRef = useRef<number | null>(null);

  // Функция для клиентской фильтрации данных версии
  const applyFiltersToVersionData = useCallback(() => {
    if (versionDataRef.current.length === 0) {
      return;
    }

    if (!versionsHook.selectedVersionInfo || versionsHook.selectedVersionInfo.isCurrent) {
      return;
    }

    // Создаем ключ для текущих фильтров
    const filtersKey = JSON.stringify({
      filters: filtersRef.current.filters,
      cfoFilter: Array.from(filtersRef.current.cfoFilter).sort(),
      companyFilter: Array.from(filtersRef.current.companyFilter).sort(),
      purchaserCompanyFilter: Array.from(filtersRef.current.purchaserCompanyFilter).sort(),
      purchaserFilter: Array.from(filtersRef.current.purchaserFilter).sort(),
      categoryFilter: Array.from(filtersRef.current.categoryFilter).sort(),
      statusFilter: Array.from(filtersRef.current.statusFilter).sort(),
      selectedMonths: Array.from(selectedMonths).sort(),
      selectedMonthYear,
      sortField,
      sortDirection,
      currentPage
    });

    // Пропускаем, если фильтры не изменились (но только если ключ не пустой - значит фильтры уже применялись)
    if (lastAppliedFiltersRef.current !== '' && lastAppliedFiltersRef.current === filtersKey) {
      return;
    }

    lastAppliedFiltersRef.current = filtersKey;
    
    let filtered = [...versionDataRef.current];
    const currentFilters = filtersRef.current;

    // Текстовые фильтры
    if (currentFilters.filters.id && currentFilters.filters.id.trim() !== '') {
      const idValue = currentFilters.filters.id.trim();
      filtered = filtered.filter(item => String(item.id).includes(idValue));
    }

    if (currentFilters.filters.purchaseSubject && currentFilters.filters.purchaseSubject.trim() !== '') {
      const subjectValue = currentFilters.filters.purchaseSubject.trim().toLowerCase();
      filtered = filtered.filter(item => 
        item.purchaseSubject?.toLowerCase().includes(subjectValue)
      );
    }

    if (currentFilters.filters.purchaseRequestId && currentFilters.filters.purchaseRequestId.trim() !== '') {
      const requestIdValue = currentFilters.filters.purchaseRequestId.trim();
      filtered = filtered.filter(item => 
        item.purchaseRequestId && String(item.purchaseRequestId).includes(requestIdValue)
      );
    }

    // Фильтр бюджета
    if (currentFilters.filters.budgetAmount && currentFilters.filters.budgetAmount.trim() !== '') {
      const budgetValue = parseFloat(currentFilters.filters.budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
      if (!isNaN(budgetValue) && budgetValue >= 0) {
        const operator = currentFilters.filters.budgetAmountOperator || 'gte';
        filtered = filtered.filter(item => {
          if (item.budgetAmount === null) return false;
          switch (operator) {
            case 'gte': return item.budgetAmount >= budgetValue;
            case 'lte': return item.budgetAmount <= budgetValue;
            case 'eq': return item.budgetAmount === budgetValue;
            default: return true;
          }
        });
      }
    }

    // Фильтр даты окончания текущего договора
    if (currentFilters.filters.currentContractEndDate && currentFilters.filters.currentContractEndDate.trim() !== '') {
      const dateValue = currentFilters.filters.currentContractEndDate.trim();
      if (dateValue === '-' || dateValue === 'null') {
        filtered = filtered.filter(item => !item.currentContractEndDate);
      } else {
        try {
          const filterDate = new Date(dateValue);
          filtered = filtered.filter(item => {
            if (!item.currentContractEndDate) return false;
            const itemDate = new Date(item.currentContractEndDate);
            return itemDate.toDateString() === filterDate.toDateString();
          });
        } catch (e) {
          // Игнорируем ошибки парсинга даты
        }
      }
    }

    // Множественные фильтры
    if (currentFilters.cfoFilter.size > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(item => {
        if (!item.cfo) return currentFilters.cfoFilter.has('Не выбрано');
        return currentFilters.cfoFilter.has(item.cfo);
      });
    }

    if (currentFilters.companyFilter.size > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(item => {
        if (!item.company) return currentFilters.companyFilter.has('Не выбрано');
        return currentFilters.companyFilter.has(item.company);
      });
    }

    if (currentFilters.purchaserCompanyFilter.size > 0) {
      const beforeCount = filtered.length;
      // Проверяем уникальные значения purchaserCompany в данных
      const uniquePurchaserCompanies = new Set(filtered.map(item => item.purchaserCompany || 'Не выбрано'));
      filtered = filtered.filter(item => {
        // Если у элемента нет purchaserCompany, проверяем наличие "Не выбрано" в фильтре
        if (!item.purchaserCompany) {
          return currentFilters.purchaserCompanyFilter.has('Не выбрано');
        }
        // Проверяем, есть ли значение элемента в фильтре
        return currentFilters.purchaserCompanyFilter.has(item.purchaserCompany);
      });
    }

    if (currentFilters.purchaserFilter.size > 0) {
      filtered = filtered.filter(item => {
        if (!item.purchaser) {
          return currentFilters.purchaserFilter.has('Не назначен') || 
                 currentFilters.purchaserFilter.has('__NULL__') ||
                 currentFilters.purchaserFilter.has('');
        }
        return currentFilters.purchaserFilter.has(item.purchaser);
      });
    }

    if (currentFilters.categoryFilter.size > 0) {
      filtered = filtered.filter(item => {
        if (!item.category) return currentFilters.categoryFilter.has('Не выбрано');
        return currentFilters.categoryFilter.has(item.category);
      });
    }

    // Фильтр статуса: если пустой, показываем все элементы
    if (currentFilters.statusFilter.size > 0) {
      const beforeCount = filtered.length;
      // Проверяем уникальные значения status в данных (учитываем и purchaseRequestStatus)
      const uniqueStatuses = new Set(filtered.map(item => {
        if (item.purchaseRequestId !== null && item.purchaseRequestStatus) {
          return item.purchaseRequestStatus;
        }
        return item.status || 'Нет статуса';
      }));
      
      // Подсчитываем элементы с заявками перед фильтрацией
      const itemsWithRequestsBefore = filtered.filter(item => item.purchaseRequestId !== null && item.purchaseRequestId !== undefined);
      
      filtered = filtered.filter(item => {
        // Для позиций с заявками используем purchaseRequestStatus, иначе status
        const itemStatus = item.purchaseRequestId !== null && item.purchaseRequestStatus 
          ? item.purchaseRequestStatus 
          : item.status;
        if (!itemStatus) {
          return false;
        }
        const isInFilter = currentFilters.statusFilter.has(itemStatus);
        return isInFilter;
      });
      
      // Подсчитываем элементы с заявками после фильтрации
      const itemsWithRequestsAfter = filtered.filter(item => item.purchaseRequestId !== null && item.purchaseRequestId !== undefined);
      
      // Логируем примеры элементов с заявками после фильтрации
      if (itemsWithRequestsAfter.length > 0) {
        const examples = itemsWithRequestsAfter.slice(0, 3).map(item => ({
          id: item.id,
          purchaseRequestId: item.purchaseRequestId,
          purchaseRequestStatus: item.purchaseRequestStatus,
          status: item.status
        }));
      } else {
      }
    } else {
    }

    // Фильтр по месяцам
    if (selectedMonths.size > 0) {
      // Определяем год для фильтрации
      const filterYear = selectedYear !== null ? selectedYear : new Date().getFullYear();
      const prevYear = filterYear - 1;
      
      const items2025 = filtered.filter(item => {
        if (!item.requestDate) return false;
        const itemDate = new Date(item.requestDate);
        return itemDate.getFullYear() === 2025;
      });
      
      const beforeCount = filtered.length;
      filtered = filtered.filter(item => {
        // Проверяем "без даты" (-1)
        if (!item.requestDate) {
          return selectedMonths.has(-1);
        }
        
        const itemDate = new Date(item.requestDate);
        const itemMonth = itemDate.getMonth(); // 0-11
        const itemYear = itemDate.getFullYear();
        
        // Проверяем декабрь предыдущего года (ключ -2)
        if (selectedMonths.has(-2)) {
          // Для декабря предыдущего года проверяем, что это декабрь (месяц 11) предыдущего года
          if (itemYear === prevYear && itemMonth === 11) {
            // Если также указан selectedMonthYear, проверяем его (для точного совпадения года)
            if (selectedMonthYear !== null) {
              const matches = itemYear === selectedMonthYear;
              return matches;
            }
            return true;
          }
        }
        
        // Проверяем обычные месяцы текущего года (0-11)
        // НО только если это не декабрь предыдущего года (он уже обработан выше)
        if (itemYear === prevYear && itemMonth === 11) {
          // Если это декабрь предыдущего года, он уже обработан выше
          // Если выбран декабрь предыдущего года, он уже вернул true выше
          // Если не выбран, то этот элемент не должен показываться
          return false; // Декабрь предыдущего года обрабатывается только через ключ -2
        }
        
        if (selectedMonths.has(itemMonth)) {
          // Для обычных месяцев проверяем, что это текущий год
          if (itemYear === filterYear) {
            return true;
          }
          // Если указан selectedMonthYear, проверяем его
          if (selectedMonthYear !== null) {
            return itemYear === selectedMonthYear;
          }
        }
        
        return false;
      });
      
    }

    // Сортировка
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];
        
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Пагинация
    // ВАЖНО: Если currentPage был сброшен при загрузке версии, используем 0 вместо текущего значения
    // Это гарантирует, что элементы с заявками будут видны на первой странице
    let actualCurrentPage = currentPage;
    if (currentPageResetForVersionRef.current === versionsHook.selectedVersionId && currentPage !== 0) {
      actualCurrentPage = 0;
    }
    
    const startIndex = actualCurrentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedContent = filtered.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filtered.length / pageSize);

    const pageResponse: PageResponse = {
      content: paginatedContent,
      totalElements: filtered.length,
      totalPages: totalPages,
      size: pageSize,
      number: currentPage,
      first: currentPage === 0,
      last: currentPage >= totalPages - 1,
      numberOfElements: paginatedContent.length,
      empty: filtered.length === 0,
      pageable: {
        pageNumber: currentPage,
        pageSize: pageSize,
        sort: { sorted: !!sortField, unsorted: !sortField, empty: !sortField },
        offset: startIndex,
        paged: true,
        unpaged: false
      },
      sort: { sorted: !!sortField, unsorted: !sortField, empty: !sortField }
    };

    // Подсчитываем элементы с заявками в итоговых данных перед установкой
    const itemsWithRequestsInFiltered = filtered.filter(item => item.purchaseRequestId !== null && item.purchaseRequestId !== undefined);
    const itemsWithRequestsInPage = paginatedContent.filter(item => item.purchaseRequestId !== null && item.purchaseRequestId !== undefined);
    
    if (itemsWithRequestsInPage.length > 0) {
      const examples = itemsWithRequestsInPage.slice(0, 3).map(item => ({
        id: item.id,
        purchaseRequestId: item.purchaseRequestId,
        purchaseRequestStatus: item.purchaseRequestStatus,
        status: item.status
      }));
    }

    setAllItems(filtered);
    setData(pageResponse);
    setTotalRecords(filtered.length);
    setHasMore(currentPage < totalPages - 1);
  }, [currentPage, pageSize, sortField, sortDirection, selectedMonths, selectedMonthYear, selectedYear, versionsHook.selectedVersionInfo]);

  // Функция для загрузки данных версии
  const loadVersionData = useCallback(async (versionId: number) => {
    setLoading(true);
    setError(null);
    let versionItems: PurchasePlanItem[] = [];
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-versions/${versionId}/items`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      versionItems = await response.json();
      
      // Проверяем элементы с заявками
      const itemsWithPurchaseRequest = versionItems.filter((item: PurchasePlanItem) => 
        item.purchaseRequestId !== null && item.purchaseRequestId !== undefined
      );
      
      // Загружаем статусы заявок для элементов версии одним запросом (аналогично fetchData)
      if (itemsWithPurchaseRequest.length > 0) {
        try {
          // Собираем уникальные purchaseRequestId
          const purchaseRequestIdSet = new Set<number>();
          itemsWithPurchaseRequest.forEach((item: PurchasePlanItem) => {
            if (item.purchaseRequestId != null) {
              purchaseRequestIdSet.add(item.purchaseRequestId);
            }
          });
          const uniquePurchaseRequestIds: number[] = Array.from(purchaseRequestIdSet);
          
          
          // Фильтруем ID, которых нет в кеше
          const idsToFetch = uniquePurchaseRequestIds.filter(id => !purchaseRequestStatusCache.current.has(id));
          const cachedStatuses = new Map<number, string | null>();
          
          // Используем кешированные статусы
          uniquePurchaseRequestIds.forEach(id => {
            if (purchaseRequestStatusCache.current.has(id)) {
              cachedStatuses.set(id, purchaseRequestStatusCache.current.get(id)!);
            }
          });
          
          // Загружаем только те заявки, которых нет в кеше
          if (idsToFetch.length > 0) {
            // Загружаем все заявки одним запросом
            const params = new URLSearchParams();
            idsToFetch.forEach((id: number) => {
              params.append('idPurchaseRequest', String(id));
            });
            
            const url = `${getBackendUrl()}/api/purchase-requests/by-id-purchase-request-list?${params.toString()}`;
            const response = await fetch(url);
            if (response.ok) {
              const purchaseRequestsMap: Record<number, { statusGroup?: string | null }> = await response.json();
              
              // Обновляем кеш
              Object.entries(purchaseRequestsMap).forEach(([idStr, pr]) => {
                const id = Number(idStr);
                const status = pr.statusGroup || null;
                purchaseRequestStatusCache.current.set(id, status);
                cachedStatuses.set(id, status);
              });
            }
          } else {
          }
          
          // Создаем карту обновлений статусов (из кеша и новых данных)
          const statusMap = new Map<number, string | null>();
          itemsWithPurchaseRequest.forEach((item: PurchasePlanItem) => {
            if (item.purchaseRequestId != null) {
              const status = cachedStatuses.get(item.purchaseRequestId);
              if (status !== undefined) {
                statusMap.set(item.id, status);
              }
            }
          });
          
          
          // Обновляем статусы в данных версии
          if (statusMap.size > 0) {
            versionItems = versionItems.map((item: PurchasePlanItem) => {
              const newStatus = statusMap.get(item.id);
              if (newStatus !== undefined) {
                return { ...item, purchaseRequestStatus: newStatus };
              }
              return item;
            });
          }
        } catch (error) {
        }
      }
      
      // Проверяем поле purchaser во всех элементах
      const itemsWithPurchaser = versionItems.filter(item => item.purchaser && item.purchaser.trim() !== '');
      const itemsWithoutPurchaser = versionItems.filter(item => !item.purchaser || item.purchaser.trim() === '');
      
      // Преобразуем в формат PageResponse
      const pageResponse: PageResponse = {
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
      };
      
      // Сохраняем все данные версии для последующей фильтрации
      // ВАЖНО: Сохраняем ПОСЛЕ загрузки статусов заявок, чтобы purchaseRequestStatus был доступен
      versionDataRef.current = versionItems;
      // Сбрасываем ключ фильтров при загрузке новой версии
      lastAppliedFiltersRef.current = '';
      
      // Собираем уникальные значения из данных версии для корректной инициализации фильтров
      // ВАЖНО: Делаем это ПОСЛЕ загрузки статусов заявок, чтобы purchaseRequestStatus был доступен
      const uniqueStatuses = new Set<string>();
      const uniquePurchaserCompanies = new Set<string>();
      const uniqueCfo = new Set<string>();
      const uniqueCompanies = new Set<string>();
      const uniquePurchasers = new Set<string>();
      const uniqueCategories = new Set<string>();
      
      versionItems.forEach(item => {
        // Учитываем статусы из обоих полей: status (план закупок) и purchaseRequestStatus (заявка)
        // Для позиций с заявками приоритет у purchaseRequestStatus
        if (item.purchaseRequestId !== null && item.purchaseRequestStatus) {
          uniqueStatuses.add(item.purchaseRequestStatus);
        } else if (item.status) {
          uniqueStatuses.add(item.status);
        }
        if (item.purchaserCompany) {
          uniquePurchaserCompanies.add(item.purchaserCompany);
        } else {
          uniquePurchaserCompanies.add('Не выбрано');
        }
        if (item.cfo) uniqueCfo.add(item.cfo);
        else uniqueCfo.add('Не выбрано');
        if (item.company) uniqueCompanies.add(item.company);
        else uniqueCompanies.add('Не выбрано');
        if (item.purchaser) uniquePurchasers.add(item.purchaser);
        else uniquePurchasers.add('Не назначен');
        if (item.category) uniqueCategories.add(item.category);
        else uniqueCategories.add('Не выбрано');
      });
      
      // ВАЖНО: При загрузке архивной версии всегда устанавливаем фильтр статуса на все доступные статусы из данных версии
      // Это гарантирует, что отображаются все позиции, включая связанные с заявками
      const statusesArray = Array.from(uniqueStatuses).filter(s => s !== 'Исключена');
      if (statusesArray.length > 0) {
        // Отмечаем, что фильтр статуса был установлен для этой версии
        statusFilterSetForVersionRef.current = versionId;
        // Устанавливаем флаг, что нужно применить фильтры после обновления статуса
        shouldApplyFiltersAfterStatusUpdateRef.current = true;
        filtersHook.setStatusFilter(new Set(statusesArray));
      } else {
        statusFilterSetForVersionRef.current = versionId;
        shouldApplyFiltersAfterStatusUpdateRef.current = true;
        filtersHook.setStatusFilter(new Set());
      }
      
      // Сбрасываем фильтры, значения которых отсутствуют в данных версии
      // Фильтр компании закупщика
      if (filtersHook.purchaserCompanyFilter.size > 0) {
        const hasMatchingValues = Array.from(filtersHook.purchaserCompanyFilter).some(value => 
          uniquePurchaserCompanies.has(value)
        );
        if (!hasMatchingValues) {
          // Устанавливаем фильтр на доступные значения или пустой Set
          if (uniquePurchaserCompanies.size > 0) {
            filtersHook.setPurchaserCompanyFilter(new Set(uniquePurchaserCompanies));
          } else {
            filtersHook.setPurchaserCompanyFilter(new Set());
          }
        }
      }
      
      // Фильтр ЦФО
      if (filtersHook.cfoFilter.size > 0) {
        const hasMatchingValues = Array.from(filtersHook.cfoFilter).some(value => 
          uniqueCfo.has(value)
        );
        if (!hasMatchingValues) {
          filtersHook.setCfoFilter(new Set());
        }
      }
      
      // Фильтр компании
      if (filtersHook.companyFilter.size > 0) {
        const hasMatchingValues = Array.from(filtersHook.companyFilter).some(value => 
          uniqueCompanies.has(value)
        );
        if (!hasMatchingValues) {
          filtersHook.setCompanyFilter(new Set());
        }
      }
      
      // Фильтр закупщика
      if (filtersHook.purchaserFilter.size > 0) {
        const hasMatchingValues = Array.from(filtersHook.purchaserFilter).some(value => 
          uniquePurchasers.has(value) || value === 'Не назначен' || value === '__NULL__' || value === ''
        );
        if (!hasMatchingValues) {
          filtersHook.setPurchaserFilter(new Set());
        }
      }
      
      // Фильтр категории
      if (filtersHook.categoryFilter.size > 0) {
        const hasMatchingValues = Array.from(filtersHook.categoryFilter).some(value => 
          uniqueCategories.has(value)
        );
        if (!hasMatchingValues) {
          filtersHook.setCategoryFilter(new Set());
        }
      }
      
      // ВАЖНО: Сбрасываем currentPage на 0 при загрузке архивной версии,
      // чтобы элементы с заявками были видны на первой странице
      currentPageResetForVersionRef.current = versionId;
      setCurrentPage(0);
      
      setAllItems(versionItems);
      setData(pageResponse);
      setTotalRecords(versionItems.length);
      setHasMore(false);
      
      // НЕ применяем фильтры здесь - это будет сделано через useEffect после обновления statusFilter
      // useEffect отслеживает изменение statusFilterStr и применит фильтры автоматически
      
      // Проверяем данные после установки в состояние
      setTimeout(() => {
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных версии');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [applyFiltersToVersionData]);

  // Инициализируем editingHook после определения fetchData
  const editingHook = usePurchasePlanItemsEditing(
    data,
    setData,
    setAllItems,
    setChartData,
    setSummaryData,
    filtersHook.cfoFilter,
    pageSize,
    // Дополнительные зависимости для handleCreateItem
    filtersHook.uniqueValues,
    filtersHook.setUniqueValues,
    newItemData,
    setNewItemData,
    modalsHook.setIsCreateModalOpen,
    modalsHook.setErrorModal,
    selectedYear,
    fetchData,
    currentPage,
    sortField,
    sortDirection,
    filtersHook.filters,
    selectedMonths
  );

  // Восстановление фокуса после загрузки данных
  useFocusRestoreAfterFetch({
    focusedField: filtersHook.focusedField,
    loading,
    data,
  });

  // Загружаем данные для столбчатой диаграммы (распределение по месяцам)
  // ВАЖНО: Фильтр по месяцам (selectedMonths) НЕ применяется, чтобы показать все месяцы
  // и пользователь мог видеть распределение даже при выборе конкретного месяца
  // ВАЖНО: Загружаем данные только после загрузки основной таблицы, чтобы не создавать впечатление загрузки всех данных сразу
  useEffect(() => {
    // Не загружаем данные для диаграммы, пока основная таблица еще загружается
    if (loading) {
      return;
    }
    
    // Если просматриваем архивную версию, используем данные из versionDataRef
    const isArchiveVersion = versionsHook.selectedVersionId !== null && 
                             versionsHook.selectedVersionInfo && 
                             !versionsHook.selectedVersionInfo.isCurrent;
    
    if (isArchiveVersion) {
      
      // Используем allItems, который обновляется при загрузке данных версии
      // Это гарантирует, что эффект перезапустится после загрузки данных
      if (allItems.length > 0 && versionDataRef.current.length > 0) {
        // Применяем фильтры к данным версии на клиенте (аналогично applyFiltersToVersionData, но без пагинации)
        let filtered = [...versionDataRef.current];
        const currentFilters = filtersHook;

        // Текстовые фильтры
        if (currentFilters.filters.id && currentFilters.filters.id.trim() !== '') {
          const idValue = currentFilters.filters.id.trim();
          filtered = filtered.filter(item => String(item.id).includes(idValue));
        }

        if (currentFilters.filters.purchaseSubject && currentFilters.filters.purchaseSubject.trim() !== '') {
          const subjectValue = currentFilters.filters.purchaseSubject.trim().toLowerCase();
          filtered = filtered.filter(item => 
            item.purchaseSubject?.toLowerCase().includes(subjectValue)
          );
        }

        if (currentFilters.filters.purchaseRequestId && currentFilters.filters.purchaseRequestId.trim() !== '') {
          const requestIdValue = currentFilters.filters.purchaseRequestId.trim();
          filtered = filtered.filter(item => 
            item.purchaseRequestId && String(item.purchaseRequestId).includes(requestIdValue)
          );
        }

        // Фильтр бюджета
        if (currentFilters.filters.budgetAmount && currentFilters.filters.budgetAmount.trim() !== '') {
          const budgetValue = parseFloat(currentFilters.filters.budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
          if (!isNaN(budgetValue) && budgetValue >= 0) {
            const operator = currentFilters.filters.budgetAmountOperator || 'gte';
            filtered = filtered.filter(item => {
              if (item.budgetAmount === null) return false;
              switch (operator) {
                case 'gte': return item.budgetAmount >= budgetValue;
                case 'lte': return item.budgetAmount <= budgetValue;
                case 'eq': return item.budgetAmount === budgetValue;
                default: return true;
              }
            });
          }
        }

        // Фильтр даты окончания текущего договора
        if (currentFilters.filters.currentContractEndDate && currentFilters.filters.currentContractEndDate.trim() !== '') {
          const dateValue = currentFilters.filters.currentContractEndDate.trim();
          if (dateValue === '-' || dateValue === 'null') {
            filtered = filtered.filter(item => !item.currentContractEndDate);
          } else {
            try {
              const filterDate = new Date(dateValue);
              filtered = filtered.filter(item => {
                if (!item.currentContractEndDate) return false;
                const itemDate = new Date(item.currentContractEndDate);
                return itemDate.toDateString() === filterDate.toDateString();
              });
            } catch (e) {
            }
          }
        }

        // Множественные фильтры
        if (currentFilters.cfoFilter.size > 0) {
          filtered = filtered.filter(item => {
            if (!item.cfo) return currentFilters.cfoFilter.has('Не выбрано');
            return currentFilters.cfoFilter.has(item.cfo);
          });
        }

        if (currentFilters.companyFilter.size > 0) {
          filtered = filtered.filter(item => {
            if (!item.company) return currentFilters.companyFilter.has('Не выбрано');
            return currentFilters.companyFilter.has(item.company);
          });
        }

        if (currentFilters.purchaserCompanyFilter.size > 0) {
          filtered = filtered.filter(item => {
            if (!item.purchaserCompany) return currentFilters.purchaserCompanyFilter.has('Не выбрано');
            return currentFilters.purchaserCompanyFilter.has(item.purchaserCompany);
          });
        }

        if (currentFilters.purchaserFilter.size > 0) {
          filtered = filtered.filter(item => {
            if (!item.purchaser) {
              return currentFilters.purchaserFilter.has('Не назначен') || 
                     currentFilters.purchaserFilter.has('__NULL__') ||
                     currentFilters.purchaserFilter.has('');
            }
            return currentFilters.purchaserFilter.has(item.purchaser);
          });
        }

        if (currentFilters.categoryFilter.size > 0) {
          filtered = filtered.filter(item => {
            if (!item.category) return currentFilters.categoryFilter.has('Не выбрано');
            return currentFilters.categoryFilter.has(item.category);
          });
        }

        // Фильтр статуса: для позиций с заявками используем purchaseRequestStatus, иначе status (как в applyFiltersToVersionData)
        if (currentFilters.statusFilter.size > 0) {
          filtered = filtered.filter(item => {
            const itemStatus = item.purchaseRequestId !== null && item.purchaseRequestStatus
              ? item.purchaseRequestStatus
              : item.status;
            if (!itemStatus) return false;
            return currentFilters.statusFilter.has(itemStatus);
          });
        }

        // ВАЖНО: Фильтр по месяцу НЕ применяется для диаграммы, чтобы показать все месяцы
        
        setChartData(filtered);
      } else {
        setChartData([]);
      }
      return;
    }

    // Для текущей версии загружаем данные с бэкенда
    const fetchChartData = async () => {
      // Создаем ключ кеша до try блока
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '10000');
      
      if (selectedYear !== null) {
        params.append('year', String(selectedYear));
      }
      
      // Фильтр по ЦФО
      if (filtersHook.cfoFilter.size > 0) {
        filtersHook.cfoFilter.forEach(cfo => {
          if (cfo === 'Не выбрано') {
            params.append('cfo', '__NULL__');
          } else {
            params.append('cfo', cfo);
          }
        });
      }
      // Фильтр по компании заказчика
      if (filtersHook.companyFilter.size > 0) {
        filtersHook.companyFilter.forEach(company => {
          if (company === 'Не выбрано') {
            params.append('company', '__NULL__');
          } else {
            params.append('company', company);
          }
        });
      }
      // Фильтр по компании закупщика
      if (filtersHook.purchaserCompanyFilter.size > 0) {
        filtersHook.purchaserCompanyFilter.forEach(purchaserCompany => {
          if (purchaserCompany === 'Не выбрано') {
            params.append('purchaserCompany', '__NULL__');
          } else {
            params.append('purchaserCompany', purchaserCompany);
          }
        });
      }
      // Фильтр по ID
      if (filtersHook.filters.id && filtersHook.filters.id.trim() !== '') {
        params.append('id', filtersHook.filters.id.trim());
      }
      // Фильтр по предмету закупки
      if (filtersHook.filters.purchaseSubject && filtersHook.filters.purchaseSubject.trim() !== '') {
        params.append('purchaseSubject', filtersHook.filters.purchaseSubject.trim());
      }
      // Фильтр по номеру заявки
      if (filtersHook.filters.purchaseRequestId && filtersHook.filters.purchaseRequestId.trim() !== '') {
        params.append('purchaseRequestId', filtersHook.filters.purchaseRequestId.trim());
      }
      // Фильтр по бюджету
      const budgetOperator = filtersHook.filters.budgetAmountOperator;
      const budgetAmount = filtersHook.filters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      // Фильтр по дате окончания договора
      if (filtersHook.filters.currentContractEndDate && filtersHook.filters.currentContractEndDate.trim() !== '') {
        const dateValue = filtersHook.filters.currentContractEndDate.trim();
        if (dateValue === '-') {
          params.append('currentContractEndDate', 'null');
        } else {
          params.append('currentContractEndDate', dateValue);
        }
      }
      // Фильтр по закупщику
      if (filtersHook.purchaserFilter.size > 0) {
        filtersHook.purchaserFilter.forEach(purchaser => {
          if (purchaser === 'Не назначен') {
            params.append('purchaser', '__NULL__');
          } else {
            params.append('purchaser', purchaser);
          }
        });
      }
      // Фильтр по категории
      if (filtersHook.categoryFilter.size > 0) {
        filtersHook.categoryFilter.forEach(category => {
          params.append('category', category);
        });
      }
      // Фильтр по статусу
      if (filtersHook.statusFilter.size > 0) {
        filtersHook.statusFilter.forEach(status => {
          if (status === 'Пусто') {
            params.append('status', '__NULL__');
          } else {
            params.append('status', status);
          }
        });
      }
      // ВАЖНО: Фильтр по месяцу НЕ применяется для диаграммы, чтобы показать все месяцы
      
        const cacheKey = params.toString();
        
        // Проверяем общий кеш (может содержать данные из fetchSummaryData)
        if (purchasePlanItemsCacheRef.current.has(cacheKey)) {
          setChartData(purchasePlanItemsCacheRef.current.get(cacheKey)!);
          return;
        }
        
        // Если запрос уже выполняется с такими же параметрами, не запускаем новый
        if (purchasePlanItemsLoadingRef.current.has(cacheKey)) {
          return;
        }
        
        purchasePlanItemsLoadingRef.current.add(cacheKey);
        
        try {
          const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const result = await response.json();
            const content = result.content || [];
            purchasePlanItemsCacheRef.current.set(cacheKey, content);
            setChartData(content);
          }
        } catch (err) {
          setChartData([]);
        } finally {
          // Удаляем ключ из множества выполняющихся запросов
          purchasePlanItemsLoadingRef.current.delete(cacheKey);
        }
    };
    
    // Очищаем предыдущий таймер debounce
    if (chartDataDebounceTimerRef.current) {
      clearTimeout(chartDataDebounceTimerRef.current);
    }
    
    // Устанавливаем новый таймер debounce (2000мс) - увеличиваем задержку, чтобы не загружать сразу после первой загрузки
    chartDataDebounceTimerRef.current = setTimeout(() => {
      // Дополнительная проверка: не загружаем, если основная таблица еще загружается или это первая загрузка
      if (!loading) {
        fetchChartData();
      }
    }, 2000);
    
    // Очистка таймера при размонтировании
    return () => {
      if (chartDataDebounceTimerRef.current) {
        clearTimeout(chartDataDebounceTimerRef.current);
      }
    };
  }, [loading, selectedYear, filtersHook.filters, filtersHook.cfoFilter, filtersHook.companyFilter, filtersHook.purchaserCompanyFilter, filtersHook.purchaserFilter, filtersHook.categoryFilter, filtersHook.statusFilter, versionsHook.selectedVersionId, versionsHook.selectedVersionInfo, allItems.length]);

  // Загружаем данные для сводной таблицы закупщиков
  // ВАЖНО: Фильтр по закупщику (purchaserFilter) НЕ применяется, т.к. сводная таблица показывает статистику по ВСЕМ закупщикам
  // ВАЖНО: Загружаем данные только после загрузки основной таблицы, чтобы не создавать впечатление загрузки всех данных сразу
  // ВАЖНО: Используем отдельный эндпоинт /purchaser-summary для получения агрегированных данных
  useEffect(() => {
    // Не загружаем данные для сводной таблицы, пока основная таблица еще загружается
    if (loading) {
      return;
    }
    const fetchSummaryData = async () => {
      // Создаем ключ кеша до try блока
      const params = new URLSearchParams();
      
      if (selectedYear !== null) {
        const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
        if (selectedMonthYear === null || hasCurrentYearMonths) {
          params.append('year', String(selectedYear));
        }
      }
      
      // Фильтр по ЦФО
      if (filtersHook.cfoFilter.size > 0) {
        filtersHook.cfoFilter.forEach(cfo => {
          if (cfo === 'Не выбрано') {
            params.append('cfo', '__NULL__');
          } else {
            params.append('cfo', cfo);
          }
        });
      }
      // Фильтр по компании заказчика
      if (filtersHook.companyFilter.size > 0) {
        filtersHook.companyFilter.forEach(company => {
          if (company === 'Не выбрано') {
            params.append('company', '__NULL__');
          } else {
            params.append('company', company);
          }
        });
      }
      // Фильтр по компании закупщика
      if (filtersHook.purchaserCompanyFilter.size > 0) {
        filtersHook.purchaserCompanyFilter.forEach(purchaserCompany => {
          if (purchaserCompany === 'Не выбрано') {
            params.append('purchaserCompany', '__NULL__');
          } else {
            params.append('purchaserCompany', purchaserCompany);
          }
        });
      }
      // Фильтр по ID
      if (filtersHook.filters.id && filtersHook.filters.id.trim() !== '') {
        params.append('id', filtersHook.filters.id.trim());
      }
      // Фильтр по предмету закупки
      if (filtersHook.filters.purchaseSubject && filtersHook.filters.purchaseSubject.trim() !== '') {
        params.append('purchaseSubject', filtersHook.filters.purchaseSubject.trim());
      }
      // Фильтр по номеру заявки
      if (filtersHook.filters.purchaseRequestId && filtersHook.filters.purchaseRequestId.trim() !== '') {
        params.append('purchaseRequestId', filtersHook.filters.purchaseRequestId.trim());
      }
      // Фильтр по бюджету
      const budgetOperator = filtersHook.filters.budgetAmountOperator;
      const budgetAmount = filtersHook.filters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      // Фильтр по дате окончания договора
      if (filtersHook.filters.currentContractEndDate && filtersHook.filters.currentContractEndDate.trim() !== '') {
        const dateValue = filtersHook.filters.currentContractEndDate.trim();
        if (dateValue === '-') {
          params.append('currentContractEndDate', 'null');
        } else {
          params.append('currentContractEndDate', dateValue);
        }
      }
      // НЕ применяем фильтр по закупщику (purchaserFilter) — сводная таблица показывает статистику по всем закупщикам
      // Фильтр по категории
      if (filtersHook.categoryFilter.size > 0) {
        filtersHook.categoryFilter.forEach(category => {
          params.append('category', category);
        });
      }
      // Фильтр по статусу
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
      
      const cacheKey = params.toString();
      
      // Если запрос уже выполняется с такими же параметрами, не запускаем новый
      if (purchasePlanItemsLoadingRef.current.has(cacheKey)) {
        return;
      }
      
      purchasePlanItemsLoadingRef.current.add(cacheKey);
      
      try {
        // Используем новый эндпоинт для получения агрегированных данных
        const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items/purchaser-summary?${params.toString()}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const summaryList = await response.json();
          // Преобразуем список сводной статистики в массив PurchasePlanItem для совместимости
          // (так как purchaserSummary ожидает массив с полями purchaser, count, totalBudget, totalComplexity)
          const transformedData = summaryList.map((item: any) => ({
            purchaser: item.purchaser || 'Не назначен',
            count: item.count || 0,
            totalBudget: item.totalBudget || 0,
            totalComplexity: item.totalComplexity || 0,
          }));
          
          // Сохраняем агрегированные данные в отдельное состояние
          setPurchaserSummaryData(transformedData);
        } else {
          setPurchaserSummaryData([]);
        }
      } catch (err) {
        console.error('Error fetching purchaser summary:', err);
        setPurchaserSummaryData([]);
      } finally {
        purchasePlanItemsLoadingRef.current.delete(cacheKey);
      }
    };
    
    // Очищаем предыдущий таймер debounce
    if (summaryDataDebounceTimerRef.current) {
      clearTimeout(summaryDataDebounceTimerRef.current);
    }
    
    // Устанавливаем новый таймер debounce (500мс)
    summaryDataDebounceTimerRef.current = setTimeout(() => {
      fetchSummaryData();
    }, 500);
    
    // Очистка таймера при размонтировании
    return () => {
      if (summaryDataDebounceTimerRef.current) {
        clearTimeout(summaryDataDebounceTimerRef.current);
      }
    };
  }, [loading, selectedYear, selectedMonthYear, selectedMonths, filtersHook.filters, filtersHook.cfoFilter, filtersHook.companyFilter, filtersHook.purchaserCompanyFilter, filtersHook.categoryFilter, filtersHook.statusFilter, allItems.length]);

  // Функция для расчета распределения по месяцам
  const getMonthlyDistribution = useMemo(() => {
    // Для архивных версий: при наличии chartData (уже отфильтрован в эффекте) используем его;
    // иначе при наличии данных версии — versionDataRef (чтобы декабрь и все месяцы отображались до применения фильтров в эффекте)
    let dataForChart: PurchasePlanItem[];
    const isArchiveVersion = versionsHook.selectedVersionId !== null &&
      versionsHook.selectedVersionInfo &&
      !versionsHook.selectedVersionInfo.isCurrent;
    if (chartData.length > 0) {
      dataForChart = chartData;
    } else if (isArchiveVersion && versionDataRef.current.length > 0) {
      dataForChart = versionDataRef.current;
    } else {
      dataForChart = [];
    }
    
    if (!dataForChart || dataForChart.length === 0) {
      return Array(14).fill(0);
    }

    let displayYear: number;
    if (selectedYear !== null) {
      displayYear = selectedYear;
    } else {
      const yearFromData = dataForChart.find(item => item.year !== null)?.year;
      if (yearFromData) {
        displayYear = yearFromData;
      } else {
        const itemWithDate = dataForChart.find(item => item.requestDate);
        if (itemWithDate && itemWithDate.requestDate) {
          displayYear = new Date(itemWithDate.requestDate).getFullYear();
        } else {
          displayYear = new Date().getFullYear();
        }
      }
    }
    const prevYear = displayYear - 1;


    const monthCounts = Array(14).fill(0);
    
    dataForChart.forEach((item) => {
      // Для позиций с заявками используем purchaseRequestStatus, иначе status
      const effectiveStatus = item.purchaseRequestId !== null && item.purchaseRequestStatus
        ? item.purchaseRequestStatus
        : item.status;
      if (effectiveStatus === 'Исключена') {
        return;
      }

      if (!item.requestDate) {
        monthCounts[13]++;
        return;
      }

      const requestDate = new Date(item.requestDate);
      const itemYear = requestDate.getFullYear();
      const itemMonth = requestDate.getMonth();

      // Декабрь предыдущего года (например, декабрь 2025 для года 2026)
      if (itemYear === prevYear && itemMonth === 11) {
        monthCounts[0]++;
      } else if (itemYear === displayYear) {
        // Месяцы текущего года (январь = 1, ..., декабрь = 12)
        monthCounts[itemMonth + 1]++;
      }
    });

    return monthCounts;
  }, [chartData, selectedYear, versionsHook.selectedVersionId, versionsHook.selectedVersionInfo]);

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
    // Используем кеш, если годы уже загружены
    if (yearsCacheRef.current) {
      setAllYears(yearsCacheRef.current);
      if (yearsCacheRef.current.length > 0 && !selectedYear) {
        setSelectedYear(yearsCacheRef.current[0]);
      }
      return;
    }
    
    // Если запрос уже выполняется или уже был выполнен, не запускаем новый
    if (yearsLoadingRef.current || yearsFetchedRef.current) {
      return;
    }
    
    const fetchYears = async () => {
      yearsLoadingRef.current = true;
      yearsFetchedRef.current = true;
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/years`);
        if (response.ok) {
          const years = await response.json();
          yearsCacheRef.current = years;
          setAllYears(years);
          if (years.length > 0 && !selectedYear) {
            setSelectedYear(years[0]);
          }
        }
      } catch (err) {
        // Ошибка загрузки годов игнорируется
      } finally {
        yearsLoadingRef.current = false;
      }
    };
    fetchYears();
  }, []);

  // Загружаем общее количество записей
  // ВАЖНО: Используем данные из основного запроса, если они уже загружены
  useEffect(() => {
    // Если данные уже загружены, используем totalElements из них
    if (data && data.totalElements !== undefined) {
      setTotalRecords(data.totalElements);
      totalRecordsCacheRef.current = data.totalElements;
      return;
    }
    
    // Используем кеш, если totalRecords уже загружены
    if (totalRecordsCacheRef.current !== null) {
      setTotalRecords(totalRecordsCacheRef.current);
      return;
    }
    
    // Если запрос уже выполняется, не запускаем новый
    if (totalRecordsLoadingRef.current) {
      return;
    }
    
    const fetchTotalRecords = async () => {
      totalRecordsLoadingRef.current = true;
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items?page=0&size=1`);
        if (response.ok) {
          const result = await response.json();
          const total = result.totalElements || 0;
          totalRecordsCacheRef.current = total;
          setTotalRecords(total);
        }
      } catch (err) {
        // Ошибка загрузки общего количества записей игнорируется
      } finally {
        totalRecordsLoadingRef.current = false;
      }
    };
    fetchTotalRecords();
  }, [data]);

  // Infinite scroll - используем тот же хук, что и в заявках на закупку
  // Ref для предотвращения повторных вызовов onLoadMore
  const isLoadingMoreRef = useRef(false);
  
  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: useCallback(() => {
      // Предотвращаем повторные вызовы, если уже идет загрузка
      if (isLoadingMoreRef.current || !hasMore || loadingMore || allItems.length === 0) {
        return;
      }
      
      isLoadingMoreRef.current = true;
      const nextPage = currentPage + 1;
      
      fetchData(
        nextPage,
        pageSize,
        selectedYear,
        sortField,
        sortDirection,
        filtersHook.filters,
        selectedMonths,
        true, // append = true для добавления данных
        filtersHook.purchaserFilter,
        filtersHook.cfoFilter,
        filtersHook.companyFilter,
        filtersHook.purchaserCompanyFilter,
        filtersHook.categoryFilter,
        filtersHook.statusFilter
      ).finally(() => {
        // Сбрасываем флаг после завершения загрузки
        isLoadingMoreRef.current = false;
      });
      // ВАЖНО: Не вызываем setCurrentPage здесь - он обновляется внутри fetchData, как в заявках
    }, [hasMore, loadingMore, allItems.length, currentPage, selectedYear, sortField, sortDirection, filtersHook.filters, selectedMonths, fetchData, pageSize, filtersHook.purchaserFilter, filtersHook.cfoFilter, filtersHook.companyFilter, filtersHook.purchaserCompanyFilter, filtersHook.categoryFilter, filtersHook.statusFilter]),
    threshold: 0.1,
  });

  // Стабилизируем строковые представления фильтров через useMemo, чтобы избежать лишних обновлений
  const cfoFilterStr = useMemo(() => Array.from(filtersHook.cfoFilter).sort().join(','), [filtersHook.cfoFilter]);
  const companyFilterStr = useMemo(() => Array.from(filtersHook.companyFilter).sort().join(','), [filtersHook.companyFilter]);
  const purchaserCompanyFilterStr = useMemo(() => Array.from(filtersHook.purchaserCompanyFilter).sort().join(','), [filtersHook.purchaserCompanyFilter]);
  const purchaserFilterStr = useMemo(() => Array.from(filtersHook.purchaserFilter).sort().join(','), [filtersHook.purchaserFilter]);
  const categoryFilterStr = useMemo(() => Array.from(filtersHook.categoryFilter).sort().join(','), [filtersHook.categoryFilter]);
  const statusFilterStr = useMemo(() => Array.from(filtersHook.statusFilter).sort().join(','), [filtersHook.statusFilter]);
  const selectedMonthsStr = useMemo(() => Array.from(selectedMonths).sort().join(','), [selectedMonths]);

  // Эффект для применения фильтров при изменении страницы, сортировки, месяцев для архивных версий
  useEffect(() => {
    if (versionsHook.selectedVersionId !== null && versionsHook.selectedVersionInfo && !versionsHook.selectedVersionInfo.isCurrent) {
      if (versionDataRef.current.length > 0) {
        // КРИТИЧЕСКИ ВАЖНО: Обновляем filtersRef.current перед применением фильтров
        // Это гарантирует, что applyFiltersToVersionData использует актуальные значения фильтров
        filtersRef.current = filtersHook;
        
        // Если фильтр статуса был только что установлен при загрузке версии, применяем фильтры
        if (shouldApplyFiltersAfterStatusUpdateRef.current) {
          shouldApplyFiltersAfterStatusUpdateRef.current = false;
          // Сбрасываем lastAppliedFiltersRef, чтобы гарантировать применение фильтров
          lastAppliedFiltersRef.current = '';
          applyFiltersToVersionData();
        } else {
          applyFiltersToVersionData();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sortField, sortDirection, selectedMonths, selectedMonthYear, versionsHook.selectedVersionId, cfoFilterStr, companyFilterStr, purchaserCompanyFilterStr, purchaserFilterStr, categoryFilterStr, statusFilterStr, filtersHook.filters.id, filtersHook.filters.purchaseSubject, filtersHook.filters.currentContractEndDate, filtersHook.filters.purchaseRequestId, filtersHook.filters.budgetAmount, filtersHook.filters.budgetAmountOperator]);

  // Загружаем данные при изменении фильтров, сортировки, года
  // Используем размер Set и строковое представление для правильного отслеживания изменений Set
  useEffect(() => {
    // Если просматриваем архивную версию, применяем фильтры к данным версии на клиенте
    if (versionsHook.selectedVersionId !== null && versionsHook.selectedVersionInfo && !versionsHook.selectedVersionInfo.isCurrent) {
      if (versionDataRef.current.length > 0) {
        // КРИТИЧЕСКИ ВАЖНО: Обновляем filtersRef.current перед применением фильтров
        filtersRef.current = filtersHook;
        applyFiltersToVersionData();
      }
      return;
    }

    // При изменении фильтров сбрасываем на первую страницу
    setCurrentPage(0);
    setHasMore(true);
    initialTotalElementsRef.current = null; // Сбрасываем при изменении фильтров

    // Передаём актуальные значения фильтров напрямую, чтобы избежать проблем с замыканием
    fetchData(
      0,
      pageSize,
      selectedYear,
      sortField,
      sortDirection,
      filtersHook.filters,
      selectedMonths,
      false,
      filtersHook.purchaserFilter,
      filtersHook.cfoFilter,
      filtersHook.companyFilter,
      filtersHook.purchaserCompanyFilter,
      filtersHook.categoryFilter,
      filtersHook.statusFilter
    );
  }, [
    selectedYear, 
    selectedMonthYear, 
    sortField, 
    sortDirection, 
    filtersHook.filters.id,
    filtersHook.filters.purchaseSubject,
    filtersHook.filters.currentContractEndDate,
    filtersHook.filters.purchaseRequestId,
    filtersHook.filters.budgetAmount,
    filtersHook.filters.budgetAmountOperator,
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
    selectedMonthsStr,
    pageSize,
    fetchData,
    filtersHook.purchaserFilter,
    filtersHook.cfoFilter,
    filtersHook.companyFilter,
    filtersHook.purchaserCompanyFilter,
    filtersHook.categoryFilter,
    filtersHook.statusFilter,
    versionsHook.selectedVersionId
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
    purchaserSummaryData,
    newItemData,
    setNewItemData,
    printRef,
    getMonthlyDistribution,
    handleSort,
    fetchData,
    loadVersionData,
    applyFiltersToVersionData,
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
