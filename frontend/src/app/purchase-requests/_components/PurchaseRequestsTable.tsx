'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import { copyToClipboard } from '@/utils/clipboard';
import { Clock, Check, Eye, EyeOff, Settings, Star } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import PurchaseRequestsSummaryTable from './ui/PurchaseRequestsSummaryTable';
import LatestCsiFeedback from './ui/LatestCsiFeedback';
import PurchaseRequestsTableHeader from './ui/PurchaseRequestsTableHeader';
import PurchaseRequestsTableTabs from './ui/PurchaseRequestsTableTabs';
import PurchaseRequestsTableColumnsHeader from './ui/PurchaseRequestsTableColumnsHeader';
import PurchaseRequestsTableBody from './ui/PurchaseRequestsTableBody';
import RatingEmailModal from './ui/modals/RatingEmailModal';
import FeedbackDetailsModal from './ui/modals/FeedbackDetailsModal';
import SentInvitationModal from './ui/modals/SentInvitationModal';
import type { Contract, PurchaseRequest, PageResponse, SortField, SortDirection, TabType } from './types/purchase-request.types';
import { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS, COLUMNS_VISIBILITY_STORAGE_KEY } from './constants/columns.constants';
import { ALL_STATUSES, DEFAULT_STATUSES, TAB_STATUSES } from './constants/status.constants';
import { getCurrencyIcon } from './utils/currency.utils';
import { normalizePurchaserName } from './utils/normalizePurchaser';
import { copyRatingEmail } from './utils/ratingEmail';
import { usePurchaseRequestsTable } from './hooks/usePurchaseRequestsTable';
import { useUserRole } from './hooks/useUserRole';
import { useRatingModal } from './hooks/useRatingModal';
import { useLocalStorageSync } from './hooks/useLocalStorageSync';
import { useMetadata } from './hooks/useMetadata';
import { useSummary } from './hooks/useSummary';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';

