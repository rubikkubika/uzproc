'use client';

import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, ArrowUpDown, Download, Copy, Search } from 'lucide-react';
import { usePurchasesTable } from './hooks/usePurchasesTable';
import MultiSelectFilterDropdown from './filters/MultiSelectFilterDropdown';

// Функция для получения символа валюты
const getCurrencyIcon = (currency: string | null) => {
  if (!currency) return null;
  const currencyUpper = currency.toUpperCase();
  if (currencyUpper === 'USD' || currencyUpper === 'ДОЛЛАР' || currencyUpper === '$') {
    return <span className="ml-0.5">$</span>;
  } else if (currencyUpper === 'EUR' || currencyUpper === 'ЕВРО' || currencyUpper === '€') {
    return <span className="ml-0.5">€</span>;
  } else if (currencyUpper === 'UZS' || currencyUpper === 'СУМ' || currencyUpper === 'СУММ') {
    return <span className="ml-0.5 text-xs">UZS</span>;
  }
  return <span className="ml-0.5 text-xs">{currency}</span>;
};

export default function PurchasesTable() {
  const router = useRouter();

  // Используем главный хук для получения всех необходимых данных и обработчиков
  const {
    // Данные
    data,
    loading,
    error,

    // Пагинация
    currentPage,
    pageSize,
    setCurrentPage,
    handlePageSizeChange,

    // Год
    selectedYear,
    setSelectedYear,

    // Сортировка
    sortField,
    sortDirection,
    handleSort,

    // Фильтры
    filters,

    // Колонки
    columns,

    // Метаданные
    metadata,
  } = usePurchasesTable();

  const { allYears } = metadata;

  // Локальные обработчики экспорта
  const handleExportToExcel = () => {
    // TODO: Реализовать экспорт в Excel
  };

  const handleCopyToClipboard = async () => {
    // TODO: Реализовать копирование в буфер обмена
  };

  // Сброс всех фильтров
  const handleResetFilters = () => {
    const emptyFilters = {
      innerId: '',
      cfo: '',
      budgetAmount: '',
      budgetAmountOperator: 'gte',
      purchaseRequestId: '',
      purchaseMethod: '',
    };
    filters.setFilters(emptyFilters);
    filters.setLocalFilters({
      innerId: '',
      budgetAmount: '',
      budgetAmountOperator: 'gte',
      purchaseRequestId: '',
      purchaseMethod: '',
    });
    filters.setCfoFilter(new Set());
    filters.setCfoSearchQuery('');
    filters.setPurchaserFilter(new Set());
    filters.setPurchaserSearchQuery('');
    filters.setStatusFilter(new Set());
    filters.setStatusSearchQuery('');
    setSelectedYear(null);
    filters.setFocusedField(null);
  };

  // Render functions
  const renderColumnHeader = (columnKey: string) => {
    const {
      draggedColumn,
      dragOverColumn,
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      getColumnWidth,
      handleResizeStart,
    } = columns;

    const isDragging = draggedColumn === columnKey;
    const isDragOver = dragOverColumn === columnKey;

    if (columnKey === 'purchaseRequestId') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('purchaseRequestId')}px`, minWidth: `${getColumnWidth('purchaseRequestId')}px`, maxWidth: `${getColumnWidth('purchaseRequestId')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <input
                type="text"
                data-filter-field="purchaseRequestId"
                value={filters.localFilters.purchaseRequestId || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  filters.handleFilterChange('purchaseRequestId', newValue);
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
                  filters.setFocusedField('purchaseRequestId');
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement &&
                        activeElement !== e.target &&
                        !activeElement.closest('input[data-filter-field]') &&
                        !activeElement.closest('select')) {
                      filters.setFocusedField(null);
                    }
                  }, 200);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Фильтр"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>
            <div className="flex items-center gap-1 min-h-[20px]">
              <button
                onClick={() => handleSort('purchaseRequestId')}
                className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
              >
                {sortField === 'purchaseRequestId' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                )}
              </button>
              <span className="text-xs font-medium text-gray-500 tracking-wider">Заявка</span>
            </div>
          </div>
          <div
            className="absolute top-0 right-0 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'purchaseRequestId')}
            style={{ zIndex: 10, width: '2px', marginRight: '-1px' }}
          />
        </th>
      );
    }

    if (columnKey === 'innerId') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('innerId')}px`, minWidth: `${getColumnWidth('innerId')}px`, maxWidth: `${getColumnWidth('innerId')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <input
                type="text"
                data-filter-field="innerId"
                value={filters.localFilters.innerId || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  filters.handleFilterChange('innerId', newValue);
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
                  filters.setFocusedField('innerId');
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement &&
                        activeElement !== e.target &&
                        !activeElement.closest('input[data-filter-field]') &&
                        !activeElement.closest('select')) {
                      filters.setFocusedField(null);
                    }
                  }, 200);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <span className="text-xs font-medium text-gray-500 tracking-wider">Внутренний ID</span>
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'innerId')}
            style={{ zIndex: 10 }}
          />
        </th>
      );
    }

    if (columnKey === 'cfo') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <MultiSelectFilterDropdown
                options={filters.getFilteredCfoOptions}
                selectedValues={filters.cfoFilter}
                onToggle={filters.handleCfoToggle}
                onSelectAll={filters.handleCfoSelectAll}
                onDeselectAll={filters.handleCfoDeselectAll}
                searchQuery={filters.cfoSearchQuery}
                onSearchChange={filters.setCfoSearchQuery}
                isOpen={filters.isCfoFilterOpen}
                onClose={() => filters.setIsCfoFilterOpen(false)}
                buttonRef={filters.cfoFilterButtonRef}
                position={filters.cfoFilterPosition}
              />
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
              <span className="text-xs font-medium text-gray-500 tracking-wider">ЦФО</span>
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

    if (columnKey === 'budgetAmount') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <select
                value={filters.localFilters.budgetAmountOperator || 'gte'}
                onChange={(e) => filters.handleFilterChange('budgetAmountOperator', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex-shrink-0"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', width: '40px', minWidth: '40px', maxWidth: '40px', boxSizing: 'border-box' }}
              >
                <option value="gte">&ge;</option>
                <option value="lte">&le;</option>
                <option value="eq">=</option>
              </select>
              <input
                type="text"
                data-filter-field="budgetAmount"
                value={filters.localFilters.budgetAmount || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  filters.handleFilterChange('budgetAmount', newValue);
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
                  filters.setFocusedField('budgetAmount');
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement &&
                        activeElement !== e.target &&
                        !activeElement.closest('input[data-filter-field]') &&
                        !activeElement.closest('select')) {
                      filters.setFocusedField(null);
                    }
                  }, 200);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Фильтр"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
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
              <span className="text-xs font-medium text-gray-500 tracking-wider">Бюджет</span>
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'budgetAmount')}
            style={{ zIndex: 10 }}
          />
        </th>
      );
    }

    if (columnKey === 'purchaser') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <MultiSelectFilterDropdown
                options={filters.getFilteredPurchaserOptions}
                selectedValues={filters.purchaserFilter}
                onToggle={filters.handlePurchaserToggle}
                onSelectAll={filters.handlePurchaserSelectAll}
                onDeselectAll={filters.handlePurchaserDeselectAll}
                searchQuery={filters.purchaserSearchQuery}
                onSearchChange={filters.setPurchaserSearchQuery}
                isOpen={filters.isPurchaserFilterOpen}
                onClose={() => filters.setIsPurchaserFilterOpen(false)}
                buttonRef={filters.purchaserFilterButtonRef}
                position={filters.purchaserFilterPosition}
              />
            </div>
            <div className="flex items-center gap-1 min-h-[20px]">
              <button
                onClick={() => handleSort('purchaser')}
                className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
              >
                {sortField === 'purchaser' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                )}
              </button>
              <span className="text-xs font-medium text-gray-500 tracking-wider">Закупщик</span>
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'purchaser')}
            style={{ zIndex: 10 }}
          />
        </th>
      );
    }

    if (columnKey === 'status') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <MultiSelectFilterDropdown
                options={filters.getFilteredStatusOptions()}
                selectedValues={filters.statusFilter}
                onToggle={filters.handleStatusToggle}
                onSelectAll={filters.handleStatusSelectAll}
                onDeselectAll={filters.handleStatusDeselectAll}
                searchQuery={filters.statusSearchQuery}
                onSearchChange={filters.setStatusSearchQuery}
                isOpen={filters.isStatusFilterOpen}
                onClose={() => filters.setIsStatusFilterOpen(false)}
                buttonRef={filters.statusFilterButtonRef}
                position={filters.statusFilterPosition}
              />
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

    if (columnKey === 'purchaseMethod') {
      return (
        <th
          key={columnKey}
          draggable
          onDragStart={(e) => handleDragStart(e, columnKey)}
          onDragOver={(e) => handleDragOver(e, columnKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, columnKey)}
          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
          style={{ width: `${getColumnWidth('purchaseMethod')}px`, minWidth: `${getColumnWidth('purchaseMethod')}px`, maxWidth: `${getColumnWidth('purchaseMethod')}px`, verticalAlign: 'top' }}
        >
          <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <div className="h-[24px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '24px', maxHeight: '24px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <input
                type="text"
                data-filter-field="purchaseMethod"
                value={filters.localFilters.purchaseMethod || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  filters.handleFilterChange('purchaseMethod', newValue);
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
                  filters.setFocusedField('purchaseMethod');
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement &&
                        activeElement !== e.target &&
                        !activeElement.closest('input[data-filter-field]') &&
                        !activeElement.closest('select')) {
                      filters.setFocusedField(null);
                    }
                  }, 200);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Фильтр"
                style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>
            <div className="flex items-center gap-1 min-h-[20px]">
              <button
                onClick={() => handleSort('purchaseMethod')}
                className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
              >
                {sortField === 'purchaseMethod' ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                )}
              </button>
              <span className="text-xs font-medium text-gray-500 tracking-wider">Способ закупки</span>
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
            onMouseDown={(e) => handleResizeStart(e, 'purchaseMethod')}
            style={{ zIndex: 10 }}
          />
        </th>
      );
    }

    // For all other columns (simple text columns without filters)
    const columnLabels: Record<string, string> = {
      name: 'Наименование',
      title: 'Название',
      purchaseInitiator: 'Инициатор',
      purchaseCreationDate: 'Дата создания',
      currency: 'Валюта',
      costType: 'Тип затрат',
      contractType: 'Тип договора',
      contractDurationMonths: 'Срок (мес)',
      purchaseRequestCreatedAt: 'Дата заявки',
      approvalDate: 'Дата утверждения',
      purchaseRequestSubject: 'Предмет заявки',
    };

    return (
      <th
        key={columnKey}
        draggable
        onDragStart={(e) => handleDragStart(e, columnKey)}
        onDragOver={(e) => handleDragOver(e, columnKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, columnKey)}
        className={`px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
        style={{ width: `${getColumnWidth(columnKey)}px`, minWidth: `${getColumnWidth(columnKey)}px`, maxWidth: `${getColumnWidth(columnKey)}px`, verticalAlign: 'top' }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleSort(columnKey)}
            className="flex items-center justify-center hover:text-gray-700 transition-colors"
          >
            {sortField === columnKey ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </button>
          <span>{columnLabels[columnKey] || columnKey}</span>
        </div>
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
          onMouseDown={(e) => handleResizeStart(e, columnKey)}
          style={{ zIndex: 10 }}
        />
      </th>
    );
  };

  const renderColumnCell = (columnKey: string, item: any) => {
    const { getColumnWidth } = columns;

    if (columnKey === 'purchaseRequestId') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('purchaseRequestId')}px`, minWidth: `${getColumnWidth('purchaseRequestId')}px`, maxWidth: `${getColumnWidth('purchaseRequestId')}px` }}
        >
          {item.purchaseRequestId || '-'}
        </td>
      );
    }

    if (columnKey === 'innerId') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('innerId')}px`, minWidth: `${getColumnWidth('innerId')}px`, maxWidth: `${getColumnWidth('innerId')}px` }}
        >
          {item.innerId || '-'}
        </td>
      );
    }

    if (columnKey === 'name') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('name')}px`, minWidth: `${getColumnWidth('name')}px`, maxWidth: `${getColumnWidth('name')}px` }}
        >
          {item.name || '-'}
        </td>
      );
    }

    if (columnKey === 'title') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('title')}px`, minWidth: `${getColumnWidth('title')}px`, maxWidth: `${getColumnWidth('title')}px` }}
        >
          {item.title || '-'}
        </td>
      );
    }

    if (columnKey === 'cfo') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px` }}
        >
          {item.cfo || '-'}
        </td>
      );
    }

    if (columnKey === 'purchaseInitiator') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('purchaseInitiator')}px`, minWidth: `${getColumnWidth('purchaseInitiator')}px`, maxWidth: `${getColumnWidth('purchaseInitiator')}px` }}
        >
          {item.purchaseInitiator || '-'}
        </td>
      );
    }

    if (columnKey === 'purchaseCreationDate') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('purchaseCreationDate')}px`, minWidth: `${getColumnWidth('purchaseCreationDate')}px`, maxWidth: `${getColumnWidth('purchaseCreationDate')}px` }}
        >
          {item.purchaseCreationDate ? new Date(item.purchaseCreationDate).toLocaleDateString('ru-RU') : '-'}
        </td>
      );
    }

    if (columnKey === 'budgetAmount') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 text-right"
          style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px` }}
        >
          <div className="flex items-center justify-end">
            {item.budgetAmount != null ? (
              <>
                <span>{item.budgetAmount.toLocaleString('ru-RU')}</span>
                {getCurrencyIcon(item.currency)}
              </>
            ) : (
              '-'
            )}
          </div>
        </td>
      );
    }

    if (columnKey === 'currency') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('currency')}px`, minWidth: `${getColumnWidth('currency')}px`, maxWidth: `${getColumnWidth('currency')}px` }}
        >
          {item.currency || '-'}
        </td>
      );
    }

    if (columnKey === 'costType') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('costType')}px`, minWidth: `${getColumnWidth('costType')}px`, maxWidth: `${getColumnWidth('costType')}px` }}
        >
          {item.costType || '-'}
        </td>
      );
    }

    if (columnKey === 'contractType') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('contractType')}px`, minWidth: `${getColumnWidth('contractType')}px`, maxWidth: `${getColumnWidth('contractType')}px` }}
        >
          {item.contractType || '-'}
        </td>
      );
    }

    if (columnKey === 'contractDurationMonths') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 text-right"
          style={{ width: `${getColumnWidth('contractDurationMonths')}px`, minWidth: `${getColumnWidth('contractDurationMonths')}px`, maxWidth: `${getColumnWidth('contractDurationMonths')}px` }}
        >
          {item.contractDurationMonths != null ? item.contractDurationMonths : '-'}
        </td>
      );
    }

    if (columnKey === 'purchaser') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px` }}
        >
          {item.purchaser || '-'}
        </td>
      );
    }

    if (columnKey === 'status') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('status')}px`, minWidth: `${getColumnWidth('status')}px`, maxWidth: `${getColumnWidth('status')}px` }}
        >
          {item.status || '-'}
        </td>
      );
    }

    if (columnKey === 'purchaseMethod') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('purchaseMethod')}px`, minWidth: `${getColumnWidth('purchaseMethod')}px`, maxWidth: `${getColumnWidth('purchaseMethod')}px` }}
        >
          {item.purchaseMethod || '-'}
        </td>
      );
    }

    if (columnKey === 'purchaseRequestCreatedAt') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('purchaseRequestCreatedAt')}px`, minWidth: `${getColumnWidth('purchaseRequestCreatedAt')}px`, maxWidth: `${getColumnWidth('purchaseRequestCreatedAt')}px` }}
        >
          {item.purchaseRequestCreatedAt ? new Date(item.purchaseRequestCreatedAt).toLocaleDateString('ru-RU') : '-'}
        </td>
      );
    }

    if (columnKey === 'approvalDate') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('approvalDate')}px`, minWidth: `${getColumnWidth('approvalDate')}px`, maxWidth: `${getColumnWidth('approvalDate')}px` }}
        >
          {item.approvalDate ? new Date(item.approvalDate).toLocaleDateString('ru-RU') : '-'}
        </td>
      );
    }

    if (columnKey === 'purchaseRequestSubject') {
      return (
        <td
          key={columnKey}
          className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
          style={{ width: `${getColumnWidth('purchaseRequestSubject')}px`, minWidth: `${getColumnWidth('purchaseRequestSubject')}px`, maxWidth: `${getColumnWidth('purchaseRequestSubject')}px` }}
        >
          {item.purchaseRequestSubject || '-'}
        </td>
      );
    }

    return (
      <td
        key={columnKey}
        className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"
        style={{ width: `${getColumnWidth(columnKey)}px`, minWidth: `${getColumnWidth(columnKey)}px`, maxWidth: `${getColumnWidth(columnKey)}px` }}
      >
        -
      </td>
    );
  };

  const hasData = data && data.content && data.content.length > 0;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Заголовок с кнопками управления */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Кнопка - Сбросить фильтры */}
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
          >
            Сбросить фильтры
          </button>

          {/* Фильтр по году */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Год:</span>
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
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
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Кнопки экспорта и копирования */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportToExcel}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
              title="Сохранить в Excel"
            >
              <Download className="w-3 h-3" />
              Excel
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
              title="Копировать в буфер обмена"
            >
              <Copy className="w-3 h-3" />
              Копировать
            </button>
          </div>

          {/* Пагинация */}
          <div className="flex items-center gap-1">
            <label htmlFor="pageSize" className="text-xs text-gray-700 whitespace-nowrap">
              На странице:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
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
              {currentPage + 1} / {data?.totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= (data?.totalPages || 1) - 1}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
            <button
              onClick={() => setCurrentPage((data?.totalPages || 1) - 1)}
              disabled={currentPage >= (data?.totalPages || 1) - 1}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Последняя
            </button>
          </div>
        </div>

        {/* Информация о количестве записей справа */}
        <div className="text-xs text-gray-700 flex-shrink-0">
          Показано {data?.content.length || 0} из {data?.totalElements || 0} записей
        </div>
      </div>

      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.columnOrder.map(columnKey => renderColumnHeader(columnKey))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hasData ? (
              data?.content.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    router.push(`/purchase/${item.id}`);
                  }}
                >
                  {columns.columnOrder.map(columnKey => renderColumnCell(columnKey, item))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.columnOrder.length} className="px-6 py-8 text-center text-gray-500">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
