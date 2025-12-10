'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function PurchaseRequestsYearlyChart() {
  const [data, setData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [cfoData, setCfoData] = useState<CfoTableRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [cfoLoading, setCfoLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [yearsLoaded, setYearsLoaded] = useState(false);
  const [selectedBarData, setSelectedBarData] = useState<{year: string, dataset: string, value: number} | null>(null);
  const [selectedLineData, setSelectedLineData] = useState<{month: string, dataset: string, value: number} | null>(null);
  
  // Состояния для таблицы
  const [tableData, setTableData] = useState<{purchaseRequests: any, purchases: any} | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({
    cfo: '',
    name: '',
  });
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    cfo: '',
    name: '',
  });
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Тип данных для таблицы ЦФО
  interface CfoTableRow {
    cfo: string;
    ordersCount: number;
    ordersAmount: number;
    purchaseProceduresCount: number;
    purchaseProceduresAmount: number;
  }
  
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

  // Функция для загрузки данных таблицы с пагинацией
  const fetchTableData = async (
    year: number, 
    month: string | null, 
    datasetLabel: string,
    page: number = 0,
    size: number = 25,
    sortBy: string | null = null,
    sortDir: 'asc' | 'desc' | null = null,
    filters: Record<string, string> = {}
  ) => {
    setTableLoading(true);
    try {
      const backendUrl = getBackendUrl();
      let purchaseRequestsData: any = null;
      let purchasesData: any = null;

      // Определяем, какие данные нужно загрузить
      // Для столбчатой диаграммы: "Закупка", "Заказ", "Не согласована / Проект"
      // Для линейной диаграммы: "Заявки на закупку", "Заказы", "Закупочная процедура", "Не согласована / Проект"
      const shouldLoadPurchaseRequests = datasetLabel === 'Заявки на закупку' || 
                                        datasetLabel === 'Заказы' || 
                                        datasetLabel === 'Закупка' ||
                                        datasetLabel === 'Заказ' ||
                                        datasetLabel === 'Не согласована / Проект';
      const shouldLoadPurchases = datasetLabel === 'Закупочная процедура' || 
                                  datasetLabel === 'Не согласована / Проект';

      if (shouldLoadPurchaseRequests) {
        // Загружаем заявки на закупку
        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('size', String(size));
        params.append('year', String(year));
        
        // Фильтрация по месяцу на бэкенде
        if (month) {
          const monthIndex = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'].indexOf(month);
          if (monthIndex !== -1) {
            const monthNumber = monthIndex + 1; // 1-12
            params.append('month', String(monthNumber));
          }
        }
        
        if (sortBy && sortDir) {
          params.append('sortBy', sortBy);
          params.append('sortDir', sortDir);
        }
        
        // Фильтр по ЦФО - только множественный фильтр (чекбоксы), как в таблице заявок на закупку
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => {
            params.append('cfo', cfo);
          });
        }
        
        if (filters.name && filters.name.trim() !== '') {
          params.append('name', filters.name.trim());
        }
        
        // Применяем фильтры в зависимости от datasetLabel
        // Для столбчатой диаграммы: "Закупка", "Заказ", "Не согласована / Проект"
        // Для линейной диаграммы: "Заявки на закупку", "Заказы", "Закупочная процедура", "Не согласована / Проект"
        
        // ВАЖНО: Фильтры должны применяться всегда, когда есть datasetLabel
        // Если datasetLabel пустой или не распознан, не загружаем данные (это предотвратит показ всех данных)
        if (!datasetLabel || datasetLabel.trim() === '') {
          console.warn('Empty datasetLabel, skipping data fetch');
          setTableData({ purchaseRequests: null, purchases: null });
          setTableLoading(false);
          return;
        }
        
        if (datasetLabel === 'Не согласована / Проект') {
          // Для "Не согласована / Проект" фильтруем по статусам (не применяем requiresPurchase)
          // ВАЖНО: Добавляем все три статуса как отдельные параметры для множественного фильтра
          params.append('status', 'Не согласована');
          params.append('status', 'Не утверждена');
          params.append('status', 'Проект');
          // Явно не добавляем requiresPurchase, чтобы показать все заявки с этими статусами
        } else if (datasetLabel === 'Заказы' || datasetLabel === 'Заказ') {
          // Для "Заказы" фильтруем только заявки, где не требуется закупка
          // ВАЖНО: Исключаем заявки со статусами "Не согласована", "Не утверждена", "Проект"
          // так как они учитываются отдельно в "Не согласована / Проект"
          params.append('requiresPurchase', 'false');
          // НЕ добавляем фильтр по статусам, но на бэкенде нужно исключить эти статусы
          // Для этого нужно добавить отрицательный фильтр по статусам, но Spring Data JPA Specification
          // не поддерживает отрицательные фильтры напрямую, поэтому нужно использовать другой подход
          // Пока оставляем как есть, но нужно будет добавить логику на бэкенде
        } else if (datasetLabel === 'Закупка') {
          // Для "Закупка" из столбчатой диаграммы фильтруем только заявки, где требуется закупка
          // ВАЖНО: Исключаем заявки со статусами "Не согласована", "Не утверждена", "Проект"
          // так как они учитываются отдельно в "Не согласована / Проект"
          params.append('requiresPurchase', 'true');
          // НЕ добавляем фильтр по статусам, но на бэкенде нужно исключить эти статусы
        } else if (datasetLabel === 'Заявки на закупку') {
          // Для "Заявки на закупку" из линейной диаграммы - не применяем фильтр requiresPurchase (показываем все)
          // НО исключаем заявки со статусами "Не согласована", "Не утверждена", "Проект"
          // так как они учитываются отдельно в "Не согласована / Проект"
          // На диаграмме "Заявки на закупку" = сумма (requiresPurchase=true БЕЗ этих статусов) + (requiresPurchase=false БЕЗ этих статусов)
          // Поэтому в таблице тоже нужно исключить эти статусы
          params.append('excludePendingStatuses', 'true');
        } else {
          // Если datasetLabel не распознан, не загружаем данные (это предотвратит показ всех данных)
          console.warn('Unknown datasetLabel:', datasetLabel, '- skipping data fetch');
          setTableData({ purchaseRequests: null, purchases: null });
          setTableLoading(false);
          return;
        }
        
        const url = `${backendUrl}/api/purchase-requests?${params.toString()}`;
        const response = await fetch(url);
        if (response.ok) {
          purchaseRequestsData = await response.json();
        }
      }

      if (shouldLoadPurchases) {
        // Загружаем закупки
        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('size', String(size));
        params.append('year', String(year));
        
        // Фильтрация по месяцу на бэкенде
        if (month) {
          const monthIndex = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'].indexOf(month);
          if (monthIndex !== -1) {
            const monthNumber = monthIndex + 1; // 1-12
            params.append('month', String(monthNumber));
          }
        }
        
        if (sortBy && sortDir) {
          params.append('sortBy', sortBy);
          params.append('sortDir', sortDir);
        }
        
        // Фильтр по ЦФО - только множественный фильтр (чекбоксы)
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => {
            params.append('cfo', cfo);
          });
        }
        
        if (filters.name && filters.name.trim() !== '') {
          params.append('name', filters.name.trim());
        }
        
        // Для "Не согласована / Проект" фильтруем по статусам для закупок
        // Для Purchase поддерживается только статус "Проект"
        if (datasetLabel === 'Не согласована / Проект') {
          // Для закупок фильтруем только по статусу "Проект", так как другие статусы не применимы для Purchase
          params.append('status', 'Проект');
        }
        
        const url = `${backendUrl}/api/purchases?${params.toString()}`;
        const response = await fetch(url);
        if (response.ok) {
          purchasesData = await response.json();
        }
      }

      setTableData({ purchaseRequests: purchaseRequestsData, purchases: purchasesData });
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setTableLoading(false);
    }
  };

  // Debounce для текстовых фильтров
  useEffect(() => {
    const hasTextChanges = localFilters.name !== filters.name;
    if (hasTextChanges) {
      const timer = setTimeout(() => {
        setFilters(prev => ({
          ...prev,
          name: localFilters.name,
        }));
        setCurrentPage(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [localFilters]);

  // Состояние для уникальных значений ЦФО
  const [uniqueCfoValues, setUniqueCfoValues] = useState<string[]>([]);

  // Загружаем уникальные значения ЦФО
  useEffect(() => {
    if (selectedBarData || selectedLineData) {
      const fetchUniqueCfo = async () => {
        try {
          const backendUrl = getBackendUrl();
          const year = selectedBarData ? parseInt(selectedBarData.year) : (selectedYear || new Date().getFullYear());
          const response = await fetch(`${backendUrl}/api/purchase-requests?year=${year}&page=0&size=10000`);
          if (response.ok) {
            const result = await response.json();
            const cfoSet = new Set<string>();
            result.content.forEach((pr: any) => {
              if (pr.cfo) cfoSet.add(pr.cfo);
            });
            setUniqueCfoValues(Array.from(cfoSet).sort());
          }
        } catch (error) {
          console.error('Error fetching unique CFO values:', error);
        }
      };
      fetchUniqueCfo();
    }
  }, [selectedBarData, selectedLineData, selectedYear]);

  // Загружаем данные при изменении параметров
  useEffect(() => {
    if (selectedBarData || selectedLineData) {
      const year = selectedBarData ? parseInt(selectedBarData.year) : (selectedYear || new Date().getFullYear());
      const month = selectedLineData ? selectedLineData.month : null;
      const datasetLabel = selectedBarData ? selectedBarData.dataset : (selectedLineData ? selectedLineData.dataset : '');
      // Убеждаемся, что datasetLabel не пустой перед вызовом fetchTableData
      if (datasetLabel) {
        fetchTableData(year, month, datasetLabel, currentPage, pageSize, sortField, sortDirection, filters);
      }
    }
  }, [currentPage, pageSize, sortField, sortDirection, filters, cfoFilter, selectedBarData, selectedLineData, selectedYear]);

  // Обработка сортировки
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
  };

  // Обработчики для фильтров
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
    const newSet = new Set(uniqueCfoValues);
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
  const getFilteredCfoOptions = uniqueCfoValues.filter(cfo =>
    cfo.toLowerCase().includes(cfoSearchQuery.toLowerCase())
  );

  // Загружаем список доступных годов при первой загрузке
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/purchase-requests/years`;
        const response = await fetch(url);
        if (response.ok) {
          const years = await response.json();
          setAllYears(years);
          // Устанавливаем текущий год по умолчанию, если есть данные
          if (years.length > 0) {
            const currentYear = new Date().getFullYear();
            const yearToSet = years.includes(currentYear) ? currentYear : years[years.length - 1];
            setSelectedYear(yearToSet);
          }
          setYearsLoaded(true);
        } else {
          setYearsLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching available years:', err);
        setYearsLoaded(true);
      }
    };
    
    fetchAvailableYears();
  }, []);

  // Загружаем данные по годам
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/purchase-requests/yearly-stats`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        const years = (result.years || []).map((year: number) => year.toString());
        const purchases = result.purchases || [];
        const orders = result.orders || [];
        const pendingStatus = result.pendingStatus || [];
        
        const chartData = {
          labels: years,
          datasets: [
            {
              label: 'Не согласована / Проект',
              data: pendingStatus,
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              borderColor: 'rgba(239, 68, 68, 1)',
              borderWidth: 1,
            },
            {
              label: 'Закупка',
              data: purchases,
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgba(34, 197, 94, 1)',
              borderWidth: 1,
            },
            {
              label: 'Заказ',
              data: orders,
              backgroundColor: 'rgba(37, 99, 235, 0.8)',
              borderColor: 'rgba(37, 99, 235, 1)',
              borderWidth: 1,
            },
          ],
        };
        
        setData(chartData);
      } catch (err) {
        console.error('Error fetching yearly stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Загружаем месячные данные для выбранного года
  useEffect(() => {
    if (!yearsLoaded || selectedYear === null) {
      return;
    }

    const fetchMonthlyData = async () => {
      try {
        setMonthlyLoading(true);
        const backendUrl = getBackendUrl();
        
        // Загружаем данные для заявок на закупку где требуется закупка (requiresPurchase = true)
        const purchaseRequestsWithPurchaseUrl = `${backendUrl}/api/purchase-requests/monthly-stats?year=${selectedYear}&requiresPurchase=true&useCalendarYear=true`;
        const purchaseRequestsWithPurchaseResponse = await fetch(purchaseRequestsWithPurchaseUrl);
        const purchaseRequestsWithPurchaseResult = await purchaseRequestsWithPurchaseResponse.json();
        const purchaseRequestsWithPurchaseMonthCounts = purchaseRequestsWithPurchaseResult.monthCounts || {};
        const purchaseRequestsWithPurchasePendingStatusMonthCounts = purchaseRequestsWithPurchaseResult.pendingStatusMonthCounts || {};
        
        // Загружаем данные для заказов (requiresPurchase = false) - это заявки на закупку где не требуется закупка
        const ordersUrl = `${backendUrl}/api/purchase-requests/monthly-stats?year=${selectedYear}&requiresPurchase=false&useCalendarYear=true`;
        const ordersResponse = await fetch(ordersUrl);
        const ordersResult = await ordersResponse.json();
        const ordersMonthCounts = ordersResult.monthCounts || {};
        const ordersPendingStatusMonthCounts = ordersResult.pendingStatusMonthCounts || {};
        
        // Загружаем данные для закупочных процедур (Purchase)
        const purchasesUrl = `${backendUrl}/api/purchases/monthly-stats?year=${selectedYear}&useCalendarYear=true`;
        const purchasesResponse = await fetch(purchasesUrl);
        const purchasesResult = await purchasesResponse.json();
        const purchasesMonthCounts = purchasesResult.monthCounts || {};
        const purchasesPendingStatusMonthCounts = purchasesResult.pendingStatusMonthCounts || {};
        
        // Формируем данные для линейной диаграммы
        const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        // Заявки на закупку = все заявки (и где требуется закупка, и где не требуется) = суммируем оба типа
        const allPurchaseRequestsData = monthLabels.map(month => 
          (purchaseRequestsWithPurchaseMonthCounts[month] || 0) + 
          (ordersMonthCounts[month] || 0)
        );
        // Заказы = заявки на закупку где не требуется закупка (requiresPurchase = false)
        const ordersData = monthLabels.map(month => ordersMonthCounts[month] || 0);
        // Закупочная процедура = сущность Purchase
        const purchasesData = monthLabels.map(month => purchasesMonthCounts[month] || 0);
        
        // Объединяем статусы "не согласовано, не утверждено, проект" для заявок на закупку и закупочных процедур
        const pendingStatusData = monthLabels.map(month => 
          (purchaseRequestsWithPurchasePendingStatusMonthCounts[month] || 0) + 
          (ordersPendingStatusMonthCounts[month] || 0) +
          (purchasesPendingStatusMonthCounts[month] || 0)
        );
        
        const monthlyChartData = {
          labels: monthLabels,
          datasets: [
            {
              label: 'Заявки на закупку',
              data: allPurchaseRequestsData,
              borderColor: 'rgba(75, 85, 99, 1)',
              backgroundColor: 'rgba(75, 85, 99, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: 'rgba(75, 85, 99, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
            },
            {
              label: 'Заказы',
              data: ordersData,
              borderColor: 'rgba(37, 99, 235, 1)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgba(37, 99, 235, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
            {
              label: 'Закупочная процедура',
              data: purchasesData,
              borderColor: 'rgba(34, 197, 94, 1)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgba(34, 197, 94, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
            {
              label: 'Не согласована / Проект',
              data: pendingStatusData,
              borderColor: 'rgba(156, 163, 175, 0.5)',
              backgroundColor: 'rgba(156, 163, 175, 0.05)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: 'rgba(156, 163, 175, 0.5)',
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
              hidden: true, // Скрыта по умолчанию
            },
          ],
        };
        
        setMonthlyData(monthlyChartData);
      } catch (err) {
        console.error('Error fetching monthly stats:', err);
      } finally {
        setMonthlyLoading(false);
      }
    };
    
    fetchMonthlyData();
  }, [selectedYear, yearsLoaded]);

  // Загружаем данные по ЦФО для выбранного года
  useEffect(() => {
    if (!yearsLoaded || selectedYear === null) {
      return;
    }

    const fetchCfoData = async () => {
      try {
        setCfoLoading(true);
        const backendUrl = getBackendUrl();
        
        // Загружаем данные по ЦФО
        const cfoStatsUrl = `${backendUrl}/api/purchase-requests/cfo-stats?year=${selectedYear}`;
        const cfoStatsResponse = await fetch(cfoStatsUrl);
        const cfoStatsResult = await cfoStatsResponse.json();
        
        const cfoLabels = cfoStatsResult.cfoLabels || [];
        const ordersCount = cfoStatsResult.ordersCount || [];
        const ordersAmount = cfoStatsResult.ordersAmount || [];
        const purchaseProceduresCount = cfoStatsResult.purchaseProceduresCount || [];
        const purchaseProceduresAmount = cfoStatsResult.purchaseProceduresAmount || [];
        
        // Формируем данные для таблицы
        const cfoTableData = cfoLabels.map((cfo: string, index: number) => ({
          cfo,
          ordersCount: ordersCount[index] || 0,
          ordersAmount: typeof ordersAmount[index] === 'number' ? ordersAmount[index] : (typeof ordersAmount[index] === 'string' ? parseFloat(ordersAmount[index]) : 0),
          purchaseProceduresCount: purchaseProceduresCount[index] || 0,
          purchaseProceduresAmount: typeof purchaseProceduresAmount[index] === 'number' ? purchaseProceduresAmount[index] : (typeof purchaseProceduresAmount[index] === 'string' ? parseFloat(purchaseProceduresAmount[index]) : 0),
        }));
        
        setCfoData(cfoTableData);
      } catch (err) {
        console.error('Error fetching CFO stats:', err);
      } finally {
        setCfoLoading(false);
      }
    };
    
    fetchCfoData();
  }, [selectedYear, yearsLoaded]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 0,
      },
    },
    onClick: async (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        const year = data.labels[index];
        const dataset = data.datasets[datasetIndex];
        const value = dataset.data[index];
        setSelectedBarData({
          year: year,
          dataset: dataset.label,
          value: value
        });
        setSelectedLineData(null); // Сбрасываем выбор линейной диаграммы
        setCurrentPage(0); // Сбрасываем на первую страницу
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const, // Выравнивание легенды слева
        labels: {
          boxWidth: 12,
          padding: 6,
          font: {
            size: 10
          },
          usePointStyle: false,
        },
        display: true,
        fullSize: false,
      },
      title: {
        display: false, // Убираем title из Chart.js, название уже есть в компоненте
      },
      datalabels: {
        anchor: 'center' as const,
        align: 'center' as const,
        formatter: (value: number) => {
          return value > 0 ? value : '';
        },
        font: {
          weight: 'bold' as const,
          size: 16
        },
        color: '#ffffff',
        textStrokeColor: 'rgba(0, 0, 0, 0.5)',
        textStrokeWidth: 2,
        padding: 4,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          display: false, // Убираем значения с вертикальной оси
        },
        grid: {
          display: false, // Убираем вертикальные деления
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md h-[300px] sm:h-[350px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-xs sm:text-sm text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md h-[300px] sm:h-[350px] flex items-center justify-center">
        <p className="text-xs sm:text-sm text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  const monthlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: async (event: any, elements: any[]) => {
      if (elements.length > 0 && monthlyData && selectedYear) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        const month = monthlyData.labels[index];
        const dataset = monthlyData.datasets[datasetIndex];
        const value = dataset.data[index];
        setSelectedLineData({
          month: month,
          dataset: dataset.label,
          value: value
        });
        setSelectedBarData(null); // Сбрасываем выбор столбчатой диаграммы
        setCurrentPage(0); // Сбрасываем на первую страницу
      }
    },
    layout: {
      padding: {
        top: 0,
        right: 30,
        bottom: 0,
        left: 30,
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const, // Выравнивание легенды слева, как у столбчатой диаграммы
        labels: {
          boxWidth: 12,
          padding: 6,
          font: {
            size: 10
          },
          usePointStyle: false,
        },
        display: true,
        fullSize: false,
        maxWidth: undefined, // Не ограничиваем ширину
        maxHeight: undefined, // Не ограничиваем высоту
      },
      title: {
        display: false, // Убираем title из Chart.js, добавим отдельно
      },
      datalabels: {
        display: (context: any) => {
          // Показываем подписи для "Заявки на закупку" (индекс 0), "Заказы" (индекс 1) и "Закупочная процедура" (индекс 2)
          // Скрываем для "Не согласована / Проект" (индекс 3)
          const datasetIndex = context.datasetIndex;
          if (datasetIndex === 3) return false; // Скрываем для "Не согласована / Проект"
          
          // Получаем значение из данных
          const value = context.dataset.data[context.dataIndex];
          
          // Скрываем только для нулевых значений или если значение отсутствует
          if (value === 0 || value === null || value === undefined) return false;
          
          // Показываем подписи для всех ненулевых значений
          return datasetIndex === 0 || datasetIndex === 1 || datasetIndex === 2;
        },
        anchor: 'center' as const,
        align: (context: any) => {
          const datasetIndex = context.datasetIndex;
          // Размещаем подписи внутри области диаграммы
          // Для "Заявки на закупку" (индекс 0) и "Заказы" (индекс 1) - снизу, для "Закупочная процедура" (индекс 2) - сверху
          return datasetIndex === 2 ? 'top' : 'bottom';
        },
        formatter: (value: number) => {
          return value > 0 ? value : '';
        },
        font: {
          size: 10,
          weight: 'bold' as const,
        },
        color: '#ffffff', // Белый шрифт
        backgroundColor: (context: any) => {
          // Цвет фона соответствует цвету линии
          const dataset = context.dataset;
          return dataset.borderColor;
        },
        borderRadius: 4, // Скругленные углы квадратика
        padding: {
          top: 4,
          bottom: 4,
          left: 6,
          right: 6,
        },
        offset: -8, // Отрицательное смещение - размещаем подписи внутри области диаграммы
        clamp: true, // Ограничиваем подписи границами диаграммы
        clip: true, // Обрезаем подписи, которые выходят за границы
        overflow: 'hidden' as const, // Скрываем подписи, которые выходят за границы
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        offset: true, // Смещаем ось X для расширения области
        grid: {
          display: false, // Убираем сетку по оси X
        },
        ticks: {
          padding: 10, // Отступ для подписей
        },
        min: -0.25, // Расширяем на четверть деления до первой точки
        max: 11.25, // Расширяем на четверть деления после последней точки (12 месяцев, индексы 0-11)
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          display: false, // Убираем деления с вертикальной оси
        },
        grid: {
          display: true, // Оставляем сетку
        },
      },
    },
  };


  return (
    <div className="bg-white p-2 sm:p-3 rounded-lg shadow-md space-y-2 sm:space-y-3 w-full">
      {/* Диаграммы на одном уровне */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 sm:gap-2 w-full items-start">
        {/* Столбчатая диаграмма по годам */}
        <div className="lg:col-span-3 w-full flex flex-col">
          {allYears.length > 0 && (
            <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-medium text-gray-700">Год:</span>
              {allYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    selectedYear === year
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
          <div className="mb-1 h-[32px] sm:h-[36px] flex items-center">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">По годам</h3>
          </div>
          <div className="h-[250px] sm:h-[280px] w-full">
            <Bar data={data} options={options} />
          </div>
        </div>
        
        {/* Линейная диаграмма по месяцам */}
        {selectedYear !== null && (
          <div className="lg:col-span-5 w-full flex flex-col">
            {/* Пустое место для выравнивания с кнопками фильтра года */}
            <div className="mb-1 h-[28px] sm:h-[32px]"></div>
            <div className="mb-1 h-[32px] sm:h-[36px] flex items-center">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                {selectedYear ? `По месяцам (${selectedYear})` : 'По месяцам'}
              </h3>
            </div>
            <div className="h-[250px] sm:h-[280px] w-full">
              {monthlyLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-xs sm:text-sm text-gray-500">Загрузка данных...</p>
                  </div>
                </div>
              ) : monthlyData ? (
                <Line data={monthlyData} options={monthlyOptions} />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-xs sm:text-sm text-gray-500">Нет данных для отображения</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Таблица по ЦФО */}
        {selectedYear !== null && (
          <div className="lg:col-span-4 w-full flex flex-col">
            {/* Пустое место для выравнивания с кнопками фильтра года */}
            <div className="mb-1 h-[28px] sm:h-[32px]"></div>
            <div className="mb-1 h-[32px] sm:h-[36px] flex items-center">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                {selectedYear ? `По ЦФО (${selectedYear})` : 'По ЦФО'}
              </h3>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {cfoLoading ? (
                <div className="h-[250px] sm:h-[280px] w-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-xs sm:text-sm text-gray-500">Загрузка данных...</p>
                  </div>
                </div>
              ) : cfoData && cfoData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">ЦФО</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">Кол-во заказов</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">Сумма заказов</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">Кол-во закупочных процедур</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">Сумма закупочных процедур</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cfoData.map((row: CfoTableRow, index: number) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            // Устанавливаем фильтр по ЦФО при клике на строку
                            setCfoFilter(new Set([row.cfo]));
                            setSelectedBarData({
                              year: String(selectedYear),
                              dataset: 'ЦФО',
                              value: row.ordersCount + row.purchaseProceduresCount
                            });
                            setSelectedLineData(null);
                            setCurrentPage(0);
                          }}
                        >
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">{row.cfo}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-right">{row.ordersCount}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-right">
                            {row.ordersAmount ? new Intl.NumberFormat('ru-RU').format(row.ordersAmount) : '-'}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200 text-right">{row.purchaseProceduresCount}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 text-right">
                            {row.purchaseProceduresAmount ? new Intl.NumberFormat('ru-RU').format(row.purchaseProceduresAmount) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-[250px] sm:h-[280px] w-full flex items-center justify-center">
                  <p className="text-xs sm:text-sm text-gray-500">Нет данных для отображения</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Таблица с данными */}
      <div className="mt-2 sm:mt-3 bg-white rounded-lg shadow-lg overflow-hidden">
        {selectedBarData || selectedLineData ? (
          <>
            {/* Пагинация сверху */}
            {tableData && (tableData.purchaseRequests || tableData.purchases) && (
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  Показано {(tableData.purchaseRequests?.content?.length || 0) + (tableData.purchases?.content?.length || 0)} из {(tableData.purchaseRequests?.totalElements || 0) + (tableData.purchases?.totalElements || 0)} записей
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
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700">
                  Страница {currentPage + 1} из {Math.max(tableData.purchaseRequests?.totalPages || 0, tableData.purchases?.totalPages || 0)}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.max((tableData.purchaseRequests?.totalPages || 0) - 1, (tableData.purchases?.totalPages || 0) - 1)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед
                </button>
                <button
                  onClick={() => setCurrentPage(Math.max((tableData.purchaseRequests?.totalPages || 0) - 1, (tableData.purchases?.totalPages || 0) - 1))}
                  disabled={currentPage >= Math.max((tableData.purchaseRequests?.totalPages || 0) - 1, (tableData.purchases?.totalPages || 0) - 1)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Последняя
                </button>
              </div>
            </div>
          )}

          {/* Таблицы с данными */}
          {tableLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-500">Загрузка данных...</span>
            </div>
          ) : tableData ? (
            <div className="space-y-4 p-3">
              {tableData.purchaseRequests && tableData.purchaseRequests.content && tableData.purchaseRequests.content.length > 0 && (
                <div>
                  <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Заявки на закупку:</h5>
                  <div className="overflow-x-auto relative">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
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
                                    setLocalFilters(prev => ({ ...prev, name: e.target.value }));
                                  }}
                                  className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.purchaseRequests.content.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">{item.cfo || '-'}</td>
                            <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">{item.name || item.title || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {tableData.purchases && tableData.purchases.content && tableData.purchases.content.length > 0 && (
                <div>
                  <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Закупки:</h5>
                  <div className="overflow-x-auto relative">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative">
                            <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                              <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                                {/* Текстовое поле для ЦФО не используется, только множественный фильтр через выпадающий список */}
                                <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
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
                                    setLocalFilters(prev => ({ ...prev, name: e.target.value }));
                                  }}
                                  className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.purchases.content.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-300">{item.cfo || '-'}</td>
                            <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">{item.name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {(!tableData.purchaseRequests || !tableData.purchaseRequests.content || tableData.purchaseRequests.content.length === 0) && 
               (!tableData.purchases || !tableData.purchases.content || tableData.purchases.content.length === 0) && (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-4">Нет данных для отображения</p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs sm:text-sm text-gray-500">
                Выберите данные на диаграмме, чтобы посмотреть детали
              </p>
            </div>
          )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs sm:text-sm text-gray-500">
              Выберите элемент диаграммы, чтобы посмотреть детали
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

