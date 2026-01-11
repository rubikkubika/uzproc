'use client';

import React from 'react';
import { ALL_COLUMNS } from '../constants/purchase-plan-items.constants';
import { SortField, SortDirection } from '../types/purchase-plan-items.types';
import SortableHeader from './SortableHeader';
import FilterButton from '../filters/FilterButton';
import PurchasePlanItemsMonthlyChart from './PurchasePlanItemsMonthlyChart';

interface PurchasePlanItemsTableColumnsHeaderProps {
  filteredColumnOrder: string[];
  // Columns
  getColumnWidth: (columnKey: string) => number;
  handleDragStart: (e: React.DragEvent, columnKey: string) => void;
  handleDragOver: (e: React.DragEvent, columnKey: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, columnKey: string) => void;
  draggedColumn: string | null;
  dragOverColumn: string | null;
  handleResizeStart: (e: React.MouseEvent, columnKey: string) => void;
  // Sort
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  // Filters
  localFilters: Record<string, string>;
  handleFilterChangeForHeader: (columnKey: string, value: string) => void;
  handleFocusForHeader: (columnKey: string) => void;
  handleBlurForHeader: (e: React.FocusEvent<HTMLInputElement>, columnKey: string) => void;
  // Filter configs
  cfoFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  cfoFilter: Set<string>;
  isCfoFilterOpen: boolean;
  setIsCfoFilterOpen: (open: boolean) => void;
  companyFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  companyFilter: Set<string>;
  isCompanyFilterOpen: boolean;
  setIsCompanyFilterOpen: (open: boolean) => void;
  purchaserCompanyFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  purchaserCompanyFilter: Set<string>;
  isPurchaserCompanyFilterOpen: boolean;
  setIsPurchaserCompanyFilterOpen: (open: boolean) => void;
  categoryFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  categoryFilter: Set<string>;
  isCategoryFilterOpen: boolean;
  setIsCategoryFilterOpen: (open: boolean) => void;
  statusFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  statusFilter: Set<string>;
  isStatusFilterOpen: boolean;
  setIsStatusFilterOpen: (open: boolean) => void;
  purchaserFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  purchaserFilter: Set<string>;
  isPurchaserFilterOpen: boolean;
  setIsPurchaserFilterOpen: (open: boolean) => void;
  // Monthly chart
  getMonthlyDistribution?: number[];
  selectedYear: number | null;
  chartData?: any;
  selectedMonths: Set<number>;
  selectedMonthYear: number | null;
  lastSelectedMonthIndex: number | null;
  setSelectedMonthYear: (year: number | null) => void;
  setSelectedYear: (year: number | null) => void;
  setSelectedMonths: (months: Set<number>) => void;
  setLastSelectedMonthIndex: (index: number | null) => void;
  // Currency
  selectedCurrency: 'UZS' | 'USD';
  setSelectedCurrency: (currency: 'UZS' | 'USD') => void;
}

/**
 * Компонент заголовков колонок таблицы плана закупок
 * Обрабатывает отображение всех заголовков колонок с сортировкой, фильтрами и специальными элементами
 */
