'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Settings, Download, Check } from 'lucide-react';
import GanttChart from './GanttChart';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';

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
  purchaser: string | null;
  product: string | null;
  hasContract: boolean | null;
  currentKa: string | null;
  currentAmount: number | null;
  currentContractAmount: number | null;
  currentContractBalance: number | null;
  currentContractEndDate: string | null;
  autoRenewal: boolean | null;
  complexity: string | null;
  holding: string | null;
  category: string | null;
  status: string | null;
  purchaseRequestId: number | null;
  comment: string | null;
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

// ALL_COMPANIES будет загружаться с бэкенда
const ALL_STATUSES = ['Проект', 'Актуальная', 'Корректировка', 'Заявка', 'Не Актуальная', 'Пусто'];
const DEFAULT_STATUSES = ['Проект', 'Актуальная', 'Корректировка', 'Заявка', 'Пусто'];

const DEFAULT_VISIBLE_COLUMNS = [
  'id',
  'company',
  'purchaseRequestId',
  'cfo',
  'purchaseSubject',
  'budgetAmount',
  'requestDate',
  'newContractDate',
  'status',
  'comment',
];

const ALL_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'guid', label: 'GUID' },
  { key: 'year', label: 'Год' },
  { key: 'company', label: 'Компания' },
  { key: 'cfo', label: 'ЦФО' },
  { key: 'purchaseSubject', label: 'Предмет закупки' },
  { key: 'budgetAmount', label: 'Бюджет (UZS)' },
  { key: 'contractEndDate', label: 'Дата окончания договора' },
  { key: 'requestDate', label: 'Дата заявки' },
  { key: 'newContractDate', label: 'Дата завершения закупки' },
  { key: 'purchaser', label: 'Закупщик' },
  { key: 'product', label: 'Продукт' },
  { key: 'hasContract', label: 'Есть договор' },
  { key: 'currentKa', label: 'Текущий КА' },
  { key: 'currentAmount', label: 'Текущая сумма' },
  { key: 'currentContractAmount', label: 'Текущая сумма договора' },
  { key: 'currentContractBalance', label: 'Текущий остаток' },
  { key: 'currentContractEndDate', label: 'Дата окончания текущего договора' },
  { key: 'autoRenewal', label: 'Авто продление' },
  { key: 'complexity', label: 'Сложность' },
  { key: 'holding', label: 'Холдинг' },
  { key: 'category', label: 'Категория' },
  { key: 'status', label: 'Статус' },
  { key: 'purchaseRequestId', label: 'Заявка на закупку' },
  { key: 'comment', label: 'Комментарий' },
  { key: 'createdAt', label: 'Дата создания' },
  { key: 'updatedAt', label: 'Дата обновления' },
] as const;

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  id: 64,
  guid: 256,
  year: 64,
  company: 128,
  cfo: 128,
  purchaseSubject: 192,
  budgetAmount: 112,
  contractEndDate: 128,
  requestDate: 112,
  newContractDate: 128,
  purchaser: 128,
  product: 192,
  hasContract: 112,
  currentKa: 128,
  currentAmount: 128,
  currentContractAmount: 160,
  currentContractBalance: 160,
  currentContractEndDate: 160,
  autoRenewal: 128,
  complexity: 112,
  holding: 128,
  category: 128,
  status: 128,
  purchaseRequestId: 160,
  comment: 200,
  createdAt: 128,
  updatedAt: 128,
};

