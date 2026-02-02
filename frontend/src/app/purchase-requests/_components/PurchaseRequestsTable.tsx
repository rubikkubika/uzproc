'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import { Clock, Check, Eye, EyeOff, Settings, Star } from 'lucide-react';
import PurchaseRequestsSummaryTable from './ui/PurchaseRequestsSummaryTable';
import LatestCsiFeedback from './ui/LatestCsiFeedback';
import PurchaseRequestsTableHeader from './ui/PurchaseRequestsTableHeader';
import PurchaseRequestsKindTabs from './ui/PurchaseRequestsKindTabs';
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
import { copyToClipboard } from '@/utils/clipboard';
import { findInitiatorByName } from './services/users.api';
import { usePurchaseRequestsTable } from './hooks/usePurchaseRequestsTable';
import { useUserRole } from './hooks/useUserRole';
import { useRatingModal } from './hooks/useRatingModal';
import { useLocalStorageSync } from './hooks/useLocalStorageSync';
import { useMetadata } from './hooks/useMetadata';
import { useSummary } from './hooks/useSummary';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useTableExport } from './hooks/useTableExport';
import { useAvailableStatuses } from './hooks/useAvailableStatuses';
import { useTabCounts } from './hooks/useTabCounts';
import { usePurchaseRequestNavigation } from './hooks/usePurchaseRequestNavigation';
import { useDropdownPosition } from './hooks/useDropdownPosition';
import { useClickOutsideMany } from './hooks/useClickOutsideMany';
import { useCsiActions } from './hooks/useCsiActions';
import { useAutoTabFallback } from './hooks/useAutoTabFallback';
import { useColumnsByTab } from './hooks/useColumnsByTab';
import { usePurchaseRequestsFetchController } from './hooks/usePurchaseRequestsFetchController';
import { useTotalRecords } from './hooks/useTotalRecords';
import { useFilterHandlers } from './hooks/useFilterHandlers';
import { useExcludeFromInWork } from './hooks/useExcludeFromInWork';
import { useKindTabFilter } from './hooks/useKindTabFilter';

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
    selectedMonth, setSelectedMonth,
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
    handleFilterChangeForHeader,
    handleFocusForHeader,
    handleBlurForHeader,
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
    emailSubject, setEmailSubject,
    emailTo, setEmailTo,
    emailCc, setEmailCc,
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

  // При открытии модалки оценки заполняем тему, получателя (инициатор из БД) и копию (только закупщик + r.oskanov, не получатель)
  useEffect(() => {
    if (!isRatingModalOpen || !selectedRequestForRating) return;
    const num = selectedRequestForRating.idPurchaseRequest ?? '';
    setEmailSubject(`Об обратной связи по заявке № ${num}`);

    const initiatorName = selectedRequestForRating.purchaseRequestInitiator?.trim();
    const purchaserName = selectedRequestForRating.purchaser?.trim();
    const ccDefault = 'r.oskanov@uzum.com';

    // Загружаем инициатора и закупщика параллельно; получатель = инициатор, копия = только закупщик (не получатель) + Oskanov
    const initiatorPromise = initiatorName ? findInitiatorByName(initiatorName) : Promise.resolve(null);
    const purchaserPromise = purchaserName ? findInitiatorByName(purchaserName) : Promise.resolve(null);

    Promise.all([initiatorPromise, purchaserPromise]).then(([initiatorUser, purchaserUser]) => {
      // Email получателя — только инициатор
      if (initiatorUser?.email?.trim()) {
        setEmailTo(initiatorUser.email.trim());
      } else if (initiatorUser?.username) {
        setEmailTo(initiatorUser.username);
      } else {
        setEmailTo('');
      }

      // Копия — только email закупщика (не получателя) + r.oskanov@uzum.com
      const recipientEmail = (initiatorUser?.email || initiatorUser?.username || '').trim().toLowerCase();
      const purchaserEmail = purchaserUser?.email?.trim();
      const purchaserUsername = purchaserUser?.username?.trim();
      const isPurchaserSameAsRecipient = recipientEmail && (
        (purchaserEmail && purchaserEmail.toLowerCase() === recipientEmail) ||
        (purchaserUsername && purchaserUsername.toLowerCase() === recipientEmail)
      );

      if (purchaserUser && (purchaserEmail || purchaserUsername) && !isPurchaserSameAsRecipient) {
        setEmailCc(`${purchaserEmail || purchaserUsername}, ${ccDefault}`);
      } else {
        setEmailCc(ccDefault);
      }
    }).catch(() => {
      setEmailTo('');
      setEmailCc(ccDefault);
    });
  }, [isRatingModalOpen, selectedRequestForRating]);

  // Синхронизируем поле «Получатель» с выбранным пользователем
  useEffect(() => {
    if (isRatingModalOpen && selectedUserEmail) {
      setEmailTo(selectedUserEmail);
    }
  }, [isRatingModalOpen, selectedUserEmail]);

  
  // Используем хуки для позиционирования dropdown
  const cfoFilterPositionHook = useDropdownPosition(isCfoFilterOpen);
  const statusFilterPositionHook = useDropdownPosition(isStatusFilterOpen);
  const purchaserFilterPositionHook = useDropdownPosition(isPurchaserFilterOpen);
  
  // Алиасы для совместимости с существующим кодом
  const cfoFilterPosition = cfoFilterPositionHook.position;
  const statusFilterPosition = statusFilterPositionHook.position;
  const purchaserFilterPosition = purchaserFilterPositionHook.position;
  const cfoFilterButtonRef = cfoFilterPositionHook.buttonRef;
  const statusFilterButtonRef = statusFilterPositionHook.buttonRef;
  const purchaserFilterButtonRef = purchaserFilterPositionHook.buttonRef;
  
  // Используем хук для синхронизации с localStorage
  const { filtersLoadedRef, filtersLoaded, yearRestored, setYearRestored } = useLocalStorageSync({
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

  // Используем хук для фильтрации по типу заявки (Закупки/Заказы) - ВАЖНО: до useTabCounts
  const { kindTab, setKindTab, itemsToRender } = useKindTabFilter(allItems);

  // Используем хук для загрузки счетчиков вкладок
  useTabCounts({
    selectedYear,
    filtersFromHook,
    cfoFilter,
    purchaserFilter,
    filtersLoadedRef,
    filtersLoaded,
    tabCounts,
    setTabCounts,
    kindTab,
  });

  // Используем хук для навигации
  const { openInSameTab, openInNewTab } = usePurchaseRequestNavigation({
    router,
    dataTotalElements: data?.totalElements,
    currentPage,
    pageSize,
    filtersFromHook,
    localFilters,
    cfoFilter,
    statusFilter,
    selectedYear,
    sortField,
    sortDirection,
    cfoSearchQuery,
    statusSearchQuery,
    activeTab,
  });

  // Используем хук для CSI действий
  const { sendInvitation, loadFeedbackDetails, loadInvitationDetails } = useCsiActions({
    setAllItems,
    setFeedbackDetails,
    setLoadingFeedbackDetails,
    setSentInvitationDetails,
  });
  
  // Используем хук для обработки клика вне dropdown
  useClickOutsideMany([
    {
      isOpen: isCfoFilterOpen,
      close: () => setIsCfoFilterOpen(false),
      selector: '.cfo-filter-container',
    },
    {
      isOpen: isStatusFilterOpen,
      close: () => setIsStatusFilterOpen(false),
      selector: '.status-filter-container',
    },
    {
      isOpen: isPurchaserFilterOpen,
      close: () => setIsPurchaserFilterOpen(false),
      selector: '.purchaser-filter-container',
    },
  ]);


  // Используем хук для авто-переключения вкладки
  useAutoTabFallback({
    tabCounts,
    activeTab,
    setActiveTab,
    setStatusFilter,
    setPurchaserFilter,
    setCfoFilter,
    setCurrentPage,
    setAllItems,
  });
  
  // Используем хук для управления колонками по вкладкам
  useColumnsByTab({
    activeTab,
    kindTab,
    setVisibleColumns,
  });


  // Логика восстановления и сохранения фильтров теперь в хуке useLocalStorageSync
  // Логика debounce и восстановления фокуса теперь встроена в usePurchaseRequestFilters

  // Убрали useEffect, который устанавливал DEFAULT_STATUSES - теперь фильтр по умолчанию пустой

  // Используем хук для управления fetchData
  usePurchaseRequestsFetchController({
    filtersLoadedRef,
    yearRestored,
    selectedYear,
    selectedMonth,
    activeTab,
    forceReload,
    filtersFromHook,
    cfoFilter,
    purchaserFilter,
    statusFilter,
    pageSize,
    sortField,
    sortDirection,
    fetchData,
    setCurrentPage,
    setAllItems,
  });

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
          selectedMonth,
          sortField,
          sortDirection,
          mergedFilters,
          true // append = true для добавления данных
        );
        setCurrentPage(nextPage);
      }
    }, [hasMore, loadingMore, allItems.length, currentPage, filtersFromHook, localFilters, selectedYear, selectedMonth, sortField, sortDirection, pageSize, fetchData, setCurrentPage]),
    threshold: 0.1,
  });

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
    cfoFilter,
    filtersLoadedRef,
  });
  
  // Используем хук для получения доступных статусов
  const availableStatuses = useAvailableStatuses({
    activeTab,
    selectedYear,
    filtersFromHook,
    cfoFilter,
    purchaserFilter,
  });

  // Используем хук для загрузки totalRecords
  useTotalRecords({
    setTotalRecords,
  });

  // Используем хук для обработчиков фильтров
  const {
    handleSelectFilterChange,
    handleCfoToggle,
    handleStatusToggle,
    handlePurchaserToggle,
    handleCfoSelectAll,
    handleCfoDeselectAll,
    handlePurchaserSelectAll,
    handlePurchaserDeselectAll,
    handleStatusSelectAll,
    handleStatusDeselectAll,
    getFilteredCfoOptions,
    getFilteredPurchaserOptions,
    getFilteredStatusOptions,
  } = useFilterHandlers({
    filtersFromHook,
    localFilters,
    setFilters,
    setLocalFilters,
    setCurrentPage,
    setAllItems,
    cfoFilter,
    statusFilter,
    purchaserFilter,
    setCfoFilter,
    setStatusFilter,
    setPurchaserFilter,
    cfoSearchQuery,
    statusSearchQuery,
    purchaserSearchQuery,
    setStatusSearchQuery,
    uniqueValues,
    availableStatuses,
  });

  // Нормализация statusFilter при смене вкладки
  // Убираем из statusFilter статусы, которые не доступны для текущей вкладки
  useEffect(() => {
    if (availableStatuses.length === 0) return; // Ждём загрузки статусов

    const validStatuses = new Set(availableStatuses); // availableStatuses - массив строк
    const currentStatuses = Array.from(statusFilter);
    const invalidStatuses = currentStatuses.filter(status => !validStatuses.has(status));

    if (invalidStatuses.length > 0) {
      // Есть невалидные статусы - очищаем их
      const cleanedStatuses = new Set(currentStatuses.filter(status => validStatuses.has(status)));
      setStatusFilter(cleanedStatuses);
    }
  }, [activeTab, availableStatuses, statusFilter, setStatusFilter]);

  // Используем хук для excludeFromInWork
  const { updateExcludeFromInWork } = useExcludeFromInWork({
    userRole,
    setAllItems,
  });

  // Используем хук для экспорта таблицы (используем отфильтрованные данные)
  const { exportToExcel, copyAsTSV, saveAsImage } = useTableExport({
    allItems: itemsToRender,
    data,
  });

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
    } else if (activeTab === 'in-work') {
      // Для вкладки "В работе" добавляем колонку "rating", если она видима
      if (!filtered.includes('rating') && visibleColumns.has('rating')) {
        filtered.push('rating');
      }
    } else {
      // Для других вкладок убираем колонку "rating"
      filtered = filtered.filter(col => col !== 'rating');
    }
    
    return filtered;
  }, [columnOrder, visibleColumns, activeTab]);


  // Проверяем, есть ли данные для отображения
  const hasData = allItems && allItems.length > 0;

  // Обработчик для сброса фильтров
  const handleResetFilters = useCallback(() => {
    const emptyFilters = {
      idPurchaseRequest: '',
      guid: '',
      purchaseRequestPlanYear: '',
      company: '',
      mcc: '',
      cfo: '',
      purchaseRequestInitiator: '',
      purchaser: '',
      name: '',
      purchaseRequestCreationDate: '',
      createdAt: '',
      updatedAt: '',
      budgetAmount: '',
      budgetAmountOperator: 'gte',
      currency: '',
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
    setSelectedMonth(null);
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
  }, [setFilters, setLocalFilters, setCfoFilter, setStatusFilter, setCfoSearchQuery, setStatusSearchQuery, setPurchaserFilter, setPurchaserSearchQuery, setSelectedYear, setSelectedMonth, setSortField, setSortDirection, setFocusedField, setCurrentPage, setAllItems, setYearRestored, setActiveTab, activeTabRef, setForceReload]);

  // Обработчик для изменения года (фильтр по дате создания)
  const handleYearChange = useCallback((year: number | null) => {
    setSelectedYear(year);
    setCurrentPage(0);
    setAllItems([]);
  }, [setSelectedYear, setCurrentPage, setAllItems]);

  // Обработчик для изменения месяца (фильтр по дате создания)
  const handleMonthChange = useCallback((month: number | null) => {
    setSelectedMonth(month);
    setCurrentPage(0);
    setAllItems([]);
  }, [setSelectedMonth, setCurrentPage, setAllItems]);

  // Обработчик для переключения вкладки
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    activeTabRef.current = tab; // Синхронизация ref для избежания рассинхрона
    setStatusFilter(new Set());
    setPurchaserFilter(new Set());
    setCfoFilter(new Set());
    setStatusSearchQuery(''); // Сброс поиска по статусам
    setCfoSearchQuery(''); // Сброс поиска по ЦФО
    setPurchaserSearchQuery(''); // Сброс поиска по закупщикам
    setCurrentPage(0);
    setAllItems([]);
  }, [setActiveTab, activeTabRef, setStatusFilter, setPurchaserFilter, setCfoFilter, setStatusSearchQuery, setCfoSearchQuery, setPurchaserSearchQuery, setCurrentPage, setAllItems]);

  // Обработчик для изменения локальных фильтров
  const handleLocalFiltersChange = useCallback((updater: (prev: Record<string, string>) => Record<string, string>) => {
    setLocalFilters(updater);
  }, [setLocalFilters]);

  // Обработчик для клика на строку таблицы
  // Обработчики навигации теперь в хуке usePurchaseRequestNavigation

  // Обработчик для изменения excludeFromInWork (используем из хука)
  const handleExcludeFromInWorkChange = updateExcludeFromInWork;

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
    setEmailTo(userEmail);
    setShowUserSuggestions(false);
    if (selectedRequestForRating) {
      generateEmailText(userEmail, selectedRequestForRating);
    }
  }, [setSelectedUser, setUserSearchQuery, setSelectedUserEmail, setEmailTo, setShowUserSuggestions, selectedRequestForRating, generateEmailText]);

  const handleRatingEmailCopy = useCallback(async () => {
    await copyRatingEmail(emailText);
  }, [emailText]);

  const handleRatingEmailSend = useCallback(async () => {
    if (!selectedRequestForRating) return;

    const recipientEmail = emailTo?.trim();
    if (!recipientEmail) {
      alert('Пожалуйста, укажите email получателя');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      alert('Некорректный формат email получателя');
      return;
    }

    try {
      await sendInvitation(selectedRequestForRating, recipientEmail);

      const ccList = (emailCc ?? '')
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s && emailRegex.test(s));

      const response = await fetch(`${getBackendUrl()}/api/email/send-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          cc: ccList.length > 0 ? ccList : undefined,
          subject: emailSubject?.trim() || `Об обратной связи по заявке № ${selectedRequestForRating.idPurchaseRequest ?? ''}`,
          body: emailText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при отправке письма');
      }

      handleRatingModalClose();
    } catch (error) {
      console.error('Error sending invitation or email:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при отправке приглашения');
    }
  }, [selectedRequestForRating, emailTo, emailCc, emailSubject, emailText, sendInvitation, handleRatingModalClose]);

  const handleFeedbackDetailsModalClose = useCallback(() => {
    setIsFeedbackDetailsModalOpen(false);
    setSelectedRequestForFeedback(null);
    setFeedbackDetails(null);
  }, [setIsFeedbackDetailsModalOpen, setSelectedRequestForFeedback, setFeedbackDetails]);

  const handleSentInvitationModalClose = useCallback(() => {
    setIsSentInvitationModalOpen(false);
    setSentInvitationDetails(null);
  }, [setIsSentInvitationModalOpen, setSentInvitationDetails]);

  const handleSentInvitationCopy = useCallback(async () => {
    if (!sentInvitationDetails) {
      return;
    }
    await copyRatingEmail(sentInvitationDetails.emailText);
  }, [sentInvitationDetails]);

  const handleFeedbackClick = useCallback(async (request: PurchaseRequest) => {
    setSelectedRequestForFeedback(request);
    setIsFeedbackDetailsModalOpen(true);
    try {
      await loadFeedbackDetails(request);
    } catch (error) {
      console.error('Error loading feedback details:', error);
    }
  }, [setSelectedRequestForFeedback, setIsFeedbackDetailsModalOpen, loadFeedbackDetails]);

  const handleSentInvitationClick = useCallback(async (request: PurchaseRequest) => {
    try {
      await loadInvitationDetails(request);
      setIsSentInvitationModalOpen(true);
    } catch (error) {
      console.error('Error loading invitation details:', error);
    }
  }, [setIsSentInvitationModalOpen, loadInvitationDetails]);

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
                onClick={() => fetchData(currentPage, pageSize, selectedYear, selectedMonth, sortField, sortDirection, filtersFromHook)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Повторить
              </button>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Сводная таблица по закупщикам */}
      <div className="flex items-start gap-4 px-3 py-2 border-b border-gray-200 flex-shrink-0 pr-52">
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
        allItemsCount={itemsToRender.length}
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
        onExportToExcel={exportToExcel}
        onCopyToClipboard={copyAsTSV}
      />
      
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        {/* Верхние вкладки: Закупки/Заказы */}
        <PurchaseRequestsKindTabs
          kindTab={kindTab}
          onKindTabChange={setKindTab}
        />

        {/* Вкладки статусов */}
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
            handleFilterChangeForHeader={handleFilterChangeForHeader}
            handleSelectFilterChange={handleSelectFilterChange}
            focusedField={focusedField}
            handleFocusForHeader={handleFocusForHeader}
            handleBlurForHeader={handleBlurForHeader}
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
            allYears={allYears}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={handleYearChange}
            onMonthChange={handleMonthChange}
          />
          {/* Старый блок thead удален - теперь используется PurchaseRequestsTableColumnsHeader */}
          <PurchaseRequestsTableBody
            allItems={itemsToRender}
            filteredColumnOrder={filteredColumnOrder}
            activeTab={activeTab}
            getColumnWidth={getColumnWidth}
            canEditExcludeFromInWork={canEditExcludeFromInWork}
            userRole={userRole}
            onExcludeFromInWorkChange={handleExcludeFromInWorkChange}
            onRowClick={openInSameTab}
            onRowAuxClick={openInNewTab}
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
        emailSubject={emailSubject}
        emailTo={emailTo}
        emailCc={emailCc}
        onEmailSubjectChange={setEmailSubject}
        onEmailToChange={setEmailTo}
        onEmailCcChange={setEmailCc}
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
        onCopy={handleSentInvitationCopy}
      />
    </div>
  );
}

