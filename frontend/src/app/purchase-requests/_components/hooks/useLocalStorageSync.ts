import { useEffect, useRef, useCallback, useState } from 'react';
import type { SortField, SortDirection, TabType } from '../types/purchase-request.types';

const VALID_TAB_TYPES: TabType[] = ['all', 'in-work', 'completed', 'project-rejected', 'hidden'];

function isValidTabType(value: unknown): value is TabType {
  return typeof value === 'string' && VALID_TAB_TYPES.includes(value as TabType);
}

/**
 * Интерфейс для состояния фильтров
 */
interface FiltersState {
  filtersFromHook: Record<string, string>;
  localFilters: Record<string, string>;
  cfoFilter: Set<string>;
  statusFilter: Set<string>;
  selectedYear: number | null;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  currentPage: number;
  cfoSearchQuery: string;
  statusSearchQuery: string;
  activeTab: TabType;
}

/**
 * Интерфейс для параметров хука
 */
interface UseLocalStorageSyncParams {
  // Состояния
  filtersFromHook: Record<string, string>;
  localFilters: Record<string, string>;
  cfoFilter: Set<string>;
  statusFilter: Set<string>;
  selectedYear: number | null;
  sortField: SortField | null;
  sortDirection: SortDirection | null;
  currentPage: number;
  cfoSearchQuery: string;
  statusSearchQuery: string;
  activeTab: TabType;
  
  // Сеттеры
  setFilters: (filters: Record<string, string>) => void;
  setLocalFilters: (filters: Record<string, string>) => void;
  setCfoFilter: (filter: Set<string>) => void;
  setStatusFilter: (filter: Set<string>) => void;
  setSelectedYear: (year: number | null) => void;
  setSortField: (field: SortField | null) => void;
  setSortDirection: (direction: SortDirection | null) => void;
  setCurrentPage: (page: number) => void;
  setCfoSearchQuery: (query: string) => void;
  setStatusSearchQuery: (query: string) => void;
  setActiveTab: (tab: TabType) => void;
  
  // Refs
  filtersStateRef: React.MutableRefObject<FiltersState>;
}

/**
 * Хук для синхронизации фильтров с localStorage
 * Включает восстановление при монтировании, сохранение при изменении и обработку navigationData
 */