export default function PublicPurchasePlanTable() {
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set()); // Множество выбранных месяцев: -1 = без даты, 0-11 = месяц (0=январь, 11=декабрь)
  const [selectedMonthYear, setSelectedMonthYear] = useState<number | null>(null); // Год для фильтра по месяцу (если отличается от selectedYear)
  const [lastSelectedMonthIndex, setLastSelectedMonthIndex] = useState<number | null>(null); // Индекс последнего выбранного месяца для Shift+клик
  const [sortField, setSortField] = useState<SortField>('requestDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [allYears, setAllYears] = useState<number[]>([]);
  const [chartData, setChartData] = useState<PurchasePlanItem[]>([]);
  const [summaryData, setSummaryData] = useState<PurchasePlanItem[]>([]);
  
  const [filters, setFilters] = useState<Record<string, string>>({
    company: '',
    cfo: '',
    purchaseSubject: '',
    currentContractEndDate: '',
    purchaseRequestId: '',
    budgetAmount: '',
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
  });

  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    budgetAmount: '',
    budgetAmountOperator: 'gte', // По умолчанию "больше равно"
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<Set<string>>(new Set(['Uzum Market']));
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(DEFAULT_STATUSES));
  const [purchaserFilter, setPurchaserFilter] = useState<Set<string>>(new Set());
  const [availableCompanies, setAvailableCompanies] = useState<string[]>(['Uzum Market', 'Uzum Technologies', 'Uzum Tezkor']); // Список компаний с бэкенда
  
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isPurchaserFilterOpen, setIsPurchaserFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Фокус на textarea при редактировании комментария
  useEffect(() => {
    if (editingComment !== null && commentInputRef.current) {
      commentInputRef.current.focus();
      commentInputRef.current.select();
    }
  }, [editingComment]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [purchaserSearchQuery, setPurchaserSearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [companyFilterPosition, setCompanyFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [categoryFilterPosition, setCategoryFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserFilterPosition, setPurchaserFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusFilterPosition, setStatusFilterPosition] = useState<{ top: number; left: number } | null>(null);
  
  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  const companyFilterButtonRef = useRef<HTMLButtonElement>(null);
  const categoryFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserFilterButtonRef = useRef<HTMLButtonElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null);
  
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLUMNS));
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const columnsMenuButtonRef = useRef<HTMLButtonElement>(null);
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeColumn = useRef<string | null>(null);

  // Состояние для порядка колонок
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    // Инициализируем с видимыми колонками
    return Array.from(new Set(DEFAULT_VISIBLE_COLUMNS));
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Загрузка списка компаний с бэкенда
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/companies`);
        if (response.ok) {
          const companies = await response.json();
          setAvailableCompanies(companies);
        } else {
          console.error('Failed to load companies');
          // Fallback к захардкоженным значениям при ошибке
          setAvailableCompanies(['Uzum Market', 'Uzum Technologies', 'Uzum Tezkor']);
        }
      } catch (error) {
        console.error('Error loading companies:', error);
        // Fallback к захардкоженным значениям при ошибке
        setAvailableCompanies(['Uzum Market', 'Uzum Technologies', 'Uzum Tezkor']);
      }
    };
    loadCompanies();
  }, []);

  // Загружаем сохраненный порядок колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('publicPurchasePlanTableColumnOrder');
      if (saved) {
        const order = JSON.parse(saved);
        // Проверяем, что все колонки присутствуют и видимы
        const validOrder = order.filter((col: string) => visibleColumns.has(col));
        const missingCols = Array.from(visibleColumns).filter(col => !validOrder.includes(col));
        if (validOrder.length > 0 || missingCols.length > 0) {
          setColumnOrder([...validOrder, ...missingCols]);
        }
      } else {
        // Если нет сохраненного порядка, используем видимые колонки
        setColumnOrder(Array.from(visibleColumns));
      }
    } catch (err) {
      console.error('Error loading column order:', err);
      setColumnOrder(Array.from(visibleColumns));
    }
  }, []);

  // Синхронизируем columnOrder с visibleColumns при изменении visibleColumns
  useEffect(() => {
    const visibleArray = Array.from(visibleColumns);
    const currentOrder = columnOrder.filter(col => visibleColumns.has(col));
    const missingCols = visibleArray.filter(col => !currentOrder.includes(col));
    if (missingCols.length > 0) {
      const newOrder = [...currentOrder, ...missingCols];
      setColumnOrder(newOrder);
      saveColumnOrder(newOrder);
    } else if (currentOrder.length !== visibleArray.length) {
      // Если порядок не совпадает с видимыми колонками, обновляем
      const newOrder = visibleArray.filter(col => currentOrder.includes(col)).concat(
        visibleArray.filter(col => !currentOrder.includes(col))
      );
      if (newOrder.length === visibleArray.length) {
        setColumnOrder(newOrder);
        saveColumnOrder(newOrder);
      }
    }
  }, [visibleColumns]);

  // Загружаем сохраненные ширины колонок из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('publicPurchasePlanTableColumnWidths');
      if (saved) {
        const widths = JSON.parse(saved);
        setColumnWidths(prev => ({ ...DEFAULT_COLUMN_WIDTHS, ...widths }));
      }
    } catch (err) {
      console.error('Error loading column widths:', err);
    }
  }, []);

  // Сохраняем порядок колонок в localStorage
  const saveColumnOrder = useCallback((order: string[]) => {
    try {
      localStorage.setItem('publicPurchasePlanTableColumnOrder', JSON.stringify(order));
    } catch (err) {
      console.error('Error saving column order:', err);
    }
  }, []);

  // Сохраняем ширины колонок в localStorage
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem('publicPurchasePlanTableColumnWidths', JSON.stringify(widths));
    } catch (err) {
      console.error('Error saving column widths:', err);
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

    if (draggedIndex === -1 || targetIndex === -1) return;

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    saveColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleCommentUpdate = async (itemId: number, newComment: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: newComment || null }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setEditingComment(null);
        
        // Обновляем только конкретную строку в локальном состоянии
        if (data) {
          setData({
            ...data,
            content: data.content.map(item => 
              item.id === itemId 
                ? { ...item, comment: updatedItem.comment }
                : item
            ),
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to update comment:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  // Обработчик начала изменения размера
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    resizeColumn.current = columnKey;
    resizeStartX.current = e.clientX;
    const currentWidth = columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100;
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

  const getColumnWidth = useCallback((columnKey: string): number => {
    return columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100;
  }, [columnWidths]);

  // Загружаем годы
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/years`);
        if (response.ok) {
          const years = await response.json();
          setAllYears(years.sort((a: number, b: number) => b - a));
          if (years.length > 0 && !selectedYear) {
            setSelectedYear(years[0]);
          }
        }
      } catch (err) {
        console.error('Error loading years:', err);
      }
    };
    fetchYears();
  }, []);

  // Загружаем данные для столбчатой диаграммы
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000');
        
        // Для фильтрации по году планирования: если выбран только месяц из другого года, не применяем фильтр по году планирования
        // Но если выбран и декабрь предыдущего года, и месяцы текущего года, нужно передать year для месяцев текущего года
        if (selectedYear !== null) {
          // Если выбран только декабрь предыдущего года (selectedMonthYear !== null и нет других месяцев текущего года)
          // то не передаем year, чтобы показать все данные
          // Но если есть месяцы текущего года в selectedMonths, передаем year
          const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
          if (selectedMonthYear === null || hasCurrentYearMonths) {
            params.append('year', String(selectedYear));
          }
        }
        
        if (companyFilter.size > 0) {
          companyFilter.forEach(company => params.append('company', company));
        }
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => params.append('cfo', cfo));
        }
        if (filters.purchaseSubject && filters.purchaseSubject.trim() !== '') {
          params.append('purchaseSubject', filters.purchaseSubject.trim());
        }
        if (filters.purchaseRequestId && filters.purchaseRequestId.trim() !== '') {
          params.append('purchaseRequestId', filters.purchaseRequestId.trim());
        }
        if (purchaserFilter.size > 0) {
          purchaserFilter.forEach(purchaser => params.append('purchaser', purchaser));
        }
        if (categoryFilter.size > 0) {
          categoryFilter.forEach(category => params.append('category', category));
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
        
        // Для диаграммы не применяем фильтр по месяцу, чтобы показать все месяцы
        
        const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const result = await response.json();
          setChartData(result.content || []);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setChartData([]);
      }
    };
    
    if (selectedYear !== null) {
      fetchChartData();
    }
  }, [selectedYear, selectedMonthYear, filters, cfoFilter, companyFilter, purchaserFilter, categoryFilter, statusFilter]);

  // Загружаем данные для сводной таблицы (без учета фильтра по закупщику)
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000');
        
        // Для фильтрации по году планирования: если выбран только месяц из другого года, не применяем фильтр по году планирования
        // Но если выбран и декабрь предыдущего года, и месяцы текущего года, нужно передать year для месяцев текущего года
        if (selectedYear !== null) {
          // Если выбран только декабрь предыдущего года (selectedMonthYear !== null и нет других месяцев текущего года)
          // то не передаем year, чтобы показать все данные
          // Но если есть месяцы текущего года в selectedMonths, передаем year
          const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
          if (selectedMonthYear === null || hasCurrentYearMonths) {
            params.append('year', String(selectedYear));
          }
        }
        
        if (companyFilter.size > 0) {
          companyFilter.forEach(company => params.append('company', company));
        }
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => params.append('cfo', cfo));
        }
        if (filters.purchaseSubject && filters.purchaseSubject.trim() !== '') {
          params.append('purchaseSubject', filters.purchaseSubject.trim());
        }
        if (filters.purchaseRequestId && filters.purchaseRequestId.trim() !== '') {
          params.append('purchaseRequestId', filters.purchaseRequestId.trim());
        }
        if (categoryFilter.size > 0) {
          categoryFilter.forEach(category => params.append('category', category));
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
        
        // Фильтр по месяцу даты заявки (из столбчатой диаграммы)
        if (selectedMonths.size > 0) {
          // Отправляем все выбранные месяцы
          selectedMonths.forEach(monthKey => {
            if (monthKey === -1) {
              // Без даты
              params.append('requestMonth', '-1');
            } else if (monthKey === -2) {
              // Декабрь предыдущего года
              params.append('requestMonth', '11');
              if (selectedMonthYear !== null) {
                params.append('requestYear', String(selectedMonthYear));
              }
            } else {
              // Месяцы текущего года (0-11)
              params.append('requestMonth', String(monthKey));
            }
          });
        }
        
        const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const result = await response.json();
          setSummaryData(result.content || []);
        } else {
          setSummaryData([]);
        }
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setSummaryData([]);
      }
    };
    
    if (selectedYear !== null) {
      fetchSummaryData();
    }
  }, [selectedYear, selectedMonths, selectedMonthYear, filters, cfoFilter, companyFilter, categoryFilter, statusFilter]);

  // Функция для подсчета количества закупок по месяцам
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
      if (item.status === 'Не Актуальная') {
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
      } else if (itemYear === displayYear + 1 && itemMonth === 11) {
        monthCounts[12]++;
      }
    });

    return monthCounts;
  }, [chartData, selectedYear]);

  const monthlyCounts = getMonthlyDistribution.slice(0, 13);
  const maxCount = Math.max(...monthlyCounts, 1);

  // Сводная статистика по ЦФО
  const cfoSummary = useMemo(() => {
    if (!summaryData || summaryData.length === 0) {
      return [];
    }

    const summaryMap = new Map<string, { count: number; totalBudget: number }>();

    summaryData.forEach((item) => {
      if (item.status === 'Не Актуальная') {
        return;
      }

      const cfo = item.cfo || 'Не указано';
      const budget = item.budgetAmount || 0;

      if (!summaryMap.has(cfo)) {
        summaryMap.set(cfo, { count: 0, totalBudget: 0 });
      }

      const entry = summaryMap.get(cfo)!;
      entry.count++;
      entry.totalBudget += budget;
    });

    return Array.from(summaryMap.entries())
      .map(([cfo, data]) => ({
        cfo,
        count: data.count,
        totalBudget: data.totalBudget,
      }))
      .sort((a, b) => b.totalBudget - a.totalBudget);
  }, [summaryData]);

  const fetchData = async (
    page: number,
    size: number,
    year: number | null,
    sortField: SortField,
    sortDirection: SortDirection,
    filters: Record<string, string>,
    purchaserFilter: Set<string>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));
      
      // Для фильтрации по году планирования: если выбран только месяц из другого года, не применяем фильтр по году планирования
      // Но если выбран и декабрь предыдущего года, и месяцы текущего года, нужно передать year для месяцев текущего года
      if (year !== null) {
        // Если выбран только декабрь предыдущего года (selectedMonthYear !== null и нет других месяцев текущего года)
        // то не передаем year, чтобы показать все данные
        // Но если есть месяцы текущего года в selectedMonths, передаем year
        const hasCurrentYearMonths = Array.from(selectedMonths).some(monthKey => monthKey >= 0 && monthKey <= 11 && monthKey !== -1 && monthKey !== -2);
        if (selectedMonthYear === null || hasCurrentYearMonths) {
          params.append('year', String(year));
        }
      }
      
      if (companyFilter.size > 0) {
        companyFilter.forEach(company => params.append('company', company));
      }
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => params.append('cfo', cfo));
      }
      if (filters.purchaseSubject && filters.purchaseSubject.trim() !== '') {
        params.append('purchaseSubject', filters.purchaseSubject.trim());
      }
      if (filters.purchaseRequestId && filters.purchaseRequestId.trim() !== '') {
        params.append('purchaseRequestId', filters.purchaseRequestId.trim());
      }
      if (purchaserFilter.size > 0) {
        purchaserFilter.forEach(purchaser => params.append('purchaser', purchaser));
      }
      if (categoryFilter.size > 0) {
        categoryFilter.forEach(category => params.append('category', category));
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
      
      // Фильтр по месяцу даты заявки
      if (selectedMonths.size > 0) {
        // Отправляем все выбранные месяцы
        selectedMonths.forEach(monthKey => {
          if (monthKey === -1) {
            // Без даты
            params.append('requestMonth', '-1');
          } else if (monthKey === -2) {
            // Декабрь предыдущего года
            params.append('requestMonth', '11');
            if (selectedMonthYear !== null) {
              params.append('requestYear', String(selectedMonthYear));
            }
          } else {
            // Месяцы текущего года (0-11)
            params.append('requestMonth', String(monthKey));
          }
        });
      }
      
      // Фильтр по бюджету (обрабатываем отдельно)
      // Используем оператор и значение из localFilters, если они есть, иначе из filters
      const budgetOperator = localFilters.budgetAmountOperator || filters.budgetAmountOperator || 'gte';
      const budgetAmount = localFilters.budgetAmount || filters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      
      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
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

  useEffect(() => {
    if (selectedYear !== null) {
      fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filters, purchaserFilter);
    }
  }, [currentPage, pageSize, selectedYear, selectedMonths, selectedMonthYear, sortField, sortDirection, filters, companyFilter, cfoFilter, purchaserFilter, categoryFilter, statusFilter]);

  // Debounce для текстовых фильтров и фильтра бюджета
  const prevLocalFiltersRef = useRef<Record<string, string>>({
    budgetAmount: '',
    budgetAmountOperator: 'gte',
  });
  
  useEffect(() => {
    // Проверяем, изменились ли текстовые фильтры
    const textFields = ['purchaseSubject', 'purchaseRequestId'];
    const hasTextChanges = textFields.some(field => {
      const current = localFilters[field] || '';
      const prev = prevLocalFiltersRef.current[field] || '';
      return current !== prev;
    });
    // Для бюджета проверяем изменение значения
    const hasBudgetValueChange = (localFilters.budgetAmount || '') !== (prevLocalFiltersRef.current.budgetAmount || '');
    // Проверяем изменение оператора (если значение бюджета уже есть, нужно обновить запрос)
    const hasBudgetOperatorChange = (localFilters.budgetAmountOperator || 'gte') !== (prevLocalFiltersRef.current.budgetAmountOperator || 'gte');
    // Проверяем наличие значения бюджета в localFilters
    const hasBudgetValue = localFilters.budgetAmount && localFilters.budgetAmount.trim() !== '';
    
    if (hasTextChanges || hasBudgetValueChange || (hasBudgetOperatorChange && hasBudgetValue)) {
      // Сохраняем текущие значения для обновления ref после применения
      const currentLocalFilters = { ...localFilters };
      
      const timer = setTimeout(() => {
        setFilters(prev => {
          // Обновляем только измененные текстовые поля и поля бюджета
          const updated = { ...prev };
          textFields.forEach(field => {
            if (currentLocalFilters[field] !== undefined) {
              updated[field] = currentLocalFilters[field] || '';
            }
          });
          // Обновляем значение бюджета и оператор вместе
          // Сохраняем значение бюджета только если оно не пустое
          if (currentLocalFilters.budgetAmount && currentLocalFilters.budgetAmount.trim() !== '') {
            updated.budgetAmount = currentLocalFilters.budgetAmount;
          } else if (currentLocalFilters.budgetAmount === '') {
            // Если значение явно очищено, сохраняем пустую строку
            updated.budgetAmount = '';
          }
          // Оператор всегда обновляем
          if (currentLocalFilters.budgetAmountOperator !== undefined) {
            updated.budgetAmountOperator = currentLocalFilters.budgetAmountOperator;
          }
          return updated;
        });
        // Обновляем ref только после применения фильтров
        prevLocalFiltersRef.current = currentLocalFilters;
        setCurrentPage(0); // Сбрасываем на первую страницу после применения фильтра
      }, hasBudgetOperatorChange && hasBudgetValue ? 0 : 500); // Для оператора без задержки, для значения с задержкой

      return () => clearTimeout(timer);
    }
  }, [localFilters]);

  // Синхронизация localFilters.budgetAmount с filters после загрузки данных
  // НО только если поле не в фокусе, чтобы сохранить форматирование
  // Отключена, чтобы избежать циклов обновлений - localFilters обновляется только пользователем

  // Восстановление фокуса после завершения загрузки данных с сервера
  const prevLoadingForFocusRef = useRef(loading);
  useEffect(() => {
    // Восстанавливаем фокус только когда загрузка завершилась (loading изменился с true на false)
    if (focusedField && !loading && prevLoadingForFocusRef.current && data) {
      // Небольшая задержка, чтобы дать React время отрендерить обновленные данные
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input && document.activeElement !== input) {
          input.focus();
          // Устанавливаем курсор в конец текста
          const length = input.value.length;
          input.setSelectionRange(length, length);
        }
      }, 100);

      prevLoadingForFocusRef.current = loading;
      return () => clearTimeout(timer);
    }
    prevLoadingForFocusRef.current = loading;
  }, [loading, data, focusedField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('ru-RU', { 
      notation: 'compact',
      maximumFractionDigits: 1 
    }).format(value);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU');
    } catch {
      return '-';
    }
  };

  // Настройка ReactToPrint для экспорта в PDF
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `План_закупок_публичный_${selectedYear || 'Все'}_${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
    `,
  });

  // Функция для экспорта плана закупок в PDF
  const exportToPDF = () => {
    if (!data?.content || data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }
    handlePrint();
  };

  // Функция для подготовки данных для экспорта в Excel
  const prepareExportData = (items: PurchasePlanItem[]) => {
    return items.map((item) => ({
      'ID': item.id || '',
      'GUID': item.guid || '',
      'Год': item.year || '',
      'Компания': item.company || '',
      'ЦФО': item.cfo || '',
      'Предмет закупки': item.purchaseSubject || '',
      'Бюджет (UZS)': item.budgetAmount || '',
      'Срок окончания договора': item.contractEndDate 
        ? new Date(item.contractEndDate).toLocaleDateString('ru-RU')
        : '',
      'Дата заявки': item.requestDate 
        ? new Date(item.requestDate).toLocaleDateString('ru-RU')
        : '',
      'Дата завершения закупки': item.newContractDate 
        ? new Date(item.newContractDate).toLocaleDateString('ru-RU')
        : '',
      'Закупщик': item.purchaser || '',
      'Продукция': item.product || '',
      'Статус': item.status || '',
      'Категория': item.category || '',
    }));
  };

  // Функция для экспорта в Excel с примененными фильтрами
  const handleExportToExcelWithFilters = async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      const exportData = prepareExportData(data.content);

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Устанавливаем ширину колонок
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 40 }, // GUID
        { wch: 8 },  // Год
        { wch: 20 }, // Компания
        { wch: 20 }, // ЦФО
        { wch: 40 }, // Предмет закупки
        { wch: 15 }, // Бюджет
        { wch: 20 }, // Срок окончания договора
        { wch: 15 }, // Дата заявки
        { wch: 20 }, // Дата завершения закупки
        { wch: 20 }, // Закупщик
        { wch: 20 }, // Продукция
        { wch: 15 }, // Статус
        { wch: 20 }, // Категория
      ];
      ws['!cols'] = colWidths;

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'План закупок');

      // Генерируем имя файла с датой
      const fileName = `План_закупок_публичный_с_фильтрами_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    }
  };

  // Получаем уникальные значения для фильтров
  const uniqueValues = useMemo(() => {
    const result: Record<string, Set<string>> = {
      cfo: new Set(),
      category: new Set(),
      purchaser: new Set(),
    };

    summaryData.forEach((item) => {
      if (item.cfo) result.cfo.add(item.cfo);
      if (item.category) result.category.add(item.category);
      if (item.purchaser) result.purchaser.add(item.purchaser);
    });

    return {
      cfo: Array.from(result.cfo).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
      category: Array.from(result.category).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
      purchaser: Array.from(result.purchaser).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
    };
  }, [summaryData]);

  // Фильтры
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

  useEffect(() => {
    if (isCfoFilterOpen && cfoFilterButtonRef.current) {
      const position = calculateFilterPosition(cfoFilterButtonRef);
      setCfoFilterPosition(position);
    }
  }, [isCfoFilterOpen, calculateFilterPosition]);

  useEffect(() => {
    if (isCompanyFilterOpen && companyFilterButtonRef.current) {
      const position = calculateFilterPosition(companyFilterButtonRef);
      setCompanyFilterPosition(position);
    }
  }, [isCompanyFilterOpen, calculateFilterPosition]);

  useEffect(() => {
    if (isCategoryFilterOpen && categoryFilterButtonRef.current) {
      const position = calculateFilterPosition(categoryFilterButtonRef);
      setCategoryFilterPosition(position);
    }
  }, [isCategoryFilterOpen, calculateFilterPosition]);

  useEffect(() => {
    if (isPurchaserFilterOpen && purchaserFilterButtonRef.current) {
      const position = calculateFilterPosition(purchaserFilterButtonRef);
      setPurchaserFilterPosition(position);
    }
  }, [isPurchaserFilterOpen, calculateFilterPosition]);

  useEffect(() => {
    if (isStatusFilterOpen && statusFilterButtonRef.current) {
      const position = calculateFilterPosition(statusFilterButtonRef);
      setStatusFilterPosition(position);
    }
  }, [isStatusFilterOpen, calculateFilterPosition]);

  useEffect(() => {
    if (isColumnsMenuOpen && columnsMenuButtonRef.current) {
      const position = calculateFilterPosition(columnsMenuButtonRef);
      setColumnsMenuPosition(position);
    }
  }, [isColumnsMenuOpen, calculateFilterPosition]);

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (isCfoFilterOpen && cfoFilterButtonRef.current && !cfoFilterButtonRef.current.contains(target)) {
        const cfoMenuElement = document.querySelector('[data-cfo-filter-menu="true"]');
        if (cfoMenuElement && !cfoMenuElement.contains(target)) {
          setIsCfoFilterOpen(false);
        }
      }
      
      if (isCompanyFilterOpen && companyFilterButtonRef.current && !companyFilterButtonRef.current.contains(target)) {
        const companyMenuElement = document.querySelector('[data-company-filter-menu="true"]');
        if (companyMenuElement && !companyMenuElement.contains(target)) {
          setIsCompanyFilterOpen(false);
        }
      }
      
      if (isCategoryFilterOpen && categoryFilterButtonRef.current && !categoryFilterButtonRef.current.contains(target)) {
        const categoryMenuElement = document.querySelector('[data-category-filter-menu="true"]');
        if (categoryMenuElement && !categoryMenuElement.contains(target)) {
          setIsCategoryFilterOpen(false);
        }
      }
      
      if (isPurchaserFilterOpen && purchaserFilterButtonRef.current && !purchaserFilterButtonRef.current.contains(target)) {
        const purchaserMenuElement = document.querySelector('[data-purchaser-filter-menu="true"]');
        if (purchaserMenuElement && !purchaserMenuElement.contains(target)) {
          setIsPurchaserFilterOpen(false);
        }
      }
      
      if (isStatusFilterOpen && statusFilterButtonRef.current && !statusFilterButtonRef.current.contains(target)) {
        const statusMenuElement = document.querySelector('[data-status-filter-menu="true"]');
        if (statusMenuElement && !statusMenuElement.contains(target)) {
          setIsStatusFilterOpen(false);
        }
      }
      
      if (isColumnsMenuOpen && columnsMenuButtonRef.current && !columnsMenuButtonRef.current.contains(target)) {
        const columnsMenuElement = document.querySelector('[data-columns-menu="true"]');
        if (columnsMenuElement && !columnsMenuElement.contains(target)) {
          setIsColumnsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCfoFilterOpen, isCompanyFilterOpen, isCategoryFilterOpen, isPurchaserFilterOpen, isStatusFilterOpen, isColumnsMenuOpen]);

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

  const getFilteredCompanyOptions = useMemo(() => {
    const query = companySearchQuery.toLowerCase();
    return availableCompanies.filter((company) => company.toLowerCase().includes(query));
  }, [companySearchQuery, availableCompanies]);

  const getFilteredCategoryOptions = useMemo(() => {
    const query = categorySearchQuery.toLowerCase();
    return uniqueValues.category.filter((category) => category.toLowerCase().includes(query));
  }, [uniqueValues.category, categorySearchQuery]);

  const getFilteredPurchaserOptions = useMemo(() => {
    const query = purchaserSearchQuery.toLowerCase();
    return uniqueValues.purchaser.filter((purchaser) => purchaser.toLowerCase().includes(query));
  }, [uniqueValues.purchaser, purchaserSearchQuery]);

  const getFilteredStatusOptions = useMemo(() => {
    const query = statusSearchQuery.toLowerCase();
    return ALL_STATUSES.filter((status) => status.toLowerCase().includes(query));
  }, [statusSearchQuery]);

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
    const allCfos = uniqueValues.cfo;
    const newSet = new Set(allCfos);
    setCfoFilter(newSet);
    setCurrentPage(0);
  };

  const handleCfoDeselectAll = () => {
    setCfoFilter(new Set());
    setCurrentPage(0);
  };

  const handleCompanyToggle = (company: string) => {
    const newSet = new Set(companyFilter);
    if (newSet.has(company)) {
      newSet.delete(company);
    } else {
      newSet.add(company);
    }
    setCompanyFilter(newSet);
    setCurrentPage(0);
  };

  const handleCompanySelectAll = () => {
    const newSet = new Set(availableCompanies);
    setCompanyFilter(newSet);
    setCurrentPage(0);
  };

  const handleCompanyDeselectAll = () => {
    setCompanyFilter(new Set());
    setCurrentPage(0);
  };

  const handleCategoryToggle = (category: string) => {
    const newSet = new Set(categoryFilter);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setCategoryFilter(newSet);
    setCurrentPage(0);
  };

  const handleCategorySelectAll = () => {
    const allCategories = uniqueValues.category;
    const newSet = new Set(allCategories);
    setCategoryFilter(newSet);
    setCurrentPage(0);
  };

  const handleCategoryDeselectAll = () => {
    setCategoryFilter(new Set());
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
    const newSet = new Set(ALL_STATUSES);
    setStatusFilter(newSet);
    setCurrentPage(0);
  };

  const handleStatusDeselectAll = () => {
    setStatusFilter(new Set());
    setCurrentPage(0);
  };

  const handlePurchaserToggle = (purchaser: string) => {
    const newSet = new Set(purchaserFilter);
    if (newSet.has(purchaser)) {
      newSet.delete(purchaser);
    } else {
      newSet.add(purchaser);
    }
    setPurchaserFilter(newSet);
    setCurrentPage(0);
  };

  const handlePurchaserSelectAll = () => {
    const allPurchasers = uniqueValues.purchaser;
    const newSet = new Set(allPurchasers);
    setPurchaserFilter(newSet);
    setCurrentPage(0);
  };

  const handlePurchaserDeselectAll = () => {
    setPurchaserFilter(new Set());
    setCurrentPage(0);
  };

  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
        // Удаляем из columnOrder
        setColumnOrder(prevOrder => {
          const newOrder = prevOrder.filter(col => col !== columnKey);
          saveColumnOrder(newOrder);
          return newOrder;
        });
      } else {
        newSet.add(columnKey);
        // Добавляем в columnOrder в конец
        setColumnOrder(prevOrder => {
          if (!prevOrder.includes(columnKey)) {
            const newOrder = [...prevOrder, columnKey];
            saveColumnOrder(newOrder);
            return newOrder;
          }
          return prevOrder;
        });
      }
      return newSet;
    });
  };

  // Синхронизируем columnOrder с visibleColumns при изменении visibleColumns
  useEffect(() => {
    const visibleArray = Array.from(visibleColumns);
    const currentOrder = columnOrder.filter(col => visibleColumns.has(col));
    const missingCols = visibleArray.filter(col => !currentOrder.includes(col));
    if (missingCols.length > 0 || currentOrder.length !== visibleArray.length) {
      const newOrder = [...currentOrder, ...missingCols];
      setColumnOrder(newOrder);
      saveColumnOrder(newOrder);
    }
  }, [visibleColumns]);

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
    const fieldKey = field || '';
    const isSorted = sortField === field;
    const filterValue = filterType === 'text' ? (localFilters[fieldKey] || '') : (filters[fieldKey] || '');
    const columnWidth = columnKey ? getColumnWidth(columnKey) : undefined;
    const style: React.CSSProperties = columnWidth 
      ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px`, verticalAlign: 'top', overflow: 'hidden' }
      : { verticalAlign: 'top', overflow: 'hidden' };

    const isDragging = draggedColumn === columnKey;
    const isDragOver = dragOverColumn === columnKey;

    return (
      <th 
        draggable={!!columnKey}
        onDragStart={columnKey ? (e) => handleDragStart(e, columnKey) : undefined}
        onDragOver={columnKey ? (e) => handleDragOver(e, columnKey) : undefined}
        onDragLeave={columnKey ? handleDragLeave : undefined}
        onDrop={columnKey ? (e) => handleDrop(e, columnKey) : undefined}
        className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${width || ''} ${columnKey ? 'cursor-move' : ''} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`} 
        style={style}
      >
      <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
          <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
            {filterType === 'text' ? (
              <input
                type="text"
                data-filter-field={fieldKey}
                value={filterValue}
                autoFocus={focusedField === fieldKey}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setLocalFilters(prev => ({
                    ...prev,
                    [fieldKey]: newValue,
                  }));
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  setFocusedField(fieldKey);
                }}
                onBlur={(e) => {
                  const currentTarget = e.currentTarget;
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement && 
                        activeElement !== currentTarget && 
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
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Заголовок с логотипом */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                // Проверяем, авторизован ли пользователь
                const authToken = document.cookie.split('; ').find(row => row.startsWith('auth-token='));
                if (authToken) {
                  // Если авторизован, переходим на главную страницу
                  window.location.href = '/?tab=overview';
                } else {
                  // Если не авторизован, переходим на страницу логина с параметром
                  window.location.href = '/login?from=public-plan';
                }
              }
            }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/images/logo-small.svg" 
              alt="uzProc Logo" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-black">uzProc</h1>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              План закупок {selectedYear ? selectedYear : ''} (текущая редакция)
            </h2>
          </div>
        </div>

        {/* Сводная таблица и элементы управления */}
        <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start w-full">
            <div className="flex items-start">
              {/* Сводная таблица */}
              <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
                <div className="overflow-x-auto">
                  <table className="border-collapse table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap uppercase">
                          ЦФО
                        </th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                          Количество
                        </th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                          Сумма бюджета
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cfoSummary.length > 0 ? (
                        cfoSummary.map((item, index) => {
                        const isSelected = cfoFilter.size === 1 && cfoFilter.has(item.cfo);
                        return (
                          <tr 
                            key={index} 
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-100 hover:bg-blue-200' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setCfoFilter(new Set());
                              } else {
                                setCfoFilter(new Set([item.cfo]));
                              }
                              setCurrentPage(0);
                            }}
                          >
                            <td className="px-2 py-1 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                              {item.cfo}
                    </td>
                            <td className="px-2 py-1 text-xs text-gray-900 text-right border-r border-gray-200 whitespace-nowrap">
                              {item.count}
                      </td>
                            <td className="px-2 py-1 text-xs text-gray-900 text-right whitespace-nowrap">
                              {item.totalBudget.toLocaleString('ru-RU', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                              })}
                      </td>
                    </tr>
                        );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-2 py-1 text-xs text-gray-500 text-center whitespace-nowrap">
                            Нет данных
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-300">
                      <tr 
                        className="cursor-pointer transition-colors hover:bg-gray-100"
                        onClick={() => {
                          setCfoFilter(new Set());
                          setCurrentPage(0);
                        }}
                      >
                        <td className="px-2 py-1 text-xs font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      Итого
                    </td>
                        <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r border-gray-200 whitespace-nowrap">
                          {cfoSummary.reduce((sum, item) => sum + item.count, 0)}
                    </td>
                        <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right whitespace-nowrap">
                          {cfoSummary.reduce((sum, item) => sum + item.totalBudget, 0).toLocaleString('ru-RU', { 
                            minimumFractionDigits: 0, 
                            maximumFractionDigits: 0 
                          })}
                        </td>
                  </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Элементы управления */}
            <div className="flex items-start gap-2 flex-shrink-0 ml-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
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
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">Компания:</span>
                  <div className="relative">
                    <button
                      ref={companyFilterButtonRef}
                      type="button"
                      onClick={() => setIsCompanyFilterOpen(!isCompanyFilterOpen)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-2 hover:bg-gray-50 min-w-[200px]"
                    >
                      <span className="text-gray-700 truncate flex-1 text-left">
                        {companyFilter.size === 0 
                          ? 'Все компании' 
                          : companyFilter.size === 1
                          ? (Array.from(companyFilter)[0] || 'Все компании')
                          : `${companyFilter.size} выбрано`}
                      </span>
                      <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${isCompanyFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isCompanyFilterOpen && companyFilterPosition && (
                      <div 
                        data-company-filter-menu="true"
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                        style={{
                          top: `${companyFilterPosition.top}px`,
                          left: `${companyFilterPosition.left}px`,
                        }}
                      >
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              type="text"
                              value={companySearchQuery}
                              onChange={(e) => {
                                e.stopPropagation();
                                setCompanySearchQuery(e.target.value);
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
                            onClick={() => handleCompanySelectAll()}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Все
                          </button>
                          <button
                            onClick={() => handleCompanyDeselectAll()}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Снять
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredCompanyOptions.length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                          ) : (
                            getFilteredCompanyOptions.map((company) => (
                              <label
                                key={company}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={companyFilter.has(company)}
                                  onChange={() => handleCompanyToggle(company)}
                                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-xs text-gray-700 flex-1">{company}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      ref={columnsMenuButtonRef}
                      type="button"
                      onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Колонки
                    </button>
                    
                    {isColumnsMenuOpen && columnsMenuPosition && (
                      <div
                        data-columns-menu="true"
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden"
                        style={{
                          top: `${columnsMenuPosition.top}px`,
                          left: `${columnsMenuPosition.left}px`,
                        }}
                      >
                        <div className="p-2 border-b border-gray-200">
                          <div className="text-sm font-medium text-gray-700">Выберите колонки</div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {ALL_COLUMNS.map((column) => (
                            <label
                              key={column.key}
                              className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns.has(column.key)}
                                onChange={() => toggleColumnVisibility(column.key)}
                                className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-xs text-gray-700 flex-1">{column.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const emptyFilters = {
                        company: '',
                        cfo: '',
                        purchaseSubject: '',
                        currentContractEndDate: '',
                        purchaseRequestId: '',
                        budgetAmount: '',
                        budgetAmountOperator: 'gte',
                      };
                      setFilters(emptyFilters);
                      setLocalFilters({
                        budgetAmount: '',
                        budgetAmountOperator: 'gte',
                      });
                      setCfoFilter(new Set());
                      setCompanyFilter(new Set(['Uzum Market']));
                      setCategoryFilter(new Set());
                      setPurchaserFilter(new Set());
                      const resetStatusFilter = ALL_STATUSES.filter(s => s !== 'Не Актуальная');
                      setStatusFilter(new Set(resetStatusFilter));
                      setSortField('requestDate');
                      setSortDirection('asc');
                      setFocusedField(null);
                      setSelectedYear(allYears.length > 0 ? allYears[0] : null);
                      setSelectedMonths(new Set());
                      setSelectedMonthYear(null);
                      setCurrentPage(0);
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                  >
                    Сбросить фильтры
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2"
                    title="Экспорт в PDF"
                  >
                    <Download className="w-4 h-4" />
                    Экспорт в PDF
                  </button>
                  <button
                    onClick={handleExportToExcelWithFilters}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Экспорт в Excel с фильтрами"
                    disabled={!data || !data.content || data.content.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Excel (с фильтрами)
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Пагинация */}
        {data && (
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-700">
                Показано {data?.content.length || 0} из {data?.totalElements || 0} записей
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-xs text-gray-700">
                  Элементов на странице:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Первая
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span className="px-2 py-1 text-xs font-medium text-gray-700">
                Страница {currentPage + 1} из {data?.totalPages || 0}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= (data?.totalPages || 0) - 1}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед
              </button>
              <button
                onClick={() => setCurrentPage((data?.totalPages || 0) - 1)}
                disabled={currentPage >= (data?.totalPages || 0) - 1}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Последняя
              </button>
            </div>
          </div>
        )}

        {/* Таблица */}
        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500">Загрузка данных...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-center py-8">
              <p className="text-red-600">Ошибка: {error}</p>
            </div>
          </div>
        ) : (
          <div ref={printRef} className="flex-1 overflow-auto print-container">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columnOrder.filter(col => visibleColumns.has(col)).map((columnKey) => {
                    if (columnKey === 'id') {
                      return <SortableHeader key={columnKey} field="id" label="ID" columnKey="id" />;
                    }
                    if (columnKey === 'company') {
                      return <SortableHeader key={columnKey} field="company" label="Компания" columnKey="company" />;
                    }
                    if (columnKey === 'purchaseRequestId') {
                      return <SortableHeader key={columnKey} field="purchaseRequestId" label="Заявка на закупку" columnKey="purchaseRequestId" filterType="text" />;
                    }
                    if (columnKey === 'cfo') {
                      const isDragging = draggedColumn === 'cfo';
                      const isDragOver = dragOverColumn === 'cfo';
                      return (
                      <th 
                        key={columnKey}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'cfo')}
                        onDragOver={(e) => handleDragOver(e, 'cfo')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'cfo')}
                        className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
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
                                  className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg"
                                  data-cfo-filter-menu="true"
                                  style={{
                                    top: `${cfoFilterPosition.top}px`,
                                    left: `${cfoFilterPosition.left}px`,
                                    maxHeight: '400px',
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
                                        className="w-full pl-7 pr-7 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Поиск..."
                                      />
                                      {cfoSearchQuery && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCfoSearchQuery('');
                                          }}
                                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                          title="Очистить поиск"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      )}
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
                                  <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
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
                    if (columnKey === 'purchaseSubject') {
                      return <SortableHeader key={columnKey} field="purchaseSubject" label="Предмет закупки" columnKey="purchaseSubject" filterType="text" />;
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
                          className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${draggedColumn === columnKey ? 'opacity-50' : ''} ${dragOverColumn === columnKey ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
                          style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px`, verticalAlign: 'top' }}
                        >
                          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                              <div className="relative flex-1" style={{ minWidth: 0 }}>
                                <select
                                  value={localFilters.budgetAmountOperator || 'gte'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newValue = e.target.value;
                                    setLocalFilters(prev => ({
                                      ...prev,
                                      budgetAmountOperator: newValue,
                                    }));
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className={`absolute left-0 top-0 h-full text-xs border-0 border-r border-gray-300 rounded-l px-1 py-0 focus:outline-none focus:ring-0 appearance-none cursor-pointer z-10 transition-colors ${
                                    localFilters.budgetAmountOperator && ['gt', 'gte', 'lt', 'lte'].includes(localFilters.budgetAmountOperator)
                                      ? 'bg-blue-500 text-white font-semibold'
                                      : 'bg-gray-50 text-gray-700'
                                  }`}
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
                                    const value = localFilters.budgetAmount || filters.budgetAmount || '';
                                    if (!value) return '';
                                    const numValue = value.toString().replace(/\s/g, '').replace(/,/g, '');
                                    const num = parseFloat(numValue);
                                    if (isNaN(num)) return value;
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
                                    requestAnimationFrame(() => {
                                      const input = e.target as HTMLInputElement;
                                      if (input && document.activeElement === input) {
                                        const length = input.value.length;
                                        input.setSelectionRange(length, length);
                                      }
                                    });
                                  }}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                    setFocusedField('budgetAmount');
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
                                  className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 pl-11 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                              <span className="text-xs font-medium text-gray-500 tracking-wider">Бюджет (UZS)</span>
                            </div>
                          </div>
                          <div
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                            onMouseDown={(e) => handleResizeStart(e, 'budgetAmount')}
                          />
                        </th>
                      );
                    }
                    if (columnKey === 'requestDate') {
                      return (
                        <th
                          key={columnKey}
                          draggable
                          onDragStart={(e) => handleDragStart(e, columnKey)}
                          onDragOver={(e) => handleDragOver(e, columnKey)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, columnKey)}
                          className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-t-2 border-l-2 border-r-2 border-red-500 relative ${draggedColumn === columnKey ? 'opacity-50' : ''} ${dragOverColumn === columnKey ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
                          style={{ width: `${getColumnWidth('requestDate')}px`, minWidth: `${getColumnWidth('requestDate')}px`, maxWidth: `${getColumnWidth('requestDate')}px`, verticalAlign: 'top' }}
                        >
                          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                              <div className="flex-1" style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0 }}></div>
                            </div>
                            <div className="flex items-center gap-1 min-h-[20px]">
                              <button
                                onClick={() => handleSort('requestDate')}
                                className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                                style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                              >
                                {sortField === 'requestDate' ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                                )}
                              </button>
                              <span className="text-xs font-medium text-gray-500 tracking-wider">Дата заявки</span>
                            </div>
                          </div>
                          <div
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                            onMouseDown={(e) => handleResizeStart(e, 'requestDate')}
                          />
                        </th>
                      );
                    }
                    if (columnKey === 'newContractDate') {
                      return <SortableHeader key={columnKey} field="newContractDate" label="Дата завершения закупки" columnKey="newContractDate" />;
                    }
                    if (columnKey === 'comment') {
                      const isDragging = draggedColumn === 'comment';
                      const isDragOver = dragOverColumn === 'comment';
                      return (
                        <th 
                          key={columnKey}
                          draggable
                          onDragStart={(e) => handleDragStart(e, 'comment')}
                          onDragOver={(e) => handleDragOver(e, 'comment')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, 'comment')}
                          className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                          style={{ width: `${getColumnWidth('comment')}px`, minWidth: `${getColumnWidth('comment')}px`, maxWidth: `${getColumnWidth('comment')}px`, verticalAlign: 'top', overflow: 'hidden' }}
                        >
                          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                            <div className="flex items-center gap-1 min-h-[20px]">
                              <span className="text-xs font-medium text-gray-500 tracking-wider">Комментарий</span>
                            </div>
                          </div>
                          <div
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                            onMouseDown={(e) => handleResizeStart(e, 'comment')}
                          />
                        </th>
                      );
                    }
                    if (columnKey === 'status') {
                      const isDragging = draggedColumn === 'status';
                      const isDragOver = dragOverColumn === 'status';
                      return (
                    <th 
                      key={columnKey}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'status')}
                      onDragOver={(e) => handleDragOver(e, 'status')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'status')}
                      className={`px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                      style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px`, verticalAlign: 'top', overflow: 'hidden' }}
                    >
                      <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                        <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%' }}>
                          <div className="relative status-filter-container flex-1">
                            <button
                              ref={statusFilterButtonRef}
                              type="button"
                              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                              className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                              style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
                            >
                              <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                                {statusFilter.size === 0 
                                  ? 'Все' 
                                  : statusFilter.size === 1
                                  ? (Array.from(statusFilter)[0] === 'Пусто' ? 'Пусто' : Array.from(statusFilter)[0] || 'Все')
                                  : `${statusFilter.size} выбрано`}
                              </span>
                              <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isStatusFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isStatusFilterOpen && statusFilterPosition && (
                              <div 
                                className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                                data-status-filter-menu="true"
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
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setStatusSearchQuery(e.target.value);
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
                                  {getFilteredStatusOptions.length === 0 ? (
                                    <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                                  ) : (
                                    getFilteredStatusOptions.map((status) => (
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
                                        <span className="ml-2 text-xs text-gray-700 flex-1">{status === 'Пусто' ? 'Пусто' : status}</span>
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
                            onClick={() => handleSort('status')}
                            className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                            style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                          >
                            {sortField === 'status' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <ArrowDown className="w-3 h-3 flex-shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                            )}
                          </button>
                          <span className="text-xs font-medium text-gray-500 tracking-wider">Статус</span>
                        </div>
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                        onMouseDown={(e) => handleResizeStart(e, 'status')}
                        style={{ zIndex: 10 }}
                      />
                    </th>
                      );
                    }
                    return null;
                  })}
                  <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300" style={{ width: '350px', minWidth: '350px', verticalAlign: 'top', overflow: 'hidden' }}>
                    <div className="flex flex-col" style={{ minWidth: 0, width: '100%', gap: '4px' }}>
                      <div className="flex items-center min-h-[20px]">
                        <div className="flex-1 flex items-end h-20 relative" style={{ minHeight: '80px', height: '80px', paddingLeft: '0', paddingRight: '0', gap: '2px', width: '100%' }}>
                          {getMonthlyDistribution.map((count, index) => {
                            const monthLabels = ['Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Без даты'];
                            const isYearDivider = index === 1;
                            const isNoDate = index === 13;
                            
                            if (isNoDate && count === 0) {
                              return null;
                            }
                            
                            const containerHeight = 80;
                            const topMargin = 2;
                            const availableHeight = containerHeight - topMargin;
                            let columnHeight = 0;
                            if (isNoDate) {
                              columnHeight = availableHeight;
                            } else if (count > 0 && maxCount > 0) {
                              const ratio = count / maxCount;
                              const scaledRatio = Math.pow(ratio, 0.4);
                              columnHeight = scaledRatio * availableHeight;
                              if (columnHeight < 8) {
                                columnHeight = 8;
                              }
                            }
                            
                            // Определяем месяц для фильтрации
                            const displayYear = selectedYear || chartData[0]?.year || new Date().getFullYear();
                            const prevYear = displayYear - 1;
                            
                            let monthForFilter: number | null = null;
                            let yearForFilter: number | null = null;
                            if (index === 0) {
                              // Декабрь предыдущего года
                              monthForFilter = 11;
                              yearForFilter = prevYear;
                            } else if (index >= 1 && index <= 12) {
                              // Месяцы текущего года (index 1 = январь = месяц 0)
                              monthForFilter = index - 1;
                              yearForFilter = displayYear;
                            } else if (index === 13) {
                              // Без даты
                              monthForFilter = -1;
                              yearForFilter = null;
                            }
                            
                            // Проверяем, выбран ли этот месяц и год
                            const monthKey = monthForFilter === -1 ? -1 : (index === 0 ? -2 : monthForFilter); // -2 для декабря предыдущего года
                            // Упрощенная проверка: для месяцев текущего года проверяем только наличие в selectedMonths
                            // Для декабря предыдущего года проверяем также selectedMonthYear
                            const isSelected = monthKey !== null && selectedMonths.has(monthKey) && 
                              (monthForFilter === -1 || 
                               (index === 0 && selectedMonthYear === prevYear) || 
                               (index >= 1 && index <= 12)); // Для месяцев текущего года достаточно наличия в selectedMonths
                            
                            return (
                              <div key={index} className="flex flex-col items-center relative" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '0 0 calc((100% - 24px) / 13)' }}>
                                <div 
                                  className={`w-full rounded-t transition-colors relative group cursor-pointer ${
                                    isNoDate
                                      ? isSelected
                                        ? 'bg-red-700 ring-2 ring-red-400'
                                        : 'bg-red-500 hover:bg-red-600'
                                      : isSelected 
                                        ? 'bg-blue-700 ring-2 ring-blue-400' 
                                        : count > 0 
                                          ? 'bg-blue-500 hover:bg-blue-600' 
                                          : 'bg-gray-200'
                                  }`}
                                  style={{ 
                                    height: `${columnHeight}px`,
                                    minHeight: count > 0 ? '2px' : '0px',
                                    maxHeight: containerHeight + 'px',
                                    flexShrink: 0
                                  }}
                                  title={`${monthLabels[index]}: ${count} закупок`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    if (monthForFilter !== null) {
                                      const currentDisplayYear = selectedYear || chartData[0]?.year || new Date().getFullYear();
                                      const currentPrevYear = currentDisplayYear - 1;
                                      const monthKey = monthForFilter === -1 ? -1 : (index === 0 ? -2 : monthForFilter); // -2 для декабря предыдущего года
                                      // Упрощенная проверка: для месяцев текущего года проверяем только наличие в selectedMonths
                                      // Для декабря предыдущего года проверяем также selectedMonthYear
                                      const isCurrentlySelected = selectedMonths.has(monthKey) && 
                                        (monthForFilter === -1 || 
                                         (index === 0 && selectedMonthYear === currentPrevYear) || 
                                         (index >= 1 && index <= 12)); // Для месяцев текущего года достаточно наличия в selectedMonths
                                      
                                      // Явно проверяем, что Shift нажат
                                      const shiftPressed = Boolean(e.shiftKey);
                                      
                                      // Shift+клик: выбираем диапазон месяцев ТОЛЬКО если Shift явно нажат
                                      if (shiftPressed && lastSelectedMonthIndex !== null && lastSelectedMonthIndex !== index && !isCurrentlySelected) {
                                        // Shift+клик: выбираем диапазон месяцев
                                        const startIndex = Math.min(lastSelectedMonthIndex, index);
                                        const endIndex = Math.max(lastSelectedMonthIndex, index);
                                        const newSelectedMonths = new Set(selectedMonths);
                                        
                                        for (let i = startIndex; i <= endIndex; i++) {
                                          let monthKeyForRange: number;
                                          let yearForRange: number | null = null;
                                          
                                          if (i === 0) {
                                            // Декабрь предыдущего года
                                            monthKeyForRange = -2;
                                            yearForRange = currentPrevYear;
                                          } else if (i >= 1 && i <= 12) {
                                            // Месяцы текущего года
                                            monthKeyForRange = i - 1;
                                            yearForRange = null;
                                          } else if (i === 13) {
                                            // Без даты
                                            monthKeyForRange = -1;
                                            yearForRange = null;
                                          } else {
                                            continue;
                                          }
                                          
                                          newSelectedMonths.add(monthKeyForRange);
                                          
                                          // Устанавливаем selectedMonthYear, если это декабрь предыдущего года
                                          if (i === 0 && yearForRange !== null) {
                                            setSelectedMonthYear(yearForRange);
                                          }
                                        }
                                        
                                        setSelectedMonths(newSelectedMonths);
                                        setLastSelectedMonthIndex(index);
                                        setCurrentPage(0);
                                        return;
                                      }
                                      
                                      // Обычный клик (БЕЗ Shift): выбираем только один месяц (сбрасываем предыдущий выбор)
                                      const newSelectedMonths = new Set<number>();
                                      
                                      if (!isCurrentlySelected) {
                                        // Если месяц не выбран, выбираем только его
                                        newSelectedMonths.add(monthKey);
                                        // Если это декабрь предыдущего года, сохраняем год для фильтрации по месяцу
                                        if (index === 0 && yearForFilter !== null) {
                                          setSelectedMonthYear(yearForFilter);
                                        } else if (index >= 1 && index <= 12) {
                                          // Для месяцев текущего года сбрасываем selectedMonthYear
                                          setSelectedMonthYear(null);
                                          // Для месяцев текущего года устанавливаем текущий год (если он не установлен)
                                          if (yearForFilter !== null && selectedYear === null) {
                                            setSelectedYear(yearForFilter);
                                          }
                                        } else if (monthForFilter === -1) {
                                          // Без даты
                                          setSelectedMonthYear(null);
                                        }
                                      } else {
                                        // Если месяц уже выбран, снимаем выбор (оставляем пустым)
                                        setSelectedMonthYear(null);
                                      }
                                      
                                      setSelectedMonths(newSelectedMonths);
                                      // Устанавливаем lastSelectedMonthIndex только при обычном клике (без Shift)
                                      // Это нужно для последующего Shift+клик выбора диапазона
                                      setLastSelectedMonthIndex(index);
                                      setCurrentPage(0);
                                    }
                                  }}
                                >
                                  {count > 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold whitespace-nowrap pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                      {count}
                                    </div>
                                  )}
                                </div>
                                <div className={`text-[8px] text-center ${isSelected ? 'font-bold text-blue-700' : 'text-gray-500'}`} style={{ lineHeight: '1' }}>
                                  {monthLabels[index]}
                                </div>
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
                {hasData ? data.content.map((item, rowIndex) => {
                  const isInactive = item.status === 'Не Актуальная';
                  const isFirstRow = rowIndex === 0;
                  return (
                    <tr key={item.id} className={isInactive ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}>
                      {columnOrder.filter(col => visibleColumns.has(col)).map((columnKey) => {
                        if (columnKey === 'id') {
                          return (
                            <td key={columnKey} className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 text-center ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('id')}px`, minWidth: `${getColumnWidth('id')}px`, maxWidth: `${getColumnWidth('id')}px` }}>
                              {item.id}
                            </td>
                          );
                        }
                        if (columnKey === 'company') {
                          return (
                            <td key={columnKey} className="px-2 py-2 text-xs border-r border-gray-200 relative" style={{ width: `${getColumnWidth('company')}px`, minWidth: `${getColumnWidth('company')}px`, maxWidth: `${getColumnWidth('company')}px` }}>
                              <span className={`text-xs rounded px-2 py-0.5 font-medium block ${
                                isInactive
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.company || '-'}
                              </span>
                            </td>
                          );
                        }
                        if (columnKey === 'purchaseRequestId') {
                          return (
                            <td key={columnKey} className={`px-2 py-2 text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('purchaseRequestId')}px`, minWidth: `${getColumnWidth('purchaseRequestId')}px`, maxWidth: `${getColumnWidth('purchaseRequestId')}px` }}>
                              {item.purchaseRequestId || '-'}
                            </td>
                          );
                        }
                        if (columnKey === 'cfo') {
                          return (
                            <td key={columnKey} className="px-2 py-2 text-xs border-r border-gray-200 relative" style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px` }}>
                              <span className={`text-xs rounded px-2 py-0.5 font-medium block ${
                                isInactive
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.cfo || '-'}
                              </span>
                            </td>
                          );
                        }
                        if (columnKey === 'purchaseSubject') {
                          return (
                            <td key={columnKey} className={`px-2 py-2 text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('purchaseSubject')}px`, minWidth: `${getColumnWidth('purchaseSubject')}px`, maxWidth: `${getColumnWidth('purchaseSubject')}px` }}>
                              {item.purchaseSubject || '-'}
                            </td>
                          );
                        }
                        if (columnKey === 'budgetAmount') {
                          return (
                            <td key={columnKey} className={`px-2 py-2 whitespace-nowrap text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px` }}>
                              {formatCurrency(item.budgetAmount)}
                            </td>
                          );
                        }
                        if (columnKey === 'requestDate') {
                          return (
                            <td key={columnKey} className={`px-2 py-2 text-xs border-l-2 border-r-2 ${isFirstRow ? 'border-t-2' : ''} border-red-500 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('requestDate')}px`, minWidth: `${getColumnWidth('requestDate')}px`, maxWidth: `${getColumnWidth('requestDate')}px` }}>
                              {formatDate(item.requestDate)}
                            </td>
                          );
                        }
                        if (columnKey === 'newContractDate') {
                          return (
                            <td key={columnKey} className={`px-2 py-2 text-xs border-r border-gray-200 ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('newContractDate')}px`, minWidth: `${getColumnWidth('newContractDate')}px`, maxWidth: `${getColumnWidth('newContractDate')}px` }}>
                              {formatDate(item.newContractDate)}
                            </td>
                          );
                        }
                        if (columnKey === 'status') {
                          return (
                            <td key={columnKey} className="px-2 py-2 text-xs border-r border-gray-200 relative" style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px` }}>
                              {(() => {
                                // Если есть purchaseRequestId, показываем статус "Заявка"
                                const hasPurchaseRequest = item.purchaseRequestId !== null;
                                const displayStatus = hasPurchaseRequest ? 'Заявка' : item.status;
                                
                                return (
                                  <span className={`text-xs rounded px-2 py-0.5 font-medium block ${
                                    displayStatus === 'Актуальная'
                                      ? 'bg-green-100 text-green-800'
                                      : displayStatus === 'Не Актуальная'
                                      ? 'bg-red-100 text-red-800'
                                      : displayStatus === 'Корректировка'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : displayStatus === 'Проект'
                                      ? 'bg-blue-100 text-blue-800'
                                      : displayStatus === 'Заявка'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {displayStatus || '-'}
                                  </span>
                                );
                              })()}
                            </td>
                          );
                        }
                        if (columnKey === 'comment') {
                          return (
                            <td key={columnKey} className={`px-2 py-2 text-xs border-r border-gray-200 relative ${isInactive ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: `${getColumnWidth('comment')}px`, minWidth: `${getColumnWidth('comment')}px`, maxWidth: `${getColumnWidth('comment')}px` }}>
                              {editingComment === item.id ? (
                                <div className="relative">
                                  <textarea
                                    ref={commentInputRef}
                                    defaultValue={item.comment || ''}
                                    onBlur={(e) => {
                                      const newValue = e.target.value.trim();
                                      const currentValue = item.comment || '';
                                      if (newValue !== currentValue) {
                                        handleCommentUpdate(item.id, newValue);
                                      } else {
                                        setEditingComment(null);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        setEditingComment(null);
                                      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        const newValue = e.currentTarget.value.trim();
                                        const currentValue = item.comment || '';
                                        if (newValue !== currentValue) {
                                          handleCommentUpdate(item.id, newValue);
                                        } else {
                                          setEditingComment(null);
                                        }
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-xs border border-blue-500 rounded px-2 py-1 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                    rows={3}
                                    style={{ minHeight: '60px' }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (commentInputRef.current) {
                                        const newValue = commentInputRef.current.value.trim();
                                        const currentValue = item.comment || '';
                                        if (newValue !== currentValue) {
                                          handleCommentUpdate(item.id, newValue);
                                        } else {
                                          setEditingComment(null);
                                        }
                                      }
                                    }}
                                    className="absolute bottom-2 right-2 p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
                                    style={{ width: '24px', height: '24px' }}
                                    title="Сохранить (Ctrl+Enter)"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isInactive) {
                                      setEditingComment(item.id);
                                    }
                                  }}
                                  className={`text-xs rounded px-2 py-1 cursor-pointer min-h-[60px] ${
                                    isInactive
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                      : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                                  }`}
                                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                >
                                  {item.comment || '-'}
                                </div>
                              )}
                            </td>
                          );
                        }
                        return null;
                      })}
                      <td 
                        className="px-1 py-1 border-r border-gray-200 overflow-hidden relative" 
                        style={{ width: '350px', minWidth: '350px', contain: 'layout style paint' }}
                      >
                        <div className="relative w-full overflow-hidden" style={{ contain: 'layout style paint' }}>
                          <GanttChart
                            itemId={item.id}
                            year={item.year}
                            requestDate={item.requestDate}
                            newContractDate={item.newContractDate}
                            contractEndDate={item.contractEndDate}
                            currentContractEndDate={item.currentContractEndDate}
                            disabled={true}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={columnOrder.filter(col => visibleColumns.has(col)).length + 1} className="px-6 py-8 text-center text-gray-500">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
