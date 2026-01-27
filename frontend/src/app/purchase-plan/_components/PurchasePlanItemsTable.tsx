'use client';

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import { Settings, Download, Plus, X } from 'lucide-react';
import { usePurchasePlanItemsTable } from './hooks/usePurchasePlanItemsTable';
import { getCompanyLogoPath, getPurchaseRequestStatusColor } from './utils/purchase-plan-items.utils';
import { prepareExportData } from './utils/export.utils';
import { getBackendUrl } from '@/utils/api';
import { calculateNewContractDate } from './utils/date.utils';
import { FILTERS_STORAGE_KEY, DEFAULT_STATUSES } from './constants/purchase-plan-items.constants';

// UI компоненты
import PurchasePlanItemsTableHeader from './ui/PurchasePlanItemsTableHeader';
import PurchasePlanItemsTableBody from './ui/PurchasePlanItemsTableBody';
import PurchasePlanItemsTableRow from './ui/PurchasePlanItemsTableRow';
import PurchasePlanItemsTableFilters from './ui/PurchasePlanItemsTableFilters';
import PurchasePlanItemsTableColumnsMenu from './ui/PurchasePlanItemsTableColumnsMenu';
import PurchasePlanItemsTableColumnsHeader from './ui/PurchasePlanItemsTableColumnsHeader';
import PurchasePlanItemsSummaryTable from './ui/PurchasePlanItemsSummaryTable';

// Модальные окнаф
import PurchasePlanItemsDetailsModal from './ui/PurchasePlanItemsDetailsModal';
import PurchasePlanItemsCreateModal from './ui/PurchasePlanItemsCreateModal';
import PurchasePlanItemsAuthModal from './ui/PurchasePlanItemsAuthModal';
import PurchasePlanItemsErrorModal from './ui/PurchasePlanItemsErrorModal';
import PurchasePlanItemsVersionsModal from './ui/PurchasePlanItemsVersionsModal';
import PurchasePlanItemsVersionsListModal from './ui/PurchasePlanItemsVersionsListModal';

// Контекст аутентификации теперь глобальный, не нужен локальный AuthProvider
import { useAuth } from '@/contexts/AuthContext';

/**
 * Внутренний компонент таблицы, который использует хуки
 */
