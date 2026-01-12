'use client';

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import { usePurchasePlanItemsTable } from './hooks/usePurchasePlanItemsTable';
import { getCompanyLogoPath, getPurchaseRequestStatusColor } from './utils/purchase-plan-items.utils';
import { prepareExportData } from './utils/export.utils';
import { getBackendUrl } from '@/utils/api';
import { calculateNewContractDate } from './utils/date.utils';

// UI компоненты
import PurchasePlanItemsTableHeader from './ui/PurchasePlanItemsTableHeader';
import PurchasePlanItemsTableBody from './ui/PurchasePlanItemsTableBody';
import PurchasePlanItemsTableRow from './ui/PurchasePlanItemsTableRow';
import PurchasePlanItemsTableFilters from './ui/PurchasePlanItemsTableFilters';
import PurchasePlanItemsTableColumnsMenu from './ui/PurchasePlanItemsTableColumnsMenu';
import PurchasePlanItemsTableColumnsHeader from './ui/PurchasePlanItemsTableColumnsHeader';
import PurchasePlanItemsSummaryTable from './ui/PurchasePlanItemsSummaryTable';

// Модальные окна
import PurchasePlanItemsDetailsModal from './ui/PurchasePlanItemsDetailsModal';
import PurchasePlanItemsCreateModal from './ui/PurchasePlanItemsCreateModal';
import PurchasePlanItemsAuthModal from './ui/PurchasePlanItemsAuthModal';
import PurchasePlanItemsErrorModal from './ui/PurchasePlanItemsErrorModal';
import PurchasePlanItemsVersionsModal from './ui/PurchasePlanItemsVersionsModal';
import PurchasePlanItemsVersionsListModal from './ui/PurchasePlanItemsVersionsListModal';

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
export default function PurchasePlanItemsTable() {
  // Используем главный хук, который композирует все остальные хуки
  const table = usePurchasePlanItemsTable();
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
    if (!table.data?.content || table.data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }
    handlePrint();
  }, [table.data, handlePrint]);

  // Функция для экспорта в Excel с примененными фильтрами
  const handleExportExcel = useCallback(async () => {
    if (!table.data || !table.data.content || table.data.content.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      const exportData = prepareExportData(table.data.content);

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
      console.error('Ошибка при экспорте в Excel:', error);
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
    table.columns.setIsColumnsMenuOpen(true);
  }, [table.columns]);

  // Обработчик клика по строке (открытие модального окна деталей)
  const handleRowClick = useCallback((item: any) => {
    table.modals.setDetailsModalOpen(item.id);
    table.modalData.fetchModalItemData(item.id);
    table.modals.setActiveTab(prev => ({ ...prev, [item.id]: 'comments' }));
  }, [table.modals, table.modalData]);

  // Обработчик изменения вкладки в модальном окне
  const handleTabChange = useCallback((itemId: number, tab: any) => {
    table.modals.setActiveTab(prev => ({ ...prev, [itemId]: tab }));
    
    if (tab === 'changes') {
      const changesData = table.modalData.changesData[itemId];
      if (!changesData || !changesData.content || changesData.content.length === 0) {
        table.modalData.fetchChanges(itemId, 0);
      }
    } else if (tab === 'purchaseRequest') {
      const item = table.data?.content.find(i => i.id === itemId);
      if (item?.purchaseRequestId && !table.modalData.purchaseRequestData[itemId]?.data) {
        table.modalData.fetchPurchaseRequest(itemId, item.purchaseRequestId);
      }
    }
  }, [table.modals, table.modalData, table.data]);

  // Загружаем версии при изменении года
  useEffect(() => {
    if (table.selectedYear) {
      table.versions.loadVersions(table.selectedYear);
    }
  }, [table.selectedYear, table.versions.loadVersions]);

  // Сводная статистика по закупщикам (использует summaryData, который не учитывает фильтр по закупщику)
  // ВАЖНО: Должен быть вызван ДО условных возвратов, чтобы соблюдать правила хуков
  const purchaserSummary = useMemo(() => {
    if (!table.summaryData || table.summaryData.length === 0) {
      return [];
    }

    const summaryMap = new Map<string, { count: number; totalBudget: number; totalComplexity: number }>();

    table.summaryData.forEach((item) => {
      // Исключаем неактуальные строки из сводной таблицы
      if (item.status === 'Исключена') {
        return;
      }

      const purchaser = item.purchaser || 'Не назначен';
      const budget = item.budgetAmount || 0;
      
      // Парсим сложность как число (если это числовое значение)
      let complexity = 0;
      if (item.complexity) {
        const parsed = parseFloat(item.complexity.toString().replace(/,/g, '.').replace(/\s/g, ''));
        if (!isNaN(parsed)) {
          complexity = parsed;
        }
      }

      if (!summaryMap.has(purchaser)) {
        summaryMap.set(purchaser, { count: 0, totalBudget: 0, totalComplexity: 0 });
      }

      const stats = summaryMap.get(purchaser)!;
      stats.count++;
      stats.totalBudget += budget;
      stats.totalComplexity += complexity;
    });

    return Array.from(summaryMap.entries())
      .map(([purchaser, stats]) => ({
        purchaser,
        count: stats.count,
        totalBudget: stats.totalBudget,
        totalComplexity: stats.totalComplexity,
      }))
      .sort((a, b) => b.totalBudget - a.totalBudget); // Сортировка по сумме бюджета по убыванию
  }, [table.summaryData]);

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
    // При сбросе устанавливаем фильтр по статусу на все доступные статусы из текущих данных кроме "Исключена"
    const availableStatuses = table.filters.getUniqueValues('status') || [];
    const resetStatusFilter = availableStatuses.filter(s => s !== 'Исключена');
    table.filters.setStatusFilter(new Set(resetStatusFilter));
    table.setSortField('requestDate');
    table.setSortDirection('asc');
    table.filters.setFocusedField(null);
    table.setSelectedYear(table.allYears.length > 0 ? table.allYears[0] : null);
    table.setSelectedMonths(new Set());
    table.setSelectedMonthYear(null);
    table.setCurrentPage(0);

    // Устанавливаем просмотр текущей версии
    if (table.selectedYear) {
      table.versions.loadVersions(table.selectedYear).then(() => {
        // После загрузки версий текущая версия будет выбрана автоматически
      });
    } else {
      // Если год не выбран, просто сбрасываем выбранную версию
      table.versions.setSelectedVersionId(null);
      table.versions.setSelectedVersionInfo(null);
    }
  }, [table]);

  // Функция для закрытия просмотра версии
  // ВАЖНО: Должен быть вызван ДО условных возвратов, чтобы соблюдать правила хуков
  const handleCloseVersion = useCallback(() => {
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
    ? table.data?.content.find(item => item.id === table.modals.detailsModalOpen) || null
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
        onResetFilters={handleResetFilters}
        selectedVersionId={table.versions.selectedVersionId}
        onCloseVersion={handleCloseVersion}
        canEdit={true} // TODO: получить из контекста или пропсов
        columnsMenuButtonRef={table.columns.columnsMenuButtonRef}
      />

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
        {table.data && table.data.content && table.data.content.length > 0 ? (
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
              data={table.data}
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
        ) : (
          <div className="text-center py-8 text-gray-500">
            Нет данных для отображения
          </div>
        )}
      </div>

      {/* Infinite scroll индикатор */}
      {table.hasMore && (
        <div ref={table.loadMoreRef} className="h-10 flex items-center justify-center">
          {table.loadingMore && (
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          )}
        </div>
      )}

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
          comments={[]} // TODO: добавить загрузку комментариев
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
          // TODO: реализовать создание версии
          if (!table.selectedYear) return;
          try {
            const response = await fetch(`${getBackendUrl()}/api/purchase-plan-versions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                year: table.selectedYear,
                description: table.versions.versionDescription,
              }),
            });
            if (response.ok) {
              table.versions.setIsCreateVersionModalOpen(false);
              table.versions.setVersionDescription('');
              table.versions.loadVersions(table.selectedYear);
            }
          } catch (error) {
            // Ошибка создания версии игнорируется
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
          table.versions.setSelectedVersionId(version.id);
          table.versions.setSelectedVersionInfo(version);
        }}
        onClose={() => table.versions.setIsVersionsListModalOpen(false)}
      />
    </div>
  );
}