export function useLocalStorageSync(params: UseLocalStorageSyncParams) {
  const {
    filtersFromHook,
    localFilters,
    cfoFilter,
    statusFilter,
    selectedYear,
    sortField,
    sortDirection,
    currentPage,
    cfoSearchQuery,
    statusSearchQuery,
    activeTab,
    setFilters,
    setLocalFilters,
    setCfoFilter,
    setStatusFilter,
    setSelectedYear,
    setSortField,
    setSortDirection,
    setCurrentPage,
    setCfoSearchQuery,
    setStatusSearchQuery,
    setActiveTab,
    filtersStateRef,
  } = params;

  const filtersLoadedRef = useRef(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [yearRestored, setYearRestored] = useState(false);

  // Функция для сохранения всех фильтров в localStorage
  const saveFiltersToLocalStorage = useCallback(() => {
    // Не сохраняем, если фильтры еще не загружены из localStorage (чтобы не перезаписать при первой загрузке)
    if (!filtersLoadedRef.current) {
      console.log('Skipping save - filters not loaded yet');
      return;
    }

    try {
      // Для select-типа фильтров (requiresPurchase, isPlanned) используем filters, для текстовых - localFilters
      const mergedFilters = { ...filtersFromHook };
      // Объединяем с localFilters для текстовых полей, но приоритет у filters для select-полей
      Object.keys(localFilters).forEach(key => {
        // Если в filters есть значение для select-поля, используем его, иначе localFilters
        if (mergedFilters[key] === undefined || mergedFilters[key] === '') {
          mergedFilters[key] = localFilters[key];
        }
      });

      const filtersToSave = {
        filtersFromHook: mergedFilters, // Сохраняем объединенные фильтры
        localFilters: localFilters, // Сохраняем также localFilters для текстовых полей с debounce
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        // selectedYear НЕ сохраняем - при переходе на страницу всегда "Все"
        sortField,
        sortDirection,
        currentPage,
        // pageSize теперь константа, не сохраняем
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
        currentPage
      });
    } catch (err) {
      console.error('Error saving filters to localStorage:', err);
    }
  }, [filtersFromHook, localFilters, cfoFilter, statusFilter, selectedYear, sortField, sortDirection, currentPage, cfoSearchQuery, statusSearchQuery, activeTab]);

  // Восстановление фильтров при монтировании
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
        } else if (savedFilters.filtersFromHook) {
          // Если есть filtersFromHook, используем их
          const mergedFilters = { ...defaultFilters, ...savedFilters.filtersFromHook };
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
        // pageSize теперь константа, не восстанавливаем из localStorage

        // Восстанавливаем поисковые запросы в фильтрах
        if (savedFilters.cfoSearchQuery !== undefined) {
          setCfoSearchQuery(savedFilters.cfoSearchQuery);
        }
        if (savedFilters.statusSearchQuery !== undefined) {
          setStatusSearchQuery(savedFilters.statusSearchQuery);
        }

        // Восстанавливаем активную вкладку (только валидное значение, иначе "В работе")
        if (isValidTabType(savedFilters.activeTab)) {
          setActiveTab(savedFilters.activeTab);
        } else {
          setActiveTab('in-work'); // По умолчанию "В работе"
        }

        console.log('Filters loaded from localStorage:', {
          filters: savedFilters.filters || savedFilters.localFilters || savedFilters.filtersFromHook,
          requiresPurchase: savedFilters.filters?.requiresPurchase || savedFilters.localFilters?.requiresPurchase || savedFilters.filtersFromHook?.requiresPurchase,
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

      // Помечаем, что загрузка завершена (ref для хуков, state для перезапуска useTabCounts)
      filtersLoadedRef.current = true;
      setFiltersLoaded(true);
    } catch (err) {
      console.error('Error loading filters from localStorage:', err);
      // При ошибке загрузки устанавливаем значения по умолчанию для statusFilter
      if (statusFilter.size === 0) {
        // По умолчанию фильтр пустой (как для ЦФО)
        setStatusFilter(new Set());
      }
      filtersLoadedRef.current = true;
      setFiltersLoaded(true);
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

  // Обновляем ref с актуальными значениями фильтров при каждом изменении
  useEffect(() => {
    // Объединяем filters и localFilters для сохранения актуальных значений
    const mergedFilters = { ...filtersFromHook };
    Object.keys(localFilters).forEach(key => {
      // Если в filters есть значение для select-поля, используем его, иначе localFilters
      if (mergedFilters[key] === undefined || mergedFilters[key] === '') {
        mergedFilters[key] = localFilters[key];
      }
    });

    filtersStateRef.current = {
      filtersFromHook: mergedFilters,
      localFilters,
      cfoFilter,
      statusFilter,
      selectedYear,
      sortField,
      sortDirection,
      currentPage,
      cfoSearchQuery,
      statusSearchQuery,
      activeTab,
    };
  }, [filtersFromHook, localFilters, cfoFilter, statusFilter, selectedYear, sortField, sortDirection, currentPage, cfoSearchQuery, statusSearchQuery, activeTab]);

  // Сохраняем фильтры в localStorage при их изменении (только после загрузки)
  // selectedYear не сохраняется - при переходе на страницу всегда "Все"
  useEffect(() => {
    saveFiltersToLocalStorage();
  }, [filtersFromHook, cfoFilter, statusFilter, sortField, sortDirection, currentPage, cfoSearchQuery, statusSearchQuery, activeTab, saveFiltersToLocalStorage]);

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
          filters: state.filtersFromHook,
          localFilters: state.localFilters,
          cfoFilter: Array.from(state.cfoFilter),
          statusFilter: Array.from(state.statusFilter),
          selectedYear: state.selectedYear,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          currentPage: state.currentPage,
          cfoSearchQuery: state.cfoSearchQuery,
          statusSearchQuery: state.statusSearchQuery,
          activeTab: state.activeTab ?? 'in-work',
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
          filters: state.filtersFromHook,
          localFilters: state.localFilters,
          cfoFilter: Array.from(state.cfoFilter),
          statusFilter: Array.from(state.statusFilter),
          selectedYear: state.selectedYear,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          currentPage: state.currentPage,
          cfoSearchQuery: state.cfoSearchQuery,
          statusSearchQuery: state.statusSearchQuery,
          activeTab: state.activeTab ?? 'in-work',
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
  }, []);

  return {
    filtersLoadedRef,
    filtersLoaded,
    yearRestored,
    setYearRestored,
  };
}