export default function PurchasePlanItemsTableColumnsHeader({
  filteredColumnOrder,
  getColumnWidth,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  draggedColumn,
  dragOverColumn,
  handleResizeStart,
  sortField,
  sortDirection,
  handleSort,
  localFilters,
  handleFilterChangeForHeader,
  handleFocusForHeader,
  handleBlurForHeader,
  cfoFilterButtonRef,
  cfoFilter,
  isCfoFilterOpen,
  setIsCfoFilterOpen,
  companyFilterButtonRef,
  companyFilter,
  isCompanyFilterOpen,
  setIsCompanyFilterOpen,
  purchaserCompanyFilterButtonRef,
  purchaserCompanyFilter,
  isPurchaserCompanyFilterOpen,
  setIsPurchaserCompanyFilterOpen,
  categoryFilterButtonRef,
  categoryFilter,
  isCategoryFilterOpen,
  setIsCategoryFilterOpen,
  statusFilterButtonRef,
  statusFilter,
  isStatusFilterOpen,
  setIsStatusFilterOpen,
  purchaserFilterButtonRef,
  purchaserFilter,
  isPurchaserFilterOpen,
  setIsPurchaserFilterOpen,
  getMonthlyDistribution,
  selectedYear,
  chartData,
  selectedMonths,
  selectedMonthYear,
  lastSelectedMonthIndex,
  setSelectedMonthYear,
  setSelectedYear,
  setSelectedMonths,
  setLastSelectedMonthIndex,
  selectedCurrency,
  setSelectedCurrency,
}: PurchasePlanItemsTableColumnsHeaderProps) {
  return (
    <thead className="bg-gray-50 sticky top-0 z-10">
      <tr>
        {filteredColumnOrder.map((columnKey) => {
          const column = ALL_COLUMNS.find(col => col.key === columnKey);
          if (!column) return null;
          
          // Для колонки requestDate создаем отдельный заголовок со столбчатой диаграммой
          if (columnKey === 'requestDate') {
            return (
              <th 
                key={columnKey}
                className="px-1 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative"
                style={{ width: '350px', minWidth: '350px' }}
                draggable={!!columnKey}
                onDragStart={columnKey ? (e) => handleDragStart(e, columnKey) : undefined}
                onDragOver={columnKey ? (e) => handleDragOver(e, columnKey) : undefined}
                onDragLeave={handleDragLeave}
                onDrop={columnKey ? (e) => handleDrop(e, columnKey) : undefined}
                data-column={columnKey || undefined}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 min-h-[20px]">
                    {/* Столбчатая диаграмма распределения по месяцам */}
                    <PurchasePlanItemsMonthlyChart
                      monthlyDistribution={getMonthlyDistribution || Array(14).fill(0)}
                      selectedYear={selectedYear}
                      chartData={chartData}
                      selectedMonths={selectedMonths}
                      selectedMonthYear={selectedMonthYear}
                      lastSelectedMonthIndex={lastSelectedMonthIndex}
                      setSelectedMonthYear={setSelectedMonthYear}
                      setSelectedYear={setSelectedYear}
                      setSelectedMonths={setSelectedMonths}
                      setLastSelectedMonthIndex={setLastSelectedMonthIndex}
                    />
                  </div>
                </div>
                {columnKey && handleResizeStart && (
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                    onMouseDown={(e) => handleResizeStart(e, columnKey)}
                    style={{ zIndex: 10 }}
                  />
                )}
              </th>
            );
          }
          
          // Для колонки details создаем простой заголовок без сортировки и фильтров
          if (columnKey === 'details') {
            return (
              <th 
                key={columnKey}
                className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative"
                style={{ width: `${getColumnWidth(columnKey)}px` }}
                draggable={!!columnKey}
                onDragStart={columnKey ? (e) => handleDragStart(e, columnKey) : undefined}
                onDragOver={columnKey ? (e) => handleDragOver(e, columnKey) : undefined}
                onDragLeave={handleDragLeave}
                onDrop={columnKey ? (e) => handleDrop(e, columnKey) : undefined}
                data-column={columnKey || undefined}
              >
                <div className="flex items-center gap-1 min-h-[20px]">
                  <span className="text-xs font-medium text-gray-500 tracking-wider">{column.label}</span>
                </div>
                {columnKey && handleResizeStart && (
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                    onMouseDown={(e) => handleResizeStart(e, columnKey)}
                    style={{ zIndex: 10 }}
                  />
                )}
              </th>
            );
          }
          
          // Для остальных колонок используем SortableHeader
          // Колонки с текстовыми фильтрами (текстовые/числовые поля без множественного выбора)
          const textFilterColumns = [
            'id',
            'guid',
            'year',
            'purchaseSubject',
            'purchaseRequestId',
            'product',
            'currentKa',
            'complexity',
            'newContractDate',
            'currentContractEndDate',
            'currentAmount',
            'currentContractAmount',
            'currentContractBalance',
            'createdAt',
            'updatedAt',
          ];
          const isTextFilter = textFilterColumns.includes(columnKey);
          
          // Маппинг фильтров для множественного выбора
          const filterConfigMap = {
            cfo: {
              buttonRef: cfoFilterButtonRef,
              selectedCount: cfoFilter.size,
              selectedValues: cfoFilter,
              isOpen: isCfoFilterOpen,
              onToggle: () => {
                setIsCfoFilterOpen(!isCfoFilterOpen);
              },
            },
            company: {
              buttonRef: companyFilterButtonRef,
              selectedCount: companyFilter.size,
              selectedValues: companyFilter,
              isOpen: isCompanyFilterOpen,
              onToggle: () => setIsCompanyFilterOpen(!isCompanyFilterOpen),
            },
            purchaserCompany: {
              buttonRef: purchaserCompanyFilterButtonRef,
              selectedCount: purchaserCompanyFilter.size,
              selectedValues: purchaserCompanyFilter,
              isOpen: isPurchaserCompanyFilterOpen,
              onToggle: () => setIsPurchaserCompanyFilterOpen(!isPurchaserCompanyFilterOpen),
            },
            category: {
              buttonRef: categoryFilterButtonRef,
              selectedCount: categoryFilter.size,
              selectedValues: categoryFilter,
              isOpen: isCategoryFilterOpen,
              onToggle: () => setIsCategoryFilterOpen(!isCategoryFilterOpen),
            },
            status: {
              buttonRef: statusFilterButtonRef,
              selectedCount: statusFilter.size,
              selectedValues: statusFilter,
              isOpen: isStatusFilterOpen,
              onToggle: () => setIsStatusFilterOpen(!isStatusFilterOpen),
            },
            purchaser: {
              buttonRef: purchaserFilterButtonRef,
              selectedCount: purchaserFilter.size,
              selectedValues: purchaserFilter,
              isOpen: isPurchaserFilterOpen,
              onToggle: () => setIsPurchaserFilterOpen(!isPurchaserFilterOpen),
            },
          } as const;
          
          const filterConfig = !isTextFilter && columnKey in filterConfigMap 
            ? filterConfigMap[columnKey as keyof typeof filterConfigMap]
            : null;
          
          return (
            <SortableHeader
              key={columnKey}
              field={columnKey}
              label={column.label}
              filterType={isTextFilter ? 'text' : undefined}
              columnKey={columnKey}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={isTextFilter ? (localFilters[columnKey] || '') : undefined}
              onFilterChange={isTextFilter ? ((value) => handleFilterChangeForHeader(columnKey, value)) : undefined}
              onFocus={isTextFilter ? () => handleFocusForHeader(columnKey) : undefined}
              onBlur={isTextFilter ? ((e) => handleBlurForHeader(e, columnKey)) : undefined}
              width={getColumnWidth(columnKey)}
              onDragStart={(e, colKey) => handleDragStart(e, colKey)}
              onDragOver={(e, colKey) => handleDragOver(e, colKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e, colKey) => handleDrop(e, colKey)}
              isDragged={draggedColumn === columnKey}
              isDragOver={dragOverColumn === columnKey}
              onResizeStart={(e, colKey) => handleResizeStart(e, colKey)}
            >
              {/* Для колонок с множественным выбором (ЦФО, Компания и т.д.) */}
              {filterConfig && (
                <FilterButton
                  buttonRef={filterConfig.buttonRef}
                  selectedCount={filterConfig.selectedCount}
                  selectedValues={filterConfig.selectedValues}
                  isOpen={filterConfig.isOpen}
                  onToggle={filterConfig.onToggle}
                />
              )}
              {columnKey === 'budgetAmount' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCurrency('UZS');
                    }}
                    className={`px-1.5 py-0.5 text-xs border rounded hover:bg-gray-100 transition-colors ${
                      selectedCurrency === 'UZS' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                        : 'border-gray-300'
                    }`}
                    title="UZS"
                  >
                    UZS
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCurrency('USD');
                    }}
                    className={`px-1.5 py-0.5 text-xs border rounded hover:bg-gray-100 transition-colors ${
                      selectedCurrency === 'USD' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                        : 'border-gray-300'
                    }`}
                    title="USD"
                  >
                    USD
                  </button>
                </div>
              )}
            </SortableHeader>
          );
        })}
      </tr>
    </thead>
  );
}