function PurchasePlanItemsTableContent() {
  // Используем главный хук, который композирует все остальные хуки
  const table = usePurchasePlanItemsTable();
  const { userEmail } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  // Настройка ReactToPrint для экспорта в PDF
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `План_закупок_${table.selectedYear || 'Все'}_${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 5mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
        .print-container {
          width: 100% !important;
          max-width: 100% !important;
          overflow: visible !important;
        }
        .print-container table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        .print-container table th.purchase-subject-column,
        .print-container table td.purchase-subject-column,
        .print-container table th[data-column="purchaseSubject"],
        .print-container table td[data-column="purchaseSubject"] {
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      }
    `,
  });

  // Функция для экспорта в PDF
  const handleExportPDF = useCallback(() => {
    if (!table.allItems || table.allItems.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }
    handlePrint();
  }, [table.allItems, handlePrint]);

  // Функция для экспорта в Excel с примененными фильтрами
  const handleExportExcel = useCallback(async () => {
    if (!table.allItems || table.allItems.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      const exportData = prepareExportData(table.allItems);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      const colWidths = [
        { wch: 8 }, { wch: 40 }, { wch: 8 }, { wch: 20 }, { wch: 20 },
        { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
        { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'План закупок');
      const fileName = `План_закупок_с_фильтрами_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      alert('Ошибка при экспорте в Excel');
    }
  }, [table.data]);

  // Функция для экспорта в Excel всех данных без фильтров
  const handleExportExcelAll = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '100000');

      const fetchUrl = `${getBackendUrl()}/api/purchase-plan-items?${params.toString()}`;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const result = await response.json();
      
      if (!result.content || result.content.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }

      const exportData = prepareExportData(result.content);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      const colWidths = [
        { wch: 8 }, { wch: 40 }, { wch: 8 }, { wch: 20 }, { wch: 20 },
        { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
        { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'План закупок');
      const fileName = `План_закупок_все_данные_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      alert('Ошибка при экспорте в Excel');
    }
  }, []);

  // Обработчики для заголовка таблицы
  const handleCreateVersion = useCallback(() => {
    table.versions.setIsCreateVersionModalOpen(true);
  }, [table.versions]);

  const handleViewVersions = useCallback(() => {
    table.versions.setIsVersionsListModalOpen(true);
    if (table.selectedYear) {
      table.versions.loadVersions(table.selectedYear);
    }
  }, [table.versions.setIsVersionsListModalOpen, table.versions.loadVersions, table.selectedYear]);

  const handleCreateItem = useCallback(() => {
    table.modals.setIsCreateModalOpen(true);
  }, [table.modals]);

  const handleColumnsSettings = useCallback(() => {
    // Устанавливаем позицию меню перед открытием
    if (table.columns.columnsMenuButtonRef.current) {
      const rect = table.columns.columnsMenuButtonRef.current.getBoundingClientRect();
      table.columns.setColumnsMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    table.columns.setIsColumnsMenuOpen(true);
  }, [table.columns]);

  // Обработчик клика по строке (открытие модального окна деталей)
  const handleRowClick = useCallback((item: any) => {
    table.modals.setDetailsModalOpen(item.id);
    table.modalData.fetchModalItemData(item.id);
    table.modals.setActiveTab(prev => ({ ...prev, [item.id]: 'comments' }));
    // Загружаем комментарии при открытии модального окна
    table.modalData.fetchComments(item.id, true); // includePrivate = true для внутреннего плана
  }, [table.modals, table.modalData]);

  // Обработчик изменения вкладки в модальном окне
  const handleTabChange = useCallback((itemId: number, tab: any) => {
    table.modals.setActiveTab(prev => ({ ...prev, [itemId]: tab }));
    
    if (tab === 'comments') {
      const commentsData = table.modalData.commentsData[itemId];
      if (!commentsData || !commentsData.content || commentsData.content.length === 0) {
        table.modalData.fetchComments(itemId, true); // includePrivate = true для внутреннего плана
      }
    } else if (tab === 'changes') {
      const changesData = table.modalData.changesData[itemId];
      if (!changesData || !changesData.content || changesData.content.length === 0) {
        table.modalData.fetchChanges(itemId, 0);
      }
    } else if (tab === 'purchaseRequest') {
      const item = table.data?.content.find(i => i.id === itemId);
      if (item?.purchaseRequestId) {
        // Всегда обновляем заявку при открытии вкладки, чтобы получить актуальный статус
        table.modalData.fetchPurchaseRequest(itemId, item.purchaseRequestId, (newStatus) => {
          // Обновляем статус в данных плана закупок
          table.setAllItems((prev: any[]) => 
            prev.map((planItem: any) => 
              planItem.id === itemId && planItem.purchaseRequestId === item.purchaseRequestId
                ? { ...planItem, purchaseRequestStatus: newStatus }
                : planItem
            )
          );
          if (table.data) {
            table.setData({
              ...table.data,
              content: table.data.content.map((planItem: any) =>
                planItem.id === itemId && planItem.purchaseRequestId === item.purchaseRequestId
                  ? { ...planItem, purchaseRequestStatus: newStatus }
                  : planItem
              )
            });
          }
        });
      }
    }
  }, [table.modals, table.modalData, table.data]);

  // Обработчик обновления комментариев после добавления нового
  const handleCommentsRefresh = useCallback((itemId: number) => {
    table.modalData.fetchComments(itemId, true);
  }, [table.modalData]);

  // Загружаем версии при изменении года
  useEffect(() => {
    if (table.selectedYear) {
      table.versions.loadVersions(table.selectedYear);
    }
  }, [table.selectedYear, table.versions.loadVersions]);

  // Сводная статистика по закупщикам (использует purchaserSummaryData из нового эндпоинта /purchaser-summary)
  // ВАЖНО: Должен быть вызван ДО условных возвратов, чтобы соблюдать правила хуков
  // ВАЖНО: purchaserSummaryData содержит уже агрегированные данные из эндпоинта, не нужно группировать
  const purchaserSummary = useMemo(() => {
    if (!table.purchaserSummaryData || table.purchaserSummaryData.length === 0) {
      return [];
    }

    // Данные уже в правильном формате из эндпоинта /purchaser-summary
    return table.purchaserSummaryData.map((item) => ({
      purchaser: item.purchaser || 'Не назначен',
      count: item.count || 0,
      totalBudget: typeof item.totalBudget === 'number' ? item.totalBudget : (parseFloat(String(item.totalBudget)) || 0),
      totalComplexity: typeof item.totalComplexity === 'number' ? item.totalComplexity : (parseFloat(String(item.totalComplexity)) || 0),
    }));
  }, [table.purchaserSummaryData]);

  // Функция для сброса всех фильтров (как в оригинале)
  // ВАЖНО: Должен быть вызван ДО условных возвратов, чтобы соблюдать правила хуков
  const handleResetFilters = useCallback(() => {
    const emptyFilters = {
      id: '',
      purchaseSubject: '',
      currentContractEndDate: '',
      purchaseRequestId: '',
      budgetAmount: '',
      budgetAmountOperator: 'gte',
    };
    table.filters.setFilters(emptyFilters);
    table.filters.setLocalFilters(emptyFilters);
    table.filters.setCfoFilter(new Set());
    table.filters.setCompanyFilter(new Set());
    table.filters.setPurchaserCompanyFilter(new Set(['Market'])); // При сбросе устанавливаем фильтр по умолчанию на "Market"
    table.filters.setCategoryFilter(new Set());
    table.filters.setPurchaserFilter(new Set());
    // При сбросе устанавливаем фильтр по статусу на дефолтные значения (все статусы кроме "Исключена")
    table.filters.setStatusFilter(new Set(DEFAULT_STATUSES));
    table.setSortField('requestDate');
    table.setSortDirection('asc');
    table.filters.setFocusedField(null);
    table.setSelectedYear(table.allYears.length > 0 ? table.allYears[0] : null);
    table.setSelectedMonths(new Set());
    table.setSelectedMonthYear(null);
    table.setCurrentPage(0);
    
    // Очищаем сохранённые фильтры в localStorage
    try {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    } catch { }

    // Устанавливаем просмотр текущей версии
    if (table.selectedYear) {
      table.versions.loadVersions(table.selectedYear);
    } else {
      // Если год не выбран, просто сбрасываем выбранную версию
      table.versions.setSelectedVersionId(null);
      table.versions.setSelectedVersionInfo(null);
    }
  }, [table]);

  // Ref для отслеживания последней загруженной версии, чтобы избежать повторных загрузок
  const lastLoadedVersionRef = useRef<number | null>(null);
  
  // Эффект для загрузки данных при изменении выбранной версии
  useEffect(() => {
    if (!table.selectedYear) return;
    
    // Используем selectedVersionId для поиска версии в списке, если selectedVersionInfo еще не обновился
    const selectedVersion = table.versions.selectedVersionInfo || 
      (table.versions.selectedVersionId ? table.versions.versions.find(v => v.id === table.versions.selectedVersionId) : null);
    
    
    // Пропускаем загрузку, если данные уже загружаются
    if (table.loading) {
      return;
    }
    
    // Пропускаем загрузку, если версия уже загружена
    if (selectedVersion && lastLoadedVersionRef.current === selectedVersion.id) {
      return;
    }
    
    if (selectedVersion) {
      lastLoadedVersionRef.current = selectedVersion.id;
      if (selectedVersion.isCurrent) {
        // Если выбрана текущая версия, загружаем обычные данные
        table.fetchData(0, table.pageSize, table.selectedYear, table.sortField, table.sortDirection, table.filters.filters, table.selectedMonths);
      } else {
        // Если выбрана архивная версия, загружаем данные версии
        table.loadVersionData(selectedVersion.id);
      }
    } else if (table.versions.selectedVersionId === null) {
      lastLoadedVersionRef.current = null;
      // Если версия не выбрана, загружаем обычные данные
      table.fetchData(0, table.pageSize, table.selectedYear, table.sortField, table.sortDirection, table.filters.filters, table.selectedMonths);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.versions.selectedVersionId, table.selectedYear]);

  // Функция для закрытия просмотра версии
  // ВАЖНО: Должен быть вызван ДО условных возвратов, чтобы соблюдать правила хуков
  const handleCloseVersion = useCallback(() => {
    lastLoadedVersionRef.current = null;
    table.versions.setSelectedVersionId(null);
    table.versions.setSelectedVersionInfo(null);
    table.fetchData(0, table.pageSize, table.selectedYear, table.sortField, table.sortDirection, table.filters.filters, table.selectedMonths);
  }, [table]);

  // Если данные загружаются
  if (table.loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // Если произошла ошибка
  if (table.error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <p className="text-red-600">Ошибка: {table.error}</p>
          <button
            onClick={() => table.fetchData(
              table.currentPage,
              table.pageSize,
              table.selectedYear,
              table.sortField,
              table.sortDirection,
              table.filters.filters,
              table.selectedMonths
            )}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // Подготовка данных для фильтров
  const filtersData = {
    cfo: {
      isOpen: table.filters.isCfoFilterOpen,
      position: table.filters.cfoFilterPosition,
      searchQuery: table.filters.cfoSearchQuery,
      options: table.filters.getFilteredCfoOptions,
      selectedValues: table.filters.cfoFilter,
      buttonRef: table.filters.cfoFilterButtonRef,
      onSearchChange: table.filters.setCfoSearchQuery,
      onToggle: table.filters.handleCfoToggle,
      onSelectAll: table.filters.handleCfoSelectAll,
      onDeselectAll: table.filters.handleCfoDeselectAll,
      onClose: () => table.filters.setIsCfoFilterOpen(false),
    },
    company: {
      isOpen: table.filters.isCompanyFilterOpen,
      position: table.filters.companyFilterPosition,
      searchQuery: table.filters.companySearchQuery,
      options: table.filters.getFilteredCompanyOptions,
      selectedValues: table.filters.companyFilter,
      buttonRef: table.filters.companyFilterButtonRef,
      onSearchChange: table.filters.setCompanySearchQuery,
      onToggle: table.filters.handleCompanyToggle,
      onSelectAll: table.filters.handleCompanySelectAll,
      onDeselectAll: table.filters.handleCompanyDeselectAll,
      onClose: () => table.filters.setIsCompanyFilterOpen(false),
    },
    purchaserCompany: {
      isOpen: table.filters.isPurchaserCompanyFilterOpen,
      position: table.filters.purchaserCompanyFilterPosition,
      searchQuery: table.filters.purchaserCompanySearchQuery,
      options: table.filters.getFilteredPurchaserCompanyOptions,
      selectedValues: table.filters.purchaserCompanyFilter,
      buttonRef: table.filters.purchaserCompanyFilterButtonRef,
      onSearchChange: table.filters.setPurchaserCompanySearchQuery,
      onToggle: table.filters.handlePurchaserCompanyToggle,
      onSelectAll: table.filters.handlePurchaserCompanySelectAll,
      onDeselectAll: table.filters.handlePurchaserCompanyDeselectAll,
      onClose: () => table.filters.setIsPurchaserCompanyFilterOpen(false),
    },
    category: {
      isOpen: table.filters.isCategoryFilterOpen,
      position: table.filters.categoryFilterPosition,
      searchQuery: table.filters.categorySearchQuery,
      options: table.filters.getFilteredCategoryOptions,
      selectedValues: table.filters.categoryFilter,
      buttonRef: table.filters.categoryFilterButtonRef,
      onSearchChange: table.filters.setCategorySearchQuery,
      onToggle: table.filters.handleCategoryToggle,
      onSelectAll: table.filters.handleCategorySelectAll,
      onDeselectAll: table.filters.handleCategoryDeselectAll,
      onClose: () => table.filters.setIsCategoryFilterOpen(false),
    },
    status: {
      isOpen: table.filters.isStatusFilterOpen,
      position: table.filters.statusFilterPosition,
      searchQuery: table.filters.statusSearchQuery,
      options: table.filters.getFilteredStatusOptions,
      selectedValues: table.filters.statusFilter,
      buttonRef: table.filters.statusFilterButtonRef,
      onSearchChange: table.filters.setStatusSearchQuery,
      onToggle: table.filters.handleStatusToggle,
      onSelectAll: table.filters.handleStatusSelectAll,
      onDeselectAll: table.filters.handleStatusDeselectAll,
      onClose: () => table.filters.setIsStatusFilterOpen(false),
    },
    purchaser: {
      isOpen: table.filters.isPurchaserFilterOpen,
      position: table.filters.purchaserFilterPosition,
      searchQuery: table.filters.purchaserSearchQuery,
      options: table.filters.getFilteredPurchaserOptions,
      selectedValues: table.filters.purchaserFilter,
      buttonRef: table.filters.purchaserFilterButtonRef,
      onSearchChange: table.filters.setPurchaserSearchQuery,
      onToggle: table.filters.handlePurchaserToggle,
      onSelectAll: table.filters.handlePurchaserSelectAll,
      onDeselectAll: table.filters.handlePurchaserDeselectAll,
      onClose: () => table.filters.setIsPurchaserFilterOpen(false),
    },
  };

  // Подготовка данных для редактирования (передаются в Row)
  const editingStates = {
    editingDate: table.editing.editingDate,
    editingStatus: table.editing.editingStatus,
    editingHolding: table.editing.editingHolding,
    editingPurchaserCompany: table.editing.editingPurchaserCompany,
    editingCfo: table.editing.editingCfo,
    creatingNewCfo: table.editing.creatingNewCfo,
    editingPurchaseRequestId: table.editing.editingPurchaseRequestId,
    editingPurchaseSubject: table.editing.editingPurchaseSubject,
    editingPurchaser: table.editing.editingPurchaser,
    tempDates: table.editing.tempDates,
    animatingDates: table.editing.animatingDates,
    cfoInputValue: table.editing.cfoInputValue,
    availablePurchasers: table.editing.availablePurchasers,
    availableCfo: table.filters.getUniqueValues('cfo') || [],
    availableHoldings: table.filters.getUniqueValues('holding') || [],
  };

  const editingHandlers = {
    onDateUpdate: table.editing.handleDateUpdate,
    onStatusUpdate: table.editing.handleStatusUpdate,
    onHoldingUpdate: table.editing.handleHoldingUpdate,
    onPurchaserCompanyUpdate: table.editing.handlePurchaserCompanyUpdate,
    onCfoUpdate: table.editing.handleCfoUpdate,
    onPurchaserUpdate: table.editing.handlePurchaserUpdate,
    onPurchaseSubjectUpdate: table.editing.handlePurchaseSubjectUpdate,
    onPurchaseRequestIdUpdate: table.editing.handlePurchaseRequestIdUpdate,
    setEditingDate: table.editing.setEditingDate,
    setEditingStatus: table.editing.setEditingStatus,
    setEditingHolding: table.editing.setEditingHolding,
    setEditingPurchaserCompany: table.editing.setEditingPurchaserCompany,
    setEditingCfo: table.editing.setEditingCfo,
    setCreatingNewCfo: table.editing.setCreatingNewCfo,
    setEditingPurchaseRequestId: table.editing.setEditingPurchaseRequestId,
    setEditingPurchaseSubject: table.editing.setEditingPurchaseSubject,
    setEditingPurchaser: table.editing.setEditingPurchaser,
    setTempDates: table.editing.setTempDates,
    setCfoInputValue: table.editing.setCfoInputValue,
    performGanttDateUpdate: table.editing.performGanttDateUpdate,
  };

  // Получаем текущий элемент для модального окна деталей
  const currentModalItem = table.modals.detailsModalOpen
    ? table.allItems.find(item => item.id === table.modals.detailsModalOpen) || null
    : null;

  const currentModalItemId = table.modals.detailsModalOpen;
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Заголовок таблицы: выбор года, валюты, кнопки экспорта, создания и т.д. */}
      <PurchasePlanItemsTableHeader
        selectedYear={table.selectedYear}
        setSelectedYear={table.setSelectedYear}
        allYears={table.allYears}
        selectedMonths={table.selectedMonths}
        setSelectedMonths={table.setSelectedMonths}
        selectedMonthYear={table.selectedMonthYear}
        setSelectedMonthYear={table.setSelectedMonthYear}
        selectedCurrency={table.selectedCurrency}
        setSelectedCurrency={table.setSelectedCurrency}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onExportExcelAll={handleExportExcelAll}
        onCreateVersion={handleCreateVersion}
        onViewVersions={handleViewVersions}
        onCreateItem={handleCreateItem}
        onColumnsSettings={handleColumnsSettings}
        isViewingArchiveVersion={table.versions.isViewingArchiveVersion}
        selectedVersionInfo={table.versions.selectedVersionInfo}
        purchaserSummary={purchaserSummary}
        purchaserFilter={table.filters.purchaserFilter}
        setPurchaserFilter={table.filters.setPurchaserFilter}
        setCurrentPage={table.setCurrentPage}
        totalRecords={table.totalRecords}
        allItemsCount={table.allItems.length}
        onResetFilters={handleResetFilters}
        selectedVersionId={table.versions.selectedVersionId}
        onCloseVersion={handleCloseVersion}
        canEdit={true} // TODO: получить из контекста или пропсов
        columnsMenuButtonRef={table.columns.columnsMenuButtonRef}
      />

      {/* Блок с кнопками управления и информацией о записях */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors"
          >
            Сбросить фильтры
          </button>
          <div className="relative">
            <button
              ref={table.columns.columnsMenuButtonRef}
              onClick={handleColumnsSettings}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
              title="Настройка колонок"
            >
              <Settings className="w-3 h-3" />
              Колонки
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 font-medium">Год:</span>
            {table.allYears.map((year) => (
              <button
                key={year}
                onClick={() => table.setSelectedYear(year)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  table.selectedYear === year
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {year}
              </button>
            ))}
            <button
              onClick={() => table.setSelectedYear(null)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                table.selectedYear === null
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Все
            </button>
          </div>
          {true && (
            <button
              onClick={handleCreateItem}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Создать новую строку плана закупок"
              disabled={table.versions.selectedVersionId !== null && !table.versions.selectedVersionInfo?.isCurrent}
            >
              <Plus className="w-3 h-3" />
              Создать строку
            </button>
          )}
          {true && (
            <button
              onClick={handleCreateVersion}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Создать редакцию плана закупок"
              disabled={table.versions.selectedVersionId !== null && !table.versions.selectedVersionInfo?.isCurrent}
            >
              <Plus className="w-3 h-3" />
              Создать редакцию
            </button>
          )}
          <button
            onClick={handleViewVersions}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1"
            title="Просмотр редакций плана закупок"
          >
            <Settings className="w-3 h-3" />
            Редакции
          </button>
          <button
            onClick={handleExportPDF}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
            title="Экспорт в PDF"
          >
            <Download className="w-3 h-3" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Экспорт в Excel с фильтрами"
          >
            <Download className="w-3 h-3" />
            Excel
          </button>
          <button
            onClick={handleExportExcelAll}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Экспорт в Excel всех данных"
          >
            <Download className="w-3 h-3" />
            Excel (все)
          </button>
        </div>
        {/* Информация о версии и количестве записей справа */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {table.versions.selectedVersionId && (
            <div className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${
              table.versions.selectedVersionInfo?.isCurrent 
                ? 'bg-green-100 text-green-800 border-green-300' 
                : 'bg-yellow-100 text-yellow-800 border-yellow-300'
            }`}>
              <span>
                {table.versions.selectedVersionInfo?.isCurrent 
                  ? 'Просмотр текущей редакции' 
                  : `Просмотр редакции #${table.versions.selectedVersionInfo?.versionNumber}`}
              </span>
              <button
                onClick={handleCloseVersion}
                className={table.versions.selectedVersionInfo?.isCurrent 
                  ? 'text-green-800 hover:text-green-900' 
                  : 'text-yellow-800 hover:text-yellow-900'}
                title="Вернуться к текущей версии"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="text-xs text-gray-700">
            Показано {table.allItems.length} из {table.totalRecords} записей
          </div>
        </div>
      </div>

      {/* Фильтры таблицы: выпадающие списки для множественного выбора */}
      <PurchasePlanItemsTableFilters filters={filtersData} />

      {/* Меню выбора колонок: настройка видимости колонок */}
      {table.columns.isColumnsMenuOpen && (
        <PurchasePlanItemsTableColumnsMenu
          isOpen={table.columns.isColumnsMenuOpen}
          position={table.columns.columnsMenuPosition}
          visibleColumns={table.columns.visibleColumns}
          onToggleColumn={table.columns.toggleColumnVisibility}
          onReset={table.columns.selectDefaultColumns}
          onClose={() => table.columns.setIsColumnsMenuOpen(false)}
          buttonRef={table.columns.columnsMenuButtonRef}
        />
      )}

      {/* Тело таблицы: заголовки колонок и строки с данными */}
      <div className="flex-1 overflow-auto custom-scrollbar" ref={printRef}>
        <table className="w-full border-collapse">
          <PurchasePlanItemsTableColumnsHeader
            filteredColumnOrder={table.columns.filteredColumnOrder}
            getColumnWidth={table.columns.getColumnWidth}
            handleDragStart={table.columns.handleDragStart}
            handleDragOver={table.columns.handleDragOver}
            handleDragLeave={table.columns.handleDragLeave}
            handleDrop={table.columns.handleDrop}
            draggedColumn={table.columns.draggedColumn}
            dragOverColumn={table.columns.dragOverColumn}
            handleResizeStart={table.columns.handleResizeStart}
            sortField={table.sortField}
            sortDirection={table.sortDirection}
            handleSort={table.handleSort}
            localFilters={table.filters.localFilters}
            handleFilterChangeForHeader={table.filters.handleFilterChangeForHeader}
            handleFocusForHeader={table.filters.handleFocusForHeader}
            handleBlurForHeader={table.filters.handleBlurForHeader}
            setFilters={table.filters.setFilters}
            setLocalFilters={table.filters.setLocalFilters}
            setCurrentPage={table.setCurrentPage}
            cfoFilterButtonRef={table.filters.cfoFilterButtonRef}
            cfoFilter={table.filters.cfoFilter}
            isCfoFilterOpen={table.filters.isCfoFilterOpen}
            setIsCfoFilterOpen={table.filters.setIsCfoFilterOpen}
            companyFilterButtonRef={table.filters.companyFilterButtonRef}
            companyFilter={table.filters.companyFilter}
            isCompanyFilterOpen={table.filters.isCompanyFilterOpen}
            setIsCompanyFilterOpen={table.filters.setIsCompanyFilterOpen}
            purchaserCompanyFilterButtonRef={table.filters.purchaserCompanyFilterButtonRef}
            purchaserCompanyFilter={table.filters.purchaserCompanyFilter}
            isPurchaserCompanyFilterOpen={table.filters.isPurchaserCompanyFilterOpen}
            setIsPurchaserCompanyFilterOpen={table.filters.setIsPurchaserCompanyFilterOpen}
            categoryFilterButtonRef={table.filters.categoryFilterButtonRef}
            categoryFilter={table.filters.categoryFilter}
            isCategoryFilterOpen={table.filters.isCategoryFilterOpen}
            setIsCategoryFilterOpen={table.filters.setIsCategoryFilterOpen}
            statusFilterButtonRef={table.filters.statusFilterButtonRef}
            statusFilter={table.filters.statusFilter}
            isStatusFilterOpen={table.filters.isStatusFilterOpen}
            setIsStatusFilterOpen={table.filters.setIsStatusFilterOpen}
            purchaserFilterButtonRef={table.filters.purchaserFilterButtonRef}
            purchaserFilter={table.filters.purchaserFilter}
            isPurchaserFilterOpen={table.filters.isPurchaserFilterOpen}
            setIsPurchaserFilterOpen={table.filters.setIsPurchaserFilterOpen}
            getMonthlyDistribution={table.getMonthlyDistribution}
            selectedYear={table.selectedYear}
            chartData={table.chartData}
            selectedMonths={table.selectedMonths}
            selectedMonthYear={table.selectedMonthYear}
            lastSelectedMonthIndex={table.lastSelectedMonthIndex}
            setSelectedMonthYear={table.setSelectedMonthYear}
            setSelectedYear={table.setSelectedYear}
            setSelectedMonths={table.setSelectedMonths}
            setLastSelectedMonthIndex={table.setLastSelectedMonthIndex}
            selectedCurrency={table.selectedCurrency}
            setSelectedCurrency={table.setSelectedCurrency}
          />
          <PurchasePlanItemsTableBody
            allItems={table.allItems}
            visibleColumns={table.columns.filteredColumnOrder}
            getColumnWidth={table.columns.getColumnWidth}
            editingStates={editingStates}
            editingHandlers={editingHandlers}
            formatBudget={table.formatBudget}
            getCompanyLogoPath={getCompanyLogoPath}
            getPurchaseRequestStatusColor={getPurchaseRequestStatusColor}
            onRowClick={handleRowClick}
            columnOrder={table.columns.filteredColumnOrder}
            tempDates={table.editing.tempDates}
            animatingDates={table.editing.animatingDates}
            performGanttDateUpdate={table.editing.performGanttDateUpdate}
            setTempDates={table.editing.setTempDates}
            setAnimatingDates={table.editing.setAnimatingDates}
            setEditingDate={table.editing.setEditingDate}
            canEdit={table.modals.canEdit}
            isViewingArchiveVersion={table.versions.isViewingArchiveVersion}
          />
        </table>

        {/* Infinite scroll индикатор */}
        {table.hasMore && (
          <div ref={table.loadMoreRef} className="h-4 flex items-center justify-center py-1">
            {table.loadingMore && (
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно деталей: просмотр и редактирование элемента */}
      {currentModalItemId && (
        <PurchasePlanItemsDetailsModal
          isOpen={table.modals.detailsModalOpen !== null}
          itemId={currentModalItemId}
          item={currentModalItem || table.modalData.modalItemData[currentModalItemId]?.data || null}
          purchaseRequest={currentModalItemId ? table.modalData.purchaseRequestData[currentModalItemId]?.data || null : null}
          activeTab={table.modals.activeTab[currentModalItemId] || 'comments'}
          onTabChange={(tab) => handleTabChange(currentModalItemId, tab)}
          onClose={() => table.modals.setDetailsModalOpen(null)}
          comments={currentModalItemId ? table.modalData.commentsData[currentModalItemId]?.content || [] : []}
          commentsLoading={currentModalItemId ? table.modalData.commentsData[currentModalItemId]?.loading || false : false}
          onCommentsRefresh={(itemId: number) => {
            handleCommentsRefresh(itemId);
          }}
          isPublicPlan={false}
          changes={currentModalItemId ? table.modalData.changesData[currentModalItemId]?.content || [] : []}
          changesLoading={currentModalItemId ? table.modalData.changesData[currentModalItemId]?.loading || false : false}
          changesTotalElements={currentModalItemId ? table.modalData.changesData[currentModalItemId]?.totalElements : undefined}
          changesTotalPages={currentModalItemId ? table.modalData.changesData[currentModalItemId]?.totalPages : undefined}
          changesCurrentPage={currentModalItemId ? table.modalData.changesData[currentModalItemId]?.currentPage : undefined}
          onChangesPageChange={(page) => {
            if (currentModalItemId) {
              table.modalData.fetchChanges(currentModalItemId, page);
            }
          }}
          loadingPurchaseRequest={currentModalItemId ? table.modalData.purchaseRequestData[currentModalItemId]?.loading || false : false}
        />
      )}

      {/* Модальное окно создания: создание новой строки плана закупок */}
      <PurchasePlanItemsCreateModal
        isOpen={table.modals.isCreateModalOpen}
        newItemData={table.newItemData}
        uniqueCfoValues={table.filters.uniqueValues.cfo || []}
        onDataChange={table.setNewItemData}
        onCreate={() => {
          table.editing.handleCreateItem();
        }}
        onClose={() => table.modals.setIsCreateModalOpen(false)}
      />

      {/* Модальное окно авторизации: для доступа к редактированию */}
      <PurchasePlanItemsAuthModal
        isOpen={table.modals.isAuthModalOpen}
        username={table.modals.authUsername}
        password={table.modals.authPassword}
        error={table.modals.authError}
        loading={table.modals.authLoading}
        onUsernameChange={table.modals.setAuthUsername}
        onPasswordChange={table.modals.setAuthPassword}
        onConfirm={async () => {
          // TODO: реализовать логику авторизации
          table.modals.setAuthLoading(true);
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: table.modals.authUsername,
                password: table.modals.authPassword,
              }),
            });
            if (response.ok) {
              table.modals.setIsAuthModalOpen(false);
              table.modals.setAuthError(null);
            } else {
              table.modals.setAuthError('Неверный логин или пароль');
            }
          } catch (error) {
            table.modals.setAuthError('Ошибка при авторизации');
          } finally {
            table.modals.setAuthLoading(false);
          }
        }}
        onCancel={() => table.modals.setIsAuthModalOpen(false)}
      />

      {/* Модальное окно ошибок: отображение ошибок */}
      <PurchasePlanItemsErrorModal
        isOpen={table.modals.errorModal.isOpen}
        message={table.modals.errorModal.message}
        onClose={() => table.modals.setErrorModal({ isOpen: false, message: '' })}
      />

      {/* Модальное окно создания версии: создание новой версии плана закупок */}
      <PurchasePlanItemsVersionsModal
        isOpen={table.versions.isCreateVersionModalOpen}
        selectedYear={table.selectedYear}
        versionDescription={table.versions.versionDescription}
        onDescriptionChange={table.versions.setVersionDescription}
        onCreate={async () => {
          if (!table.selectedYear) return;
          try {
            // Получаем email пользователя из localStorage или контекста
            const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('lastEmail') : null;
            const emailToUse = savedEmail || userEmail;

            const response = await fetch(`${getBackendUrl()}/api/purchase-plan-versions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                year: table.selectedYear,
                description: table.versions.versionDescription || `Редакция от ${new Date().toLocaleDateString('ru-RU')}`,
                createdBy: emailToUse || 'Система',
              }),
            });

            if (response.ok) {
              table.versions.setIsCreateVersionModalOpen(false);
              table.versions.setVersionDescription('');
              // Принудительно выбираем новую текущую версию после создания
              await table.versions.loadVersions(table.selectedYear, true);
            } else {
              const errorText = await response.text();
              table.modals.setErrorModal({
                isOpen: true,
                message: `Ошибка создания редакции: ${errorText || response.statusText}`,
              });
            }
          } catch (error) {
            table.modals.setErrorModal({
              isOpen: true,
              message: `Ошибка создания редакции: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            });
          }
        }}
        onClose={() => {
          table.versions.setIsCreateVersionModalOpen(false);
          table.versions.setVersionDescription('');
        }}
      />

      {/* Модальное окно списка версий: просмотр и выбор версий */}
      <PurchasePlanItemsVersionsListModal
        isOpen={table.versions.isVersionsListModalOpen}
        selectedYear={table.selectedYear}
        versions={table.versions.versions}
        loadingVersions={table.versions.loadingVersions}
        selectedVersionId={table.versions.selectedVersionId}
        onVersionSelect={(version) => {
          // Устанавливаем выбранную версию - эффект загрузит данные автоматически
          table.versions.setSelectedVersionId(version.id);
          table.versions.setSelectedVersionInfo(version);
        }}
        onClose={() => table.versions.setIsVersionsListModalOpen(false)}
      />
      </div>
  );
}

/**
 * Главный компонент таблицы плана закупок (рефакторинг)
 * 
 * Этот компонент интегрирует все хуки и UI компоненты:
 * - usePurchasePlanItemsTable: главный хук, композирующий все остальные
 * - PurchasePlanItemsTableHeader: заголовок таблицы с элементами управления
 * - PurchasePlanItemsTableBody: тело таблицы со строками
 * - PurchasePlanItemsTableRow: отдельная строка таблицы
 * - PurchasePlanItemsTableFilters: фильтры таблицы
 * - PurchasePlanItemsTableColumnsMenu: меню выбора колонок
 * - Модальные окна: детали, создание, авторизация, ошибки, версии
 */
function PurchasePlanItemsTable() {
  return <PurchasePlanItemsTableContent />;
}

export default PurchasePlanItemsTable;