export default function PurchaseRequestsTable() {
  // Используем главный композиционный хук
  const table = usePurchaseRequestsTable();

  // Деструктурируем для удобного доступа
  const {
    data, setData,
    allItems, setAllItems,
    loading, loadingMore,
    error,
    currentPage, setCurrentPage,
    pageSize,
    hasMore,
    loadMoreRef,
    selectedYear, setSelectedYear,
    totalRecords, setTotalRecords,
    userRole, setUserRole,
    sortField, setSortField,
    sortDirection, setSortDirection,
    currentYear,
    abortControllerRef,
    filtersStateRef,
    fetchData,
    handleSort,
    router,
    filters: filtersHook,
    columns: columnsHook,
    modals: modalsHook,
  } = table;

  // Извлекаем переменные из вложенных хуков для краткости
  const {
    activeTab, setActiveTab, activeTabRef,
    tabCounts, setTabCounts,
    filters: filtersFromHook, setFilters,
    localFilters, setLocalFilters,
    cfoFilter, setCfoFilter,
    statusFilter, setStatusFilter,
    purchaserFilter, setPurchaserFilter,
    isCfoFilterOpen, setIsCfoFilterOpen,
    isStatusFilterOpen, setIsStatusFilterOpen,
    isPurchaserFilterOpen, setIsPurchaserFilterOpen,
    cfoSearchQuery, setCfoSearchQuery,
    statusSearchQuery, setStatusSearchQuery,
    purchaserSearchQuery, setPurchaserSearchQuery,
    focusedField, setFocusedField,
    forceReload, setForceReload,
  } = filtersHook;

  const {
    visibleColumns, setVisibleColumns,
    toggleColumnVisibility,
    selectAllColumns, selectDefaultColumns,
    columnOrder, setColumnOrder,
    columnWidths,
    getColumnWidth, getDefaultColumnWidth,
    isResizing,
    handleResizeStart,
    draggedColumn, dragOverColumn,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    isColumnsMenuOpen, setIsColumnsMenuOpen,
    columnsMenuPosition, setColumnsMenuPosition,
    columnsMenuButtonRef,
  } = columnsHook;

  const {
    isRatingModalOpen, setIsRatingModalOpen,
    selectedRequestForRating, setSelectedRequestForRating,
    selectedUserEmail, setSelectedUserEmail,
    selectedUser, setSelectedUser,
    userSearchQuery, setUserSearchQuery,
    userSuggestions, setUserSuggestions,
    showUserSuggestions, setShowUserSuggestions,
    emailText, setEmailText,
    userSearchRef,
    isSentInvitationModalOpen, setIsSentInvitationModalOpen,
    sentInvitationDetails, setSentInvitationDetails,
    isFeedbackDetailsModalOpen, setIsFeedbackDetailsModalOpen,
    selectedRequestForFeedback, setSelectedRequestForFeedback,
    feedbackDetails, setFeedbackDetails,
    loadingFeedbackDetails, setLoadingFeedbackDetails,
  } = modalsHook;

  // Используем хук для работы с ролью пользователя
  const { userRole: userRoleFromHook, canEditExcludeFromInWork } = useUserRole();
  
  // Синхронизируем с состоянием из usePurchaseRequestsTable
  useEffect(() => {
    if (userRoleFromHook !== null && userRoleFromHook !== userRole) {
      setUserRole(userRoleFromHook);
    }
  }, [userRoleFromHook, userRole, setUserRole]);
  
  // Используем хук для работы с модалкой рейтинга
  const { generateEmailText } = useRatingModal(
    isRatingModalOpen,
    selectedRequestForRating,
    selectedUser,
    selectedUserEmail,
    userSearchQuery,
    userSuggestions,
    showUserSuggestions,
    setUserSuggestions,
    setShowUserSuggestions,
    setSelectedUser,
    setUserSearchQuery,
    setSelectedUserEmail,
    setEmailText,
    userSearchRef
  );
  
  // Позиции для выпадающих списков
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusFilterPosition, setStatusFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [purchaserFilterPosition, setPurchaserFilterPosition] = useState<{ top: number; left: number } | null>(null);
  
  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement>(null);
  const purchaserFilterButtonRef = useRef<HTMLButtonElement>(null);
  
  // Используем хук для синхронизации с localStorage
  const { filtersLoadedRef, yearRestored, setYearRestored } = useLocalStorageSync({
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
  });


  // Ref для хранения функции fetchTabCounts, чтобы избежать бесконечных циклов
  const fetchTabCountsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  
  
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

  // Обновляем позицию при открытии фильтра Закупщик
  useEffect(() => {
    if (isPurchaserFilterOpen && purchaserFilterButtonRef.current) {
      const position = calculateFilterPosition(purchaserFilterButtonRef);
      setPurchaserFilterPosition(position);
    }
  }, [isPurchaserFilterOpen, calculateFilterPosition]);

  
  // Функция для загрузки количества записей по всем вкладкам с бэкенда
  const fetchTabCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedYear !== null) {
        params.append('year', String(selectedYear));
      }
      
      // Применяем другие фильтры (кроме статуса, так как статусы определяются вкладками)
      if (filtersFromHook.idPurchaseRequest && filtersFromHook.idPurchaseRequest.trim() !== '') {
        const idValue = parseInt(filtersFromHook.idPurchaseRequest.trim(), 10);
        if (!isNaN(idValue)) {
          params.append('idPurchaseRequest', String(idValue));
        }
      }
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }
      if (purchaserFilter.size > 0) {
        purchaserFilter.forEach(p => {
          params.append('purchaser', p);
        });
      }
      if (filtersFromHook.name && filtersFromHook.name.trim() !== '') {
        params.append('name', filtersFromHook.name.trim());
      }
      const budgetOperator = localFilters.budgetAmountOperator || filtersFromHook.budgetAmountOperator;
      const budgetAmount = localFilters.budgetAmount || filtersFromHook.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }
      if (filtersFromHook.costType && filtersFromHook.costType.trim() !== '') {
        params.append('costType', filtersFromHook.costType.trim());
      }
      if (filtersFromHook.contractType && filtersFromHook.contractType.trim() !== '') {
        params.append('contractType', filtersFromHook.contractType.trim());
      }
      if (filtersFromHook.requiresPurchase && filtersFromHook.requiresPurchase.trim() !== '') {
        const requiresPurchaseValue = filtersFromHook.requiresPurchase.trim();
        if (requiresPurchaseValue === 'Закупка') {
          params.append('requiresPurchase', 'true');
        } else if (requiresPurchaseValue === 'Заказ') {
          params.append('requiresPurchase', 'false');
        }
      }
      
      const fetchUrl = `${getBackendUrl()}/api/purchase-requests/tab-counts?${params.toString()}`;
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const result = await response.json();
        
        // Отдельный запрос для подсчета скрытых заявок
        const hiddenParams = new URLSearchParams(params);
        hiddenParams.append('excludeFromInWork', 'true');
        hiddenParams.append('size', '1'); // Минимальный размер для подсчета
        hiddenParams.append('page', '0');
        const hiddenFetchUrl = `${getBackendUrl()}/api/purchase-requests?${hiddenParams.toString()}`;
        
        let hiddenCount = 0;
        try {
          const hiddenResponse = await fetch(hiddenFetchUrl);
          if (hiddenResponse.ok) {
            const hiddenResult = await hiddenResponse.json();
            hiddenCount = hiddenResult.totalElements || 0;
          }
        } catch (err) {
          console.error('Error fetching hidden count:', err);
        }
        
        setTabCounts({
          'all': result['all'] || 0,
          'in-work': result['in-work'] || 0,
          'completed': result['completed'] || 0,
          'project-rejected': result['project-rejected'] || 0,
          'hidden': hiddenCount,
        });
      }
    } catch (err) {
      console.error('Error fetching tab counts:', err);
    }
  }, [selectedYear, filtersFromHook, cfoFilter, purchaserFilter, localFilters]);
  
  // Сохраняем функцию в ref для использования в других useEffect
  useEffect(() => {
    fetchTabCountsRef.current = fetchTabCounts;
  }, [fetchTabCounts]);
  
  // Загружаем количество для всех вкладок
  useEffect(() => {
    if (!filtersLoadedRef.current) {
      return;
    }
    
    // Используем ref для вызова функции, чтобы избежать бесконечных циклов
    if (fetchTabCountsRef.current) {
      fetchTabCountsRef.current();
    }
  }, [selectedYear, filtersFromHook, cfoFilter, purchaserFilter, localFilters]);

  // Автоматическое переключение на вкладку с записями, если текущая вкладка пуста
  useEffect(() => {
    // Проверяем, что количество записей загружено для всех вкладок
    const allCountsLoaded = Object.values(tabCounts).every(count => count !== null);
    
    if (allCountsLoaded) {
      // Если активная вкладка имеет 0 записей, переключаемся на первую вкладку с записями
      if (tabCounts[activeTab] === 0) {
        // Приоритет переключения: in-work -> completed -> all -> project-rejected -> hidden
        const tabsOrder: TabType[] = ['in-work', 'completed', 'all', 'project-rejected', 'hidden'];
        const tabWithRecords = tabsOrder.find(tab => tabCounts[tab] !== null && tabCounts[tab]! > 0);
        
        if (tabWithRecords) {
          setActiveTab(tabWithRecords);
          setStatusFilter(new Set());
          setPurchaserFilter(new Set());
          setCfoFilter(new Set());
          setCurrentPage(0);
          setAllItems([]);
        }
      }
    }
  }, [tabCounts, activeTab]);
  
  // Автоматическое управление видимостью колонки "rating" при переключении вкладок
  useEffect(() => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (activeTab === 'completed') {
        // Для вкладки "Завершенные" добавляем колонку "rating" и убираем "track" и "daysSinceCreation"
        newSet.add('rating');
        newSet.delete('track');
        newSet.delete('daysSinceCreation');
      } else {
        // Для других вкладок убираем колонку "rating"
        newSet.delete('rating');
      }
      return newSet;
    });
  }, [activeTab]);


  // Логика восстановления и сохранения фильтров теперь в хуке useLocalStorageSync



  // Debounce для текстовых фильтров и фильтра бюджета (как в PurchasePlanItemsTable)
  useEffect(() => {
    const textFields = [
      'idPurchaseRequest', 
      'name', 
      'contractDurationMonths',
      'guid',
      'purchaseRequestPlanYear',
      'company',
      'mcc',
      'purchaseRequestInitiator',
      'purchaseRequestCreationDate',
      'createdAt',
      'updatedAt',
      'title',
      'innerId',
      'budgetAmount'
    ];
    const hasTextChanges = textFields.some(f => localFilters[f] !== filtersFromHook[f]);
    if (hasTextChanges) {
      const input = focusedField ? document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement : null;
      const cursorPosition = input ? input.selectionStart || 0 : null;

      const timer = setTimeout(() => {
        setFilters(prev => { const updated = {...prev}; textFields.forEach(f => updated[f] = localFilters[f] || ''); return updated; });
        setCurrentPage(0);

        if (focusedField && cursorPosition !== null) {
          setTimeout(() => {
            const inputAfter = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
            if (inputAfter) { inputAfter.focus(); const pos = Math.min(cursorPosition, inputAfter.value.length); inputAfter.setSelectionRange(pos,pos); }
          },0);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localFilters, filtersFromHook, setCurrentPage, focusedField]);

  // Убрали useEffect, который устанавливал DEFAULT_STATUSES - теперь фильтр по умолчанию пустой

  // Стабилизируем строковые представления фильтров через useMemo, чтобы избежать лишних обновлений
  const cfoFilterStr = useMemo(() => Array.from(cfoFilter).sort().join(','), [cfoFilter]);
  const purchaserFilterStr = useMemo(() => Array.from(purchaserFilter).sort().join(','), [purchaserFilter]);
  const statusFilterStr = useMemo(() => Array.from(statusFilter).sort().join(','), [statusFilter]);

  // Стабилизируем объект filters через JSON.stringify для корректного сравнения
  const filtersStr = useMemo(() => JSON.stringify(filtersFromHook), [filtersFromHook]);

  useEffect(() => {
    // Не загружаем данные до тех пор, пока фильтры не загружены из localStorage
    if (!filtersLoadedRef.current) {
      console.log('Skipping fetchData - filters not loaded yet');
      return;
    }
    
    // Проверяем, есть ли navigationData, который еще не был обработан
    // Если есть, не вызываем fetchData сразу - дождемся восстановления года
    const navigationDataStr = localStorage.getItem('purchaseRequestNavigation');
    if (navigationDataStr && !yearRestored) {
      try {
        const navigationData = JSON.parse(navigationDataStr);
        if (navigationData.selectedYear !== undefined && navigationData.selectedYear !== null) {
          console.log('Skipping fetchData - waiting for year restoration from navigation data');
          return;
        }
      } catch (err) {
        // Игнорируем ошибки парсинга
      }
    }
    
    console.log('useEffect fetchData triggered with selectedYear:', selectedYear, 'activeTab:', activeTab);
    // При изменении фильтров или сбросе начинаем с первой страницы
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
    fetchData(0, pageSize, selectedYear, sortField, sortDirection, filtersFromHook, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageSize,
    selectedYear,
    sortField,
    sortDirection,
    filtersStr,
    yearRestored,
    cfoFilter.size,
    cfoFilterStr,
    purchaserFilter.size,
    purchaserFilterStr,
    statusFilter.size,
    statusFilterStr,
    activeTab, // ВАЖНО: добавлен activeTab, чтобы fetchData вызывался при переключении вкладок
    forceReload, // Добавлен forceReload для принудительной перезагрузки при сбросе фильтров
  ]);

  // Infinite scroll - используем хук
  useInfiniteScroll(loadMoreRef, {
    enabled: !loading && !loadingMore && hasMore && allItems.length > 0,
    onLoadMore: useCallback(() => {
      if (hasMore && !loadingMore && allItems.length > 0) {
        const nextPage = currentPage + 1;
        console.log('Loading next page:', nextPage, 'current items:', allItems.length);
        // Объединяем filtersFromHook и localFilters
        const mergedFilters = { ...filtersFromHook, ...localFilters };
        fetchData(
          nextPage,
          pageSize,
          selectedYear,
          sortField,
          sortDirection,
          mergedFilters,
          true // append = true для добавления данных
        );
        setCurrentPage(nextPage);
      }
    }, [hasMore, loadingMore, allItems.length, currentPage, filtersFromHook, localFilters, selectedYear, sortField, sortDirection, pageSize, fetchData, setCurrentPage]),
    threshold: 0.1,
  });

  // Отдельный useEffect для перезапуска fetchData после восстановления года из navigationData
  // Это нужно, чтобы убедиться, что данные загружаются с правильным годом
  useEffect(() => {
    // Проверяем, был ли год восстановлен из navigationData и загружены ли фильтры
    if (yearRestored && filtersLoadedRef.current && selectedYear !== null) {
      console.log('Year was restored, re-fetching data with selectedYear:', selectedYear);
      // Небольшая задержка, чтобы убедиться, что selectedYear обновился
      const timeoutId = setTimeout(() => {
        // Объединяем filtersFromHook и localFilters
        const mergedFilters = { ...filtersFromHook, ...localFilters };
        fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, mergedFilters);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearRestored, selectedYear, currentPage, pageSize, sortField, sortDirection, filtersStr]); // Зависимость от yearRestored и selectedYear

  // Восстановление фокуса после обновления localFilters
  // Отключено, чтобы не прерывать ввод текста - React сам правильно обрабатывает фокус и курсор
  // (как в PurchasePlanItemsTable)
  // useEffect(() => {
  //   if (focusedField) {
  //     const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
  //     if (input) {
  //       // Сохраняем позицию курсора (только для текстовых полей)
  //       const cursorPosition = input.type === 'number' ? null : (input.selectionStart || 0);
  //       const currentValue = input.value;
  //       
  //       // Восстанавливаем фокус в следующем тике, чтобы не мешать текущему вводу
  //       requestAnimationFrame(() => {
  //         const inputAfterRender = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
  //         if (inputAfterRender) {
  //           // Для фильтра бюджета проверяем, что неотформатированное значение совпадает
  //           if (focusedField === 'budgetAmount') {
  //             const currentRawValue = currentValue.replace(/\s/g, '').replace(/,/g, '');
  //             const afterRenderRawValue = inputAfterRender.value.replace(/\s/g, '').replace(/,/g, '');
  //             if (currentRawValue === afterRenderRawValue) {
  //               inputAfterRender.focus();
  //               // Для бюджета устанавливаем курсор в конец
  //               const length = inputAfterRender.value.length;
  //               inputAfterRender.setSelectionRange(length, length);
  //             }
  //           } else if (inputAfterRender.value === currentValue) {
  //             inputAfterRender.focus();
  //             // Восстанавливаем позицию курсора только для текстовых полей
  //             if (inputAfterRender.type !== 'number' && cursorPosition !== null) {
  //               const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
  //               inputAfterRender.setSelectionRange(newPosition, newPosition);
  //             }
  //           }
  //         }
  //       });
  //     }
  //   }
  // }, [localFilters, focusedField]);

  // Восстановление фокуса после загрузки данных
  useEffect(() => {
    if (focusedField) {
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input) { const val = localFilters[focusedField] || ''; if (input.value === val) { input.focus(); input.setSelectionRange(val.length,val.length); } }
      },50);
      return () => clearTimeout(timer);
    }
  }, [focusedField, localFilters]);

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

  // Используем хуки для метаданных и summary
  const { allYears, uniqueValues } = useMetadata();
  const { summaryData, setSummaryData, purchaserSummary } = useSummary({
    filtersFromHook,
    localFilters,
    cfoFilter,
    filtersLoadedRef,
  });
  
  // Уникальные статусы из текущих данных (с учетом вкладки и фильтров)
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  // Загружаем общее количество записей без фильтров
  useEffect(() => {
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/purchase-requests?page=0&size=1`);
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

  // Логика метаданных теперь в хуке useMetadata

  // Получаем уникальные статусы из данных на текущей вкладке БЕЗ учета фильтра по статусу
  // Это гарантирует, что в фильтре показываются только те статусы, которые реально есть в данных текущей вкладки
  useEffect(() => {
    const fetchAvailableStatuses = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000'); // Загружаем достаточно данных для получения всех статусов

        // Учитываем год, если выбран
        if (selectedYear !== null) {
          params.append('year', String(selectedYear));
        }

        // Добавляем все фильтры, КРОМЕ фильтра по статусу
        if (filtersFromHook.idPurchaseRequest && filtersFromHook.idPurchaseRequest.trim() !== '') {
          const idValue = parseInt(filtersFromHook.idPurchaseRequest.trim(), 10);
          if (!isNaN(idValue)) {
            params.append('idPurchaseRequest', String(idValue));
          }
        }

        // Фильтр по ЦФО
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => {
            params.append('cfo', cfo);
          });
        }

        // Фильтр по закупщику
        if (purchaserFilter.size > 0) {
          purchaserFilter.forEach(p => {
            params.append('purchaser', p);
          });
        }

        if (filtersFromHook.name && filtersFromHook.name.trim() !== '') {
          params.append('name', filtersFromHook.name.trim());
        }

        // Фильтр по бюджету
        const budgetOperator = localFilters.budgetAmountOperator || filtersFromHook.budgetAmountOperator;
        const budgetAmount = localFilters.budgetAmount || filtersFromHook.budgetAmount;
        if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
          const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
          if (!isNaN(budgetValue) && budgetValue >= 0) {
            params.append('budgetAmountOperator', budgetOperator.trim());
            params.append('budgetAmount', String(budgetValue));
          }
        }

        if (filtersFromHook.costType && filtersFromHook.costType.trim() !== '') {
          params.append('costType', filtersFromHook.costType.trim());
        }

        if (filtersFromHook.contractType && filtersFromHook.contractType.trim() !== '') {
          params.append('contractType', filtersFromHook.contractType.trim());
        }

        if (filtersFromHook.requiresPurchase && filtersFromHook.requiresPurchase.trim() !== '') {
          const requiresPurchaseValue = filtersFromHook.requiresPurchase.trim();
          if (requiresPurchaseValue === 'Закупка') {
            params.append('requiresPurchase', 'true');
          } else if (requiresPurchaseValue === 'Заказ') {
            params.append('requiresPurchase', 'false');
          }
        }

        // Учитываем текущую вкладку (но НЕ фильтр по статусу)
        if (activeTab === 'hidden') {
          params.append('excludeFromInWork', 'true');
        } else {
          // Для вкладок, кроме 'all', применяем фильтр по статусам вкладки
          if (activeTab !== 'all') {
            TAB_STATUSES[activeTab].forEach(status => {
              params.append('status', status);
            });
          }

          if (activeTab === 'in-work') {
            params.append('excludeFromInWork', 'false');
          }
        }

        const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
        const response = await fetch(fetchUrl);

        if (response.ok) {
          const result = await response.json();
          const items = result.content || [];

          // Извлекаем уникальные статусы из полученных данных
          const statusSet = new Set<string>();
          items.forEach((request: PurchaseRequest) => {
            if (request.status) {
              const statusStr = String(request.status).trim();
              if (statusStr) {
                statusSet.add(statusStr);
              }
            }
          });

          const statusesArray = Array.from(statusSet).sort();
          setAvailableStatuses(statusesArray);
        } else {
          setAvailableStatuses([]);
        }
      } catch (err) {
        console.error('Error fetching available statuses:', err);
        setAvailableStatuses([]);
      }
    };

    fetchAvailableStatuses();
  }, [
    activeTab,
    selectedYear,
    filtersFromHook.idPurchaseRequest,
    filtersFromHook.name,
    filtersFromHook.costType,
    filtersFromHook.contractType,
    filtersFromHook.requiresPurchase,
    localFilters.budgetAmount,
    localFilters.budgetAmountOperator,
    cfoFilterStr,
    purchaserFilterStr,
    // НЕ включаем statusFilterStr в зависимости, чтобы статусы обновлялись независимо от фильтра по статусу
  ]);

  // Загружаем данные для сводной таблицы (аналогично purchase-plan)

  // Логика summary теперь в хуке useSummary



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
      setAllItems([]); // Очищаем накопленные данные
    }
  };

  const getUniqueValues = (field: keyof PurchaseRequest): string[] => {
    const fieldMap: Record<string, keyof typeof uniqueValues> = {
      cfo: 'cfo',
      purchaseRequestInitiator: 'purchaseRequestInitiator',
      purchaser: 'purchaser',
      costType: 'costType',
      contractType: 'contractType',
      status: 'status',
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
    setAllItems([]); // Очищаем накопленные данные
  };

  const handleCfoDeselectAll = () => {
    setCfoFilter(new Set());
    setFilters(prev => ({ ...prev, cfo: '' }));
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
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
    setAllItems([]); // Очищаем накопленные данные
  };

  const handlePurchaserSelectAll = () => {
    const allPurchasers = getUniqueValues('purchaser');
    setPurchaserFilter(new Set(allPurchasers));
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  };

  const handlePurchaserDeselectAll = () => {
    setPurchaserFilter(new Set());
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  };

  const handleStatusSelectAll = () => {
    const allStatuses = getUniqueValues('status');
    const newSet = new Set(allStatuses);
    setStatusFilter(newSet);
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
  };

  const handleStatusDeselectAll = () => {
    setStatusFilter(new Set());
    setStatusSearchQuery(''); // Очищаем поисковый запрос, чтобы показать все статусы
    setCurrentPage(0);
    setAllItems([]); // Очищаем накопленные данные
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
      if (isPurchaserFilterOpen && !target.closest('.purchaser-filter-container')) {
        setIsPurchaserFilterOpen(false);
      }
    };

    if (isCfoFilterOpen || isStatusFilterOpen || isPurchaserFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCfoFilterOpen, isStatusFilterOpen, isPurchaserFilterOpen]);

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

  const getFilteredPurchaserOptions = useMemo(() => {
    const allPurchasers = uniqueValues.purchaser || [];
    if (!purchaserSearchQuery || !purchaserSearchQuery.trim()) {
      return allPurchasers;
    }
    const searchLower = purchaserSearchQuery.toLowerCase().trim();
    return allPurchasers.filter(p => {
      if (!p) return false;
      return p.toLowerCase().includes(searchLower);
    });
  }, [purchaserSearchQuery, uniqueValues.purchaser]);

  // Обновляем columnOrder, когда добавляются новые колонки
  useEffect(() => {
    const missingColumns = Array.from(visibleColumns).filter(col => !columnOrder.includes(col));
    if (missingColumns.length > 0) {
      setColumnOrder(prev => {
        const newOrder = [...prev];
        // Добавляем недостающие колонки перед track, если он есть
        const trackIndex = newOrder.indexOf('track');
        if (trackIndex !== -1) {
          newOrder.splice(trackIndex, 0, ...missingColumns);
        } else {
          newOrder.push(...missingColumns);
        }
        // Сохраняем в localStorage
        try {
          localStorage.setItem('purchaseRequestsTableColumnOrder', JSON.stringify(newOrder));
        } catch (err) {
          console.error('Error saving column order:', err);
        }
        return newOrder;
      });
    }
  }, [visibleColumns, columnOrder]);

  // Фильтруем columnOrder, чтобы показывать только видимые колонки
  const filteredColumnOrder = useMemo(() => {
    let filtered = columnOrder.filter(columnKey => visibleColumns.has(columnKey));
    
    // Для вкладки "Завершенные" убираем колонки "track" и "daysSinceCreation", добавляем "rating"
    if (activeTab === 'completed') {
      filtered = filtered.filter(col => col !== 'track' && col !== 'daysSinceCreation');
      if (!filtered.includes('rating') && visibleColumns.has('rating')) {
        // Добавляем колонку "rating" в конец, если она видима
        filtered.push('rating');
      }
    } else {
      // Для других вкладок убираем колонку "rating"
      filtered = filtered.filter(col => col !== 'rating');
    }
    
    return filtered;
  }, [columnOrder, visibleColumns, activeTab]);

  const getFilteredStatusOptions = useMemo(() => {
    // Используем только статусы, которые есть в текущих данных таблицы (с учетом вкладки и всех фильтров, кроме фильтра по статусу)
    // Это гарантирует, что в фильтре показываются только те статусы, которые реально есть в данных текущей вкладки
    const statuses = availableStatuses.length > 0 ? availableStatuses : (uniqueValues.status || []);
    if (!statusSearchQuery || !statusSearchQuery.trim()) {
      return statuses;
    }
    const searchLower = statusSearchQuery.toLowerCase().trim();
    return statuses.filter(status => {
      if (!status) return false;
      return status.toLowerCase().includes(searchLower);
    });
  }, [statusSearchQuery, availableStatuses, uniqueValues.status]);

  // Проверяем, есть ли данные для отображения
  const hasData = allItems && allItems.length > 0;

  // Обработчик для сброса фильтров
  const handleResetFilters = useCallback(() => {
    const emptyFilters = {
      idPurchaseRequest: '',
      cfo: '',
      purchaseRequestInitiator: '',
      purchaser: '',
      name: '',
      budgetAmount: '',
      budgetAmountOperator: 'gte',
      costType: '',
      contractType: '',
      contractDurationMonths: '',
      isPlanned: '',
      requiresPurchase: '',
      status: '',
    };
    localStorage.removeItem('purchaseRequestNavigation');
    setFilters(emptyFilters);
    setLocalFilters(emptyFilters);
    setCfoFilter(new Set());
    setStatusFilter(new Set());
    setCfoSearchQuery('');
    setStatusSearchQuery('');
    setPurchaserFilter(new Set());
    setPurchaserSearchQuery('');
    setSelectedYear(null);
    setSortField('idPurchaseRequest');
    setSortDirection('desc');
    setFocusedField(null);
    setCurrentPage(0);
    setAllItems([]);
    setYearRestored(false);
    const newTab = 'in-work';
    setActiveTab(newTab);
    activeTabRef.current = newTab;
    setForceReload(prev => prev + 1);
  }, [setFilters, setLocalFilters, setCfoFilter, setStatusFilter, setCfoSearchQuery, setStatusSearchQuery, setPurchaserFilter, setPurchaserSearchQuery, setSelectedYear, setSortField, setSortDirection, setFocusedField, setCurrentPage, setAllItems, setYearRestored, setActiveTab, activeTabRef, setForceReload]);

  // Обработчик для изменения года
  const handleYearChange = useCallback((year: number | null) => {
    setSelectedYear(year);
    setCurrentPage(0);
    setAllItems([]);
  }, [setSelectedYear, setCurrentPage, setAllItems]);

  // Обработчик для переключения вкладки
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setStatusFilter(new Set());
    setPurchaserFilter(new Set());
    setCfoFilter(new Set());
    setCurrentPage(0);
    setAllItems([]);
  }, [setActiveTab, setStatusFilter, setPurchaserFilter, setCfoFilter, setCurrentPage, setAllItems]);

  // Обработчики для фокуса в полях фильтров
  const handleFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, [setFocusedField]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && 
          activeElement !== e.target && 
          !activeElement.closest('input[data-filter-field]') &&
          !activeElement.closest('select')) {
        setFocusedField(null);
      }
    }, 200);
  }, [setFocusedField]);

  // Обработчик для изменения локальных фильтров
  const handleLocalFiltersChange = useCallback((updater: (prev: Record<string, string>) => Record<string, string>) => {
    setLocalFilters(updater);
  }, [setLocalFilters]);

  // Обработчик для клика на строку таблицы
  const handleRowClick = useCallback((request: PurchaseRequest, index: number) => {
    try {
      const filtersToSave = {
        filters: filtersFromHook,
        localFilters,
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        selectedYear,
        sortField,
        sortDirection,
        currentPage,
        pageSize,
        cfoSearchQuery,
        statusSearchQuery,
      };
      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
      
      const navigationData = {
        currentIndex: index,
        page: currentPage,
        pageSize: pageSize,
        filters: filtersFromHook,
        localFilters: localFilters,
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        selectedYear: selectedYear,
        sortField: sortField,
        sortDirection: sortDirection,
        totalElements: data?.totalElements || 0,
      };
      localStorage.setItem('purchaseRequestNavigation', JSON.stringify(navigationData));
      console.log('Navigation data saved with year:', selectedYear, 'navigationData:', navigationData);
    } catch (err) {
      console.error('Error saving navigation data:', err);
    }
    router.push(`/purchase-request/${request.id}`);
  }, [filtersFromHook, localFilters, cfoFilter, statusFilter, selectedYear, sortField, sortDirection, currentPage, pageSize, cfoSearchQuery, statusSearchQuery, data, router]);

  // Обработчик для клика колесиком мыши на строку таблицы
  const handleRowAuxClick = useCallback((request: PurchaseRequest, index: number) => {
    try {
      const filtersToSave = {
        filters: filtersFromHook,
        localFilters,
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        selectedYear,
        sortField,
        sortDirection,
        currentPage,
        pageSize,
        cfoSearchQuery,
        statusSearchQuery,
      };
      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filtersToSave));
      
      const navigationData = {
        currentIndex: currentPage * pageSize + index,
        page: currentPage,
        pageSize: pageSize,
        filters: filtersFromHook,
        localFilters: localFilters,
        cfoFilter: Array.from(cfoFilter),
        statusFilter: Array.from(statusFilter),
        selectedYear: selectedYear,
        sortField: sortField,
        sortDirection: sortDirection,
        totalElements: data?.totalElements || 0,
      };
      localStorage.setItem('purchaseRequestNavigation', JSON.stringify(navigationData));
      console.log('Navigation data saved with year:', selectedYear, 'navigationData:', navigationData);
    } catch (err) {
      console.error('Error saving navigation data:', err);
    }
    window.open(`/purchase-request/${request.id}`, '_blank');
  }, [filtersFromHook, localFilters, cfoFilter, statusFilter, selectedYear, sortField, sortDirection, currentPage, pageSize, cfoSearchQuery, statusSearchQuery, data]);

  // Обработчик для изменения excludeFromInWork
  const handleExcludeFromInWorkChange = useCallback(async (requestId: number, newValue: boolean) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-requests/${requestId}/exclude-from-in-work`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole || 'user',
        },
        body: JSON.stringify({ excludeFromInWork: newValue }),
      });
      if (response.ok) {
        const updated = await response.json();
        setAllItems(prev => 
          prev.map(item => 
            item.idPurchaseRequest === requestId 
              ? { ...item, excludeFromInWork: updated.excludeFromInWork }
              : item
          )
        );
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
        alert(errorData.message || 'Не удалось обновить видимость заявки');
        console.error('Failed to update excludeFromInWork');
      }
    } catch (error) {
      console.error('Error updating excludeFromInWork:', error);
      alert('Ошибка при обновлении видимости заявки');
    }
  }, [userRole, setAllItems]);

  // Обработчики для колонки "Оценка"
  const handleRatingClick = useCallback((request: PurchaseRequest) => {
    setSelectedUser(null);
    setUserSearchQuery('');
    setSelectedUserEmail('');
    setEmailText('');
    setUserSuggestions([]);
    setShowUserSuggestions(false);
    setSelectedRequestForRating(request);
    setIsRatingModalOpen(true);
  }, [setSelectedUser, setUserSearchQuery, setSelectedUserEmail, setEmailText, setUserSuggestions, setShowUserSuggestions, setSelectedRequestForRating, setIsRatingModalOpen]);

  // Обработчики для модальных окон
  const handleRatingModalClose = useCallback(() => {
    setIsRatingModalOpen(false);
    setSelectedRequestForRating(null);
    setSelectedUser(null);
    setSelectedUserEmail('');
    setUserSearchQuery('');
    setEmailText('');
    setUserSuggestions([]);
    setShowUserSuggestions(false);
  }, [setIsRatingModalOpen, setSelectedRequestForRating, setSelectedUser, setSelectedUserEmail, setUserSearchQuery, setEmailText, setUserSuggestions, setShowUserSuggestions]);

  const handleUserSearchChange = useCallback((value: string) => {
    setUserSearchQuery(value);
    setSelectedUser(null);
    setSelectedUserEmail('');
    if (selectedRequestForRating) {
      generateEmailText('', selectedRequestForRating).catch(err => {
        console.error('Error generating email text:', err);
      });
    }
  }, [setUserSearchQuery, setSelectedUser, setSelectedUserEmail, selectedRequestForRating, generateEmailText]);

  const handleUserPick = useCallback((user: { id: number; username: string; email: string | null; surname: string | null; name: string | null }, displayName: string, userEmail: string) => {
    setSelectedUser(user);
    setUserSearchQuery(displayName);
    setSelectedUserEmail(userEmail);
    setShowUserSuggestions(false);
    if (selectedRequestForRating) {
      generateEmailText(userEmail, selectedRequestForRating);
    }
  }, [setSelectedUser, setUserSearchQuery, setSelectedUserEmail, setShowUserSuggestions, selectedRequestForRating, generateEmailText]);

  const handleRatingEmailCopy = useCallback(async () => {
    await copyRatingEmail(emailText);
  }, [emailText]);

  const handleRatingEmailSend = useCallback(async () => {
    if (!selectedRequestForRating) return;

    // Используем selectedUserEmail если он есть, иначе берем из userSearchQuery
    const recipientEmail = selectedUserEmail || userSearchQuery;

    if (!recipientEmail) {
      alert('Пожалуйста, выберите получателя');
      return;
    }

    try {
      // Извлекаем токен из полного URL (например, http://localhost:3000/csi/feedback/{token})
      const token = selectedRequestForRating.csiLink?.split('/csi/feedback/')[1]?.split('?')[0]?.split('#')[0];
      if (token) {
        // Отправляем приглашение на бэкенд
        const response = await fetch(`${getBackendUrl()}/api/csi-feedback/invitation?csiToken=${encodeURIComponent(token)}&recipient=${encodeURIComponent(recipientEmail)}`, {
          method: 'POST',
        });

        if (response.ok) {
          // Обновляем статус отправки в данных заявки
          setAllItems(prev => prev.map(req =>
            req.id === selectedRequestForRating.id
              ? { ...req, csiInvitationSent: true }
              : req
          ));
        } else {
          alert('Ошибка при отправке приглашения');
          return;
        }
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Ошибка при отправке приглашения');
      return;
    }
    
    // Закрываем модальное окно
    handleRatingModalClose();
  }, [selectedRequestForRating, selectedUserEmail, userSearchQuery, setAllItems, handleRatingModalClose]);

  const handleFeedbackDetailsModalClose = useCallback(() => {
    setIsFeedbackDetailsModalOpen(false);
    setSelectedRequestForFeedback(null);
    setFeedbackDetails(null);
  }, [setIsFeedbackDetailsModalOpen, setSelectedRequestForFeedback, setFeedbackDetails]);

  const handleSentInvitationModalClose = useCallback(() => {
    setIsSentInvitationModalOpen(false);
    setSentInvitationDetails(null);
  }, [setIsSentInvitationModalOpen, setSentInvitationDetails]);

  const handleFeedbackClick = useCallback(async (request: PurchaseRequest) => {
    setSelectedRequestForFeedback(request);
    setIsFeedbackDetailsModalOpen(true);
    setLoadingFeedbackDetails(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/csi-feedback/by-purchase-request/${request.id}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const feedback = data[0];
          setFeedbackDetails({
            recipient: feedback.recipient || null,
            speedRating: feedback.speedRating || null,
            qualityRating: feedback.qualityRating || null,
            satisfactionRating: feedback.satisfactionRating || null,
            uzprocRating: feedback.uzprocRating || null,
            usedUzproc: feedback.usedUzproc || null,
            comment: feedback.comment || null,
          });
        }
      }
    } catch (error) {
      console.error('Error loading feedback details:', error);
    } finally {
      setLoadingFeedbackDetails(false);
    }
  }, [setSelectedRequestForFeedback, setIsFeedbackDetailsModalOpen, setLoadingFeedbackDetails, setFeedbackDetails]);

  const handleSentInvitationClick = useCallback(async (request: PurchaseRequest) => {
    try {
      const token = request.csiLink?.split('/csi/feedback/')[1]?.split('?')[0]?.split('#')[0];
      if (token) {
        const response = await fetch(`${getBackendUrl()}/api/csi-feedback/invitation/details?csiToken=${encodeURIComponent(token)}`);
        if (response.ok) {
          const data = await response.json();
          const fullUrl = request.csiLink;
          const recipientName = data.recipientName || '';
          const generatedText = `Здравствуйте${recipientName ? ' ' + recipientName : ''}!

Вы инициировали заявку на закупку № ${request.idPurchaseRequest || ''} на ${request.name || ''}. Мы хотим улучшить сервис проведения закупок, пожалуйста пройдите опрос по ссылке:

${fullUrl}

(ссылка именная и работает один раз)

Спасибо за ваше время!`;
          setSentInvitationDetails({
            recipient: data.recipient || 'Не указан',
            emailText: generatedText
          });
          setIsSentInvitationModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Error loading invitation details:', error);
    }
  }, [setSentInvitationDetails, setIsSentInvitationModalOpen]);

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

  // Функция для экспорта в Excel
  const handleExportToExcel = async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      // Подготавливаем данные для экспорта
      const exportData = allItems.map((request) => ({
        'Номер заявки': request.idPurchaseRequest || '',
        'Дата создания': request.purchaseRequestCreationDate 
          ? new Date(request.purchaseRequestCreationDate).toLocaleDateString('ru-RU')
          : '',
        'ЦФО': request.cfo || '',
        'Наименование': request.name || '',
        'Инициатор': request.purchaseRequestInitiator || '',
        'Год плана': request.purchaseRequestPlanYear || '',
        'Бюджет': request.budgetAmount || '',
        'Тип затрат': request.costType || '',
        'Тип договора': request.contractType || '',
        'Длительность (мес)': request.contractDurationMonths || '',
        'План': request.isPlanned ? 'Плановая' : (request.isPlanned === false ? 'Внеплановая' : ''),
        'Требуется закупка': request.requiresPurchase ? 'Закупка' : (request.requiresPurchase === false ? 'Заказ' : ''),
      }));

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Устанавливаем ширину колонок
      const colWidths = [
        { wch: 15 }, // Номер заявки
        { wch: 15 }, // Дата создания
        { wch: 20 }, // ЦФО
        { wch: 30 }, // Наименование
        { wch: 25 }, // Инициатор
        { wch: 12 }, // Год плана
        { wch: 15 }, // Бюджет
        { wch: 15 }, // Тип затрат
        { wch: 15 }, // Тип договора
        { wch: 18 }, // Длительность
        { wch: 10 }, // План
        { wch: 18 }, // Требуется закупка
      ];
      ws['!cols'] = colWidths;

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, 'Заявки на закупку');

      // Генерируем имя файла с датой
      const fileName = `Заявки_на_закупку_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    }
  };

  // Функция для копирования в буфер обмена
  const handleCopyToClipboard = async () => {
    if (!data || !data.content || data.content.length === 0) {
      alert('Нет данных для копирования');
      return;
    }

    try {
      // Создаем заголовки
      const headers = [
        'Номер заявки',
        'Дата создания',
        'ЦФО',
        'Наименование',
        'Инициатор',
        'Год плана',
        'Бюджет',
        'Тип затрат',
        'Тип договора',
        'Длительность (мес)',
        'План',
        'Требуется закупка',
      ];

      // Создаем строки данных
      const rows = allItems.map((request) => [
        request.idPurchaseRequest || '',
        request.purchaseRequestCreationDate 
          ? new Date(request.purchaseRequestCreationDate).toLocaleDateString('ru-RU')
          : '',
        request.cfo || '',
        request.name || '',
        request.purchaseRequestInitiator || '',
        request.purchaseRequestPlanYear || '',
        request.budgetAmount || '',
        request.costType || '',
        request.contractType || '',
        request.contractDurationMonths || '',
        request.isPlanned ? 'Плановая' : (request.isPlanned === false ? 'Внеплановая' : ''),
        request.requiresPurchase ? 'Закупка' : (request.requiresPurchase === false ? 'Заказ' : ''),
      ]);

      // Объединяем заголовки и данные
      const allRows = [headers, ...rows];

      // Преобразуем в TSV формат (табуляция между колонками)
      const tsvContent = allRows.map(row => row.join('\t')).join('\n');

      // Копируем в буфер обмена
      await copyToClipboard(tsvContent);
      alert('Данные скопированы в буфер обмена');
    } catch (error) {
      console.error('Ошибка при копировании в буфер обмена:', error);
      alert('Ошибка при копировании в буфер обмена');
    }
  };

  // Функция для сохранения таблицы как картинки
  const handleSaveAsImage = async () => {
    // Сохраняем оригинальные функции консоли перед началом
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    try {
      // Находим элемент таблицы - используем более точный селектор
      const tableContainer = document.querySelector('.bg-white.rounded-lg.shadow-lg.overflow-hidden');
      const tableElement = tableContainer?.querySelector('table');
      
      if (!tableElement) {
        alert('Таблица не найдена');
        return;
      }

      // Временно подавляем ошибки, связанные с lab()
      console.error = (...args: any[]) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('lab')) {
          return; // Игнорируем ошибки lab()
        }
        originalConsoleError.apply(console, args);
      };
      
      console.warn = (...args: any[]) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('lab')) {
          return; // Игнорируем предупреждения lab()
        }
        originalConsoleWarn.apply(console, args);
      };

      try {
        // Создаем canvas из таблицы
        const canvas = await html2canvas(tableElement as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2, // Увеличиваем разрешение для лучшего качества
          logging: false,
          useCORS: true,
        });

        // Преобразуем canvas в blob
        canvas.toBlob((blob: Blob | null) => {
          if (!blob) {
            alert('Ошибка при создании изображения');
            return;
          }

          // Создаем ссылку для скачивания
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Генерируем имя файла с датой
          const fileName = `Заявки_на_закупку_${new Date().toISOString().split('T')[0]}.png`;
          link.download = fileName;
          
          // Добавляем ссылку в DOM, кликаем и удаляем
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Освобождаем память
          URL.revokeObjectURL(url);
        }, 'image/png');
      } finally {
        // Восстанавливаем оригинальные функции консоли
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      }
    } catch (error) {
      // Восстанавливаем оригинальные функции консоли в случае ошибки
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      // Игнорируем ошибки, связанные с lab()
      if (error instanceof Error && error.message && error.message.includes('lab')) {
        // Тихо игнорируем ошибку парсинга lab() цвета (html2canvas не поддерживает эту функцию)
        return;
      }
      
      console.error('Ошибка при сохранении изображения:', error);
      alert('Ошибка при сохранении изображения');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Сводная таблица по закупщикам */}
      <div className="flex items-start gap-4 px-3 py-2 border-b border-gray-200 flex-shrink-0">
        {/* Сводная таблица по закупщикам - слева */}
        <div className="flex-1">
          <PurchaseRequestsSummaryTable
            purchaserSummary={purchaserSummary}
            purchaserFilter={purchaserFilter}
            setPurchaserFilter={setPurchaserFilter}
            setCurrentPage={setCurrentPage}
          />
        </div>
        {/* Последние оценки CSI feedback - справа от сводной таблицы */}
        <LatestCsiFeedback />
      </div>

      {/* Заголовок таблицы с кнопками управления */}
      <PurchaseRequestsTableHeader
        allItemsCount={allItems.length}
        totalElements={data?.totalElements}
        allYears={allYears}
        selectedYear={selectedYear}
        visibleColumns={visibleColumns}
        isColumnsMenuOpen={isColumnsMenuOpen}
        columnsMenuPosition={columnsMenuPosition}
        columnsMenuButtonRef={columnsMenuButtonRef}
        toggleColumnVisibility={toggleColumnVisibility}
        selectAllColumns={selectAllColumns}
        selectDefaultColumns={selectDefaultColumns}
        setIsColumnsMenuOpen={setIsColumnsMenuOpen}
        onResetFilters={handleResetFilters}
        onYearChange={handleYearChange}
        onExportToExcel={handleExportToExcel}
        onCopyToClipboard={handleCopyToClipboard}
      />
      
      <div className="flex-1 overflow-auto relative">
        {/* Вкладки */}
        <PurchaseRequestsTableTabs
          activeTab={activeTab}
          tabCounts={tabCounts}
          onTabChange={handleTabChange}
          onInWorkTabClick={() => {
            console.log('=== Переключение на вкладку "В работе" ===');
            handleTabChange('in-work');
          }}
        />
        
        {/* Таблица с закрепленными заголовками */}
        <table className="w-full border-collapse">
          <PurchaseRequestsTableColumnsHeader
            filteredColumnOrder={filteredColumnOrder}
            visibleColumns={visibleColumns}
            activeTab={activeTab}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            filtersFromHook={filtersFromHook}
            localFilters={localFilters}
            onFilterChange={handleFilterChange}
            focusedField={focusedField}
            onFocus={handleFocus}
            onBlur={handleBlur}
            cfoFilter={cfoFilter}
            statusFilter={statusFilter}
            purchaserFilter={purchaserFilter}
            isCfoFilterOpen={isCfoFilterOpen}
            isStatusFilterOpen={isStatusFilterOpen}
            isPurchaserFilterOpen={isPurchaserFilterOpen}
            cfoFilterPosition={cfoFilterPosition}
            statusFilterPosition={statusFilterPosition}
            purchaserFilterPosition={purchaserFilterPosition}
            cfoFilterButtonRef={cfoFilterButtonRef}
            statusFilterButtonRef={statusFilterButtonRef}
            purchaserFilterButtonRef={purchaserFilterButtonRef}
            cfoSearchQuery={cfoSearchQuery}
            statusSearchQuery={statusSearchQuery}
            purchaserSearchQuery={purchaserSearchQuery}
            onCfoSearchChange={setCfoSearchQuery}
            onStatusSearchChange={setStatusSearchQuery}
            onPurchaserSearchChange={setPurchaserSearchQuery}
            onCfoToggle={handleCfoToggle}
            onStatusToggle={handleStatusToggle}
            onPurchaserToggle={handlePurchaserToggle}
            onCfoSelectAll={handleCfoSelectAll}
            onCfoDeselectAll={handleCfoDeselectAll}
            onStatusSelectAll={handleStatusSelectAll}
            onStatusDeselectAll={handleStatusDeselectAll}
            onPurchaserSelectAll={handlePurchaserSelectAll}
            onPurchaserDeselectAll={handlePurchaserDeselectAll}
            onCfoFilterToggle={() => setIsCfoFilterOpen(!isCfoFilterOpen)}
            onStatusFilterToggle={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
            onPurchaserFilterToggle={() => setIsPurchaserFilterOpen(!isPurchaserFilterOpen)}
            getFilteredCfoOptions={getFilteredCfoOptions}
            getFilteredStatusOptions={getFilteredStatusOptions}
            getFilteredPurchaserOptions={getFilteredPurchaserOptions}
            draggedColumn={draggedColumn}
            dragOverColumn={dragOverColumn}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            getColumnWidth={getColumnWidth}
            onResizeStart={handleResizeStart}
            onLocalFiltersChange={handleLocalFiltersChange}
          />
          {/* Старый блок thead удален - теперь используется PurchaseRequestsTableColumnsHeader */}
          <PurchaseRequestsTableBody
            allItems={allItems}
            filteredColumnOrder={filteredColumnOrder}
            activeTab={activeTab}
            getColumnWidth={getColumnWidth}
            canEditExcludeFromInWork={canEditExcludeFromInWork}
            userRole={userRole}
            onExcludeFromInWorkChange={handleExcludeFromInWorkChange}
            onRowClick={handleRowClick}
            onRowAuxClick={handleRowAuxClick}
            onRatingClick={handleRatingClick}
            onFeedbackClick={handleFeedbackClick}
            onSentInvitationClick={handleSentInvitationClick}
          />
        </table>

        {/* Infinite scroll индикатор */}
        {hasMore && (
          <div ref={loadMoreRef} className="h-4 flex items-center justify-center py-1">
            {loadingMore && (
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
        )}
      </div>
      
      {/* Модальное окно для отправки письма с оценкой */}
      <RatingEmailModal
        isOpen={isRatingModalOpen}
        request={selectedRequestForRating}
        userSearchRef={userSearchRef}
        selectedUser={selectedUser}
        userSearchQuery={userSearchQuery}
        userSuggestions={userSuggestions}
        showUserSuggestions={showUserSuggestions}
        emailText={emailText}
        onClose={handleRatingModalClose}
        onUserSearchChange={handleUserSearchChange}
        onUserPick={handleUserPick}
        onEmailTextChange={setEmailText}
        onCopy={handleRatingEmailCopy}
        onSend={handleRatingEmailSend}
        onUserSearchFocus={() => {
          if (userSuggestions.length > 0) {
            setShowUserSuggestions(true);
          }
        }}
      />

      {/* Модальное окно для просмотра деталей оценки */}
      <FeedbackDetailsModal
        isOpen={isFeedbackDetailsModalOpen}
        request={selectedRequestForFeedback}
        loading={loadingFeedbackDetails}
        feedbackDetails={feedbackDetails}
        onClose={handleFeedbackDetailsModalClose}
      />

      {/* Модальное окно для просмотра отправленного приглашения */}
      <SentInvitationModal
        isOpen={isSentInvitationModalOpen}
        details={sentInvitationDetails}
        onClose={handleSentInvitationModalClose}
      />
    </div>
  );
}

