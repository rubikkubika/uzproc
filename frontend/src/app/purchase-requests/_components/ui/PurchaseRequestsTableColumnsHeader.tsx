'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ArrowDown, ArrowUpDown, Eye, Search, HelpCircle, Check, Clock, MessageCircle, Star } from 'lucide-react';
import { SortField, SortDirection, TabType } from '../types/purchase-request.types';
import SortableHeader from './SortableHeader';
import CfoFilterDropdown from '../filters/CfoFilterDropdown';
import StatusFilterDropdown from '../filters/StatusFilterDropdown';
import PurchaserFilterDropdown from '../filters/PurchaserFilterDropdown';

interface PurchaseRequestsTableColumnsHeaderProps {
  // Колонки
  filteredColumnOrder: string[];
  visibleColumns: Set<string>;
  activeTab: TabType;
  
  // Сортировка
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  
  // Фильтры
  filtersFromHook: Record<string, string>;
  localFilters: Record<string, string>;
  handleFilterChangeForHeader: (columnKey: string, value: string) => void;
  handleSelectFilterChange: (field: string, value: string) => void;
  focusedField: string | null;
  handleFocusForHeader: (columnKey: string) => void;
  handleBlurForHeader: (e: React.FocusEvent<HTMLInputElement>, columnKey: string) => void;
  
  // Множественные фильтры
  cfoFilter: Set<string>;
  statusFilter: Set<string>;
  purchaserFilter: Set<string>;
  
  // Фильтры - открытие/закрытие
  isCfoFilterOpen: boolean;
  isStatusFilterOpen: boolean;
  isPurchaserFilterOpen: boolean;
  cfoFilterPosition: { top: number; left: number } | null;
  statusFilterPosition: { top: number; left: number } | null;
  purchaserFilterPosition: { top: number; left: number } | null;
  cfoFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  statusFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  purchaserFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
  
  // Фильтры - поиск
  cfoSearchQuery: string;
  statusSearchQuery: string;
  purchaserSearchQuery: string;
  onCfoSearchChange: (query: string) => void;
  onStatusSearchChange: (query: string) => void;
  onPurchaserSearchChange: (query: string) => void;
  
  // Фильтры - обработчики
  onCfoToggle: (value: string) => void;
  onStatusToggle: (value: string) => void;
  onPurchaserToggle: (value: string) => void;
  onCfoSelectAll: () => void;
  onCfoDeselectAll: () => void;
  onStatusSelectAll: () => void;
  onStatusDeselectAll: () => void;
  onPurchaserSelectAll: () => void;
  onPurchaserDeselectAll: () => void;
  onCfoFilterToggle: () => void;
  onStatusFilterToggle: () => void;
  onPurchaserFilterToggle: () => void;
  
  // Опции фильтров
  getFilteredCfoOptions: string[];
  getFilteredStatusOptions: string[];
  getFilteredPurchaserOptions: string[];
  
  // Drag and drop
  draggedColumn: string | null;
  dragOverColumn: string | null;
  onDragStart: (e: React.DragEvent, columnKey: string) => void;
  onDragOver: (e: React.DragEvent, columnKey: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, columnKey: string) => void;
  
  // Resize
  getColumnWidth: (columnKey: string) => number;
  onResizeStart: (e: React.MouseEvent, columnKey: string) => void;
  
  // Локальные фильтры - обновление
  onLocalFiltersChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;

  // Фильтр по дате создания (год и месяц)
  allYears: number[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
}

/**
 * Компонент заголовка таблицы заявок на закупку
 * Рендерит все колонки с фильтрами и сортировкой
 */
export default function PurchaseRequestsTableColumnsHeader({
  filteredColumnOrder,
  visibleColumns,
  activeTab,
  sortField,
  sortDirection,
  onSort,
  filtersFromHook,
  localFilters,
  handleFilterChangeForHeader,
  handleSelectFilterChange,
  focusedField,
  handleFocusForHeader,
  handleBlurForHeader,
  cfoFilter,
  statusFilter,
  purchaserFilter,
  isCfoFilterOpen,
  isStatusFilterOpen,
  isPurchaserFilterOpen,
  cfoFilterPosition,
  statusFilterPosition,
  purchaserFilterPosition,
  cfoFilterButtonRef,
  statusFilterButtonRef,
  purchaserFilterButtonRef,
  cfoSearchQuery,
  statusSearchQuery,
  purchaserSearchQuery,
  onCfoSearchChange,
  onStatusSearchChange,
  onPurchaserSearchChange,
  onCfoToggle,
  onStatusToggle,
  onPurchaserToggle,
  onCfoSelectAll,
  onCfoDeselectAll,
  onStatusSelectAll,
  onStatusDeselectAll,
  onPurchaserSelectAll,
  onPurchaserDeselectAll,
  onCfoFilterToggle,
  onStatusFilterToggle,
  onPurchaserFilterToggle,
  getFilteredCfoOptions,
  getFilteredStatusOptions,
  getFilteredPurchaserOptions,
  draggedColumn,
  dragOverColumn,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  getColumnWidth,
  onResizeStart,
  onLocalFiltersChange,
  allYears,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: PurchaseRequestsTableColumnsHeaderProps) {
  const [showTrackTip, setShowTrackTip] = useState(false);
  const trackTipTriggerRef = useRef<HTMLSpanElement>(null);
  const [trackTipPosition, setTrackTipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!showTrackTip || !trackTipTriggerRef.current) {
      setTrackTipPosition(null);
      return;
    }
    const rect = trackTipTriggerRef.current.getBoundingClientRect();
    setTrackTipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
  }, [showTrackTip]);

  return (
    <thead className="bg-gray-50 sticky top-[88px] z-20 [&_th]:pt-2">
      <tr>
        {filteredColumnOrder.map(columnKey => {
          const isDragging = draggedColumn === columnKey;
          const isDragOver = dragOverColumn === columnKey;
          
          // Колонка "excludeFromInWork" - иконка Eye
          if (columnKey === 'excludeFromInWork') {
            return (
              <th 
                key={columnKey}
                className="px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative w-12"
              >
                <div className="flex items-center justify-center">
                  <Eye className="w-4 h-4 text-gray-400" />
                </div>
              </th>
            );
          }
          
          // Простые колонки через SortableHeader
          if (columnKey === 'idPurchaseRequest') {
            return (
              <SortableHeader
                key={columnKey}
                field="idPurchaseRequest"
                label="Номер"
                columnKey="idPurchaseRequest"
                width={getColumnWidth('idPurchaseRequest')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.idPurchaseRequest || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('idPurchaseRequest', value)}
                onFocus={() => handleFocusForHeader('idPurchaseRequest')}
                onBlur={(e) => handleBlurForHeader(e, 'idPurchaseRequest')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'guid') {
            return (
              <SortableHeader
                key={columnKey}
                field="guid"
                label="GUID"
                columnKey="guid"
                width={getColumnWidth('guid')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.guid || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('guid', value)}
                onFocus={() => handleFocusForHeader('guid')}
                onBlur={(e) => handleBlurForHeader(e, 'guid')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'purchaseRequestPlanYear') {
            return (
              <SortableHeader
                key={columnKey}
                field="purchaseRequestPlanYear"
                label="Год плана"
                columnKey="purchaseRequestPlanYear"
                width={getColumnWidth('purchaseRequestPlanYear')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.purchaseRequestPlanYear || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('purchaseRequestPlanYear', value)}
                onFocus={() => handleFocusForHeader('purchaseRequestPlanYear')}
                onBlur={(e) => handleBlurForHeader(e, 'purchaseRequestPlanYear')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'company') {
            return (
              <SortableHeader
                key={columnKey}
                field="company"
                label="Компания"
                columnKey="company"
                width={getColumnWidth('company')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.company || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('company', value)}
                onFocus={() => handleFocusForHeader('company')}
                onBlur={(e) => handleBlurForHeader(e, 'company')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'mcc') {
            return (
              <SortableHeader
                key={columnKey}
                field="mcc"
                label="МЦК"
                columnKey="mcc"
                width={getColumnWidth('mcc')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.mcc || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('mcc', value)}
                onFocus={() => handleFocusForHeader('mcc')}
                onBlur={(e) => handleBlurForHeader(e, 'mcc')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'purchaseRequestInitiator') {
            return (
              <SortableHeader
                key={columnKey}
                field="purchaseRequestInitiator"
                label="Инициатор"
                columnKey="purchaseRequestInitiator"
                width={getColumnWidth('purchaseRequestInitiator')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.purchaseRequestInitiator || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('purchaseRequestInitiator', value)}
                onFocus={() => handleFocusForHeader('purchaseRequestInitiator')}
                onBlur={(e) => handleBlurForHeader(e, 'purchaseRequestInitiator')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'name') {
            return (
              <SortableHeader
                key={columnKey}
                field="name"
                label="Наименование"
                columnKey="name"
                width={getColumnWidth('name')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.name || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('name', value)}
                onFocus={() => handleFocusForHeader('name')}
                onBlur={(e) => handleBlurForHeader(e, 'name')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'purchaseRequestCreationDate') {
            const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
            return (
              <th
                key={columnKey}
                draggable
                onDragStart={(e) => onDragStart(e, columnKey)}
                onDragOver={(e) => onDragOver(e, columnKey)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, columnKey)}
                className={`px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                style={{ width: `${getColumnWidth('purchaseRequestCreationDate')}px`, minWidth: `${getColumnWidth('purchaseRequestCreationDate')}px`, maxWidth: `${getColumnWidth('purchaseRequestCreationDate')}px`, verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-[20px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px' }}>
                    <select
                      value={selectedYear ?? ''}
                      onChange={(e) => onYearChange(e.target.value ? Number(e.target.value) : null)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ height: '20px', minHeight: '20px', maxHeight: '20px', boxSizing: 'border-box' }}
                      title="Год назначения"
                    >
                      <option value="">Год</option>
                      {allYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMonth ?? ''}
                      onChange={(e) => onMonthChange(e.target.value ? Number(e.target.value) : null)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ height: '20px', minHeight: '20px', maxHeight: '20px', boxSizing: 'border-box' }}
                      title="Месяц"
                    >
                      <option value="">Месяц</option>
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={String(idx + 1)}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1 min-h-[16px]">
                    <button
                      type="button"
                      onClick={() => onSort('purchaseRequestCreationDate')}
                      className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
                      style={{ width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px', minHeight: '20px', maxHeight: '20px', padding: 0 }}
                      title="Сортировка"
                    >
                      {sortField === 'purchaseRequestCreationDate' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                    <span className="text-xs font-medium text-gray-500 tracking-wider">Назначение на закупщика</span>
                  </div>
                </div>
              </th>
            );
          }

          if (columnKey === 'comments') {
            return (
              <th
                key={columnKey}
                draggable
                onDragStart={(e) => onDragStart(e, columnKey)}
                onDragOver={(e) => onDragOver(e, columnKey)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, columnKey)}
                className={`px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                style={{ width: `${getColumnWidth('comments')}px`, minWidth: `${getColumnWidth('comments')}px`, maxWidth: `${getColumnWidth('comments')}px`, verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-[20px] flex items-center flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px' }}></div>
                  <span className="min-h-[16px] flex items-center justify-center" title="Комментарии">
                    <MessageCircle className="w-4 h-4 text-gray-500" aria-hidden />
                  </span>
                </div>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
                  onMouseDown={(e) => onResizeStart(e, 'comments')}
                  style={{ zIndex: 10 }}
                />
              </th>
            );
          }
          
          if (columnKey === 'requiresPurchase') {
            return (
              <SortableHeader
                key={columnKey}
                field="requiresPurchase"
                label="Закупка"
                filterType="select"
                filterOptions={['Закупка', 'Заказ']}
                columnKey="requiresPurchase"
                width={getColumnWidth('requiresPurchase')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={filtersFromHook.requiresPurchase || ''}
                onFilterChange={(value) => handleSelectFilterChange('requiresPurchase', value)}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'createdAt') {
            return (
              <SortableHeader
                key={columnKey}
                field="createdAt"
                label="Дата создания (системная)"
                columnKey="createdAt"
                width={getColumnWidth('createdAt')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.createdAt || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('createdAt', value)}
                onFocus={() => handleFocusForHeader('createdAt')}
                onBlur={(e) => handleBlurForHeader(e, 'createdAt')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          if (columnKey === 'updatedAt') {
            return (
              <SortableHeader
                key={columnKey}
                field="updatedAt"
                label="Дата обновления"
                columnKey="updatedAt"
                width={getColumnWidth('updatedAt')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.updatedAt || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('updatedAt', value)}
                onFocus={() => handleFocusForHeader('updatedAt')}
                onBlur={(e) => handleBlurForHeader(e, 'updatedAt')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          // Колонка ЦФО с выпадающим фильтром
          if (columnKey === 'cfo') {
            return (
              <th
                key={columnKey}
                draggable
                onDragStart={(e) => onDragStart(e, columnKey)}
                onDragOver={(e) => onDragOver(e, columnKey)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, columnKey)}
                className={`px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                style={{ width: `${getColumnWidth('cfo')}px`, minWidth: `${getColumnWidth('cfo')}px`, maxWidth: `${getColumnWidth('cfo')}px`, verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-[20px] flex items-center flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px' }}>
                    <div className="relative cfo-filter-container w-full h-full">
                      <button
                        ref={cfoFilterButtonRef}
                        type="button"
                        onClick={onCfoFilterToggle}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                        style={{ height: '20px', minHeight: '20px', maxHeight: '20px', boxSizing: 'border-box' }}
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
                      <CfoFilterDropdown
                        isOpen={isCfoFilterOpen}
                        position={cfoFilterPosition}
                        searchQuery={cfoSearchQuery}
                        options={getFilteredCfoOptions}
                        selectedValues={cfoFilter}
                        onSearchChange={onCfoSearchChange}
                        onToggle={onCfoToggle}
                        onSelectAll={onCfoSelectAll}
                        onDeselectAll={onCfoDeselectAll}
                        onClose={onCfoFilterToggle}
                        buttonRef={cfoFilterButtonRef}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 min-h-[16px]">
                    <button
                      onClick={() => onSort('cfo')}
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
                  onMouseDown={(e) => onResizeStart(e, 'cfo')}
                  style={{ zIndex: 10 }}
                />
              </th>
            );
          }
          
          // Колонка Закупщик с выпадающим фильтром
          if (columnKey === 'purchaser') {
            return (
              <th
                key={columnKey}
                draggable
                onDragStart={(e) => onDragStart(e, columnKey)}
                onDragOver={(e) => onDragOver(e, columnKey)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, columnKey)}
                className={`px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                style={{ width: `${getColumnWidth('purchaser')}px`, minWidth: `${getColumnWidth('purchaser')}px`, maxWidth: `${getColumnWidth('purchaser')}px`, verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-[20px] flex items-center flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px' }}>
                    <div className="relative purchaser-filter-container w-full h-full">
                      <button
                        ref={purchaserFilterButtonRef}
                        type="button"
                        onClick={onPurchaserFilterToggle}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
                        style={{ height: '20px', minHeight: '20px', maxHeight: '20px', boxSizing: 'border-box' }}
                      >
                        <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                          {purchaserFilter.size === 0
                            ? 'Все'
                            : purchaserFilter.size === 1
                            ? (Array.from(purchaserFilter)[0] || 'Все')
                            : `${purchaserFilter.size} выбрано`}
                        </span>
                        <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isPurchaserFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <PurchaserFilterDropdown
                        isOpen={isPurchaserFilterOpen}
                        position={purchaserFilterPosition}
                        searchQuery={purchaserSearchQuery}
                        options={getFilteredPurchaserOptions}
                        selectedValues={purchaserFilter}
                        onSearchChange={onPurchaserSearchChange}
                        onToggle={onPurchaserToggle}
                        onSelectAll={onPurchaserSelectAll}
                        onDeselectAll={onPurchaserDeselectAll}
                        onClose={onPurchaserFilterToggle}
                        buttonRef={purchaserFilterButtonRef}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 min-h-[16px]">
                    <button
                      onClick={() => onSort('purchaser')}
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
                  onMouseDown={(e) => onResizeStart(e, 'purchaser')}
                  style={{ zIndex: 10 }}
                />
              </th>
            );
          }
          
          // Колонка Статус с выпадающим фильтром
          if (columnKey === 'status') {
            return (
              <th
                key={columnKey}
                draggable
                onDragStart={(e) => onDragStart(e, columnKey)}
                onDragOver={(e) => onDragOver(e, columnKey)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, columnKey)}
                className={`px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                style={{ verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-[20px] flex items-center flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px' }}>
                    <div className="relative status-filter-container w-full h-full">
                      <button
                        ref={statusFilterButtonRef}
                        type="button"
                        onClick={onStatusFilterToggle}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:bg-gray-50"
                        style={{ height: '20px', minHeight: '20px', maxHeight: '20px', boxSizing: 'border-box' }}
                      >
                        <span className="text-gray-600 truncate">
                          {statusFilter.size === 0 
                            ? 'Все' 
                            : statusFilter.size === 1
                            ? Array.from(statusFilter)[0]
                            : `${statusFilter.size} выбрано`}
                        </span>
                        <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isStatusFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <StatusFilterDropdown
                        isOpen={isStatusFilterOpen}
                        position={statusFilterPosition}
                        searchQuery={statusSearchQuery}
                        options={getFilteredStatusOptions}
                        selectedValues={statusFilter}
                        onSearchChange={onStatusSearchChange}
                        onToggle={onStatusToggle}
                        onSelectAll={onStatusSelectAll}
                        onDeselectAll={onStatusDeselectAll}
                        onClose={onStatusFilterToggle}
                        buttonRef={statusFilterButtonRef}
                      />
                    </div>
                  </div>
                  <span className="normal-case min-h-[16px] flex items-center">Статус</span>
                </div>
              </th>
            );
          }
          
          // Колонка Бюджет с оператором и числовым фильтром
          if (columnKey === 'budgetAmount') {
            return (
              <th
                key={columnKey}
                draggable
                onDragStart={(e) => onDragStart(e, columnKey)}
                onDragOver={(e) => onDragOver(e, columnKey)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, columnKey)}
                className={`px-2 py-0.5 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''} cursor-move`}
                style={{ width: `${getColumnWidth('budgetAmount')}px`, minWidth: `${getColumnWidth('budgetAmount')}px`, maxWidth: `${getColumnWidth('budgetAmount')}px`, verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-1" style={{ minWidth: 0, width: '100%' }}>
                  <div className="h-[20px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px', minWidth: 0, width: '100%' }}>
                    <div className="relative flex-1" style={{ minWidth: 0 }}>
                      <select
                        value={localFilters.budgetAmountOperator || 'gte'}
                        onChange={(e) => {
                          e.stopPropagation();
                          onLocalFiltersChange(prev => ({
                            ...prev,
                            budgetAmountOperator: e.target.value,
                          }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`absolute left-0 top-0 h-full text-xs border-0 border-r border-gray-300 rounded-l px-1 py-0 focus:outline-none focus:ring-0 appearance-none cursor-pointer z-10 transition-colors ${
                          localFilters.budgetAmountOperator && ['gt', 'gte', 'lt', 'lte'].includes(localFilters.budgetAmountOperator)
                            ? 'bg-blue-500 text-white font-semibold'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                        style={{ width: '42px', minWidth: '42px', paddingRight: '4px', height: '24px', minHeight: '20px', maxHeight: '20px', boxSizing: 'border-box' }}
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
                          const value = localFilters.budgetAmount || filtersFromHook.budgetAmount || '';
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
                          onLocalFiltersChange(prev => ({
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
                          handleFocusForHeader('budgetAmount');
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
                              handleBlurForHeader(e, 'budgetAmount');
                            }
                          }, 200);
                        }}
                        placeholder="Число"
                        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 pl-11 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ height: '24px', minHeight: '20px', maxHeight: '20px', minWidth: 0, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 min-h-[16px]">
                    <button
                      onClick={() => onSort('budgetAmount')}
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
                  onMouseDown={(e) => onResizeStart(e, 'budgetAmount')}
                  style={{ zIndex: 10 }}
                />
              </th>
            );
          }
          
          // Колонка "Трэк" - только для вкладок кроме "Завершенные"
          if (columnKey === 'track') {
            if (activeTab === 'completed') {
              return null;
            }
            return (
              <th
                key={columnKey}
                draggable
                onDragStart={(e) => onDragStart(e, columnKey)}
                onDragOver={(e) => onDragOver(e, columnKey)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, columnKey)}
                className={`px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                style={{ verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-[20px] flex items-center flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px' }}></div>
                  <div className="normal-case min-h-[16px] flex items-center gap-1">
                    <span>Трэк</span>
                    <span
                      ref={trackTipTriggerRef}
                      className="inline-flex shrink-0"
                      onMouseEnter={() => setShowTrackTip(true)}
                      onMouseLeave={() => setShowTrackTip(false)}
                    >
                      <span className="inline-flex text-blue-500 hover:text-blue-600 cursor-help" aria-label="Подсказка по элементам колонки Трэк">
                        <HelpCircle className="w-3.5 h-3.5" aria-hidden />
                      </span>
                    </span>
                  </div>
                </div>
                {typeof document !== 'undefined' &&
                  showTrackTip &&
                  trackTipPosition &&
                  createPortal(
                    <div
                      className="fixed z-[9999] px-3 py-2.5 text-xs text-gray-900 bg-white border border-gray-300 rounded-lg shadow-xl pointer-events-none max-w-[320px]"
                      role="tooltip"
                      style={{
                        left: trackTipPosition.x,
                        top: trackTipPosition.y,
                        transform: 'translate(-50%, 0)',
                      }}
                    >
                      <div className="font-medium text-gray-700 mb-2">Элементы колонки «Трэк»</div>
                      {/* Образец контента */}
                      <div className="inline-flex flex-col gap-1 rounded border border-gray-400 px-1.5 py-1 mb-2 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[10px] text-gray-600">Заявка</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-0.5">
                              <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-3 h-3 text-white" />
                              </div>
                              <span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold">5</span>
                              <span className="min-w-[1.75rem] h-5 rounded bg-green-600 flex items-center justify-center text-white text-[10px] font-bold">+2</span>
                            </div>
                            <span className="text-[10px] text-gray-600">Закупка</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-5 h-5 rounded-full bg-gray-300 flex-shrink-0" />
                            <span className="text-[10px] text-gray-600">Договор</span>
                          </div>
                        </div>
                      </div>
                      {/* Пояснения со стрелками */}
                      <ul className="space-y-1 text-gray-700">
                        <li><span className="text-gray-500">↳ Заявка</span> — этап заявки: зелёный = пройден, жёлтый = в работе, красный = отклонено</li>
                        <li><span className="text-gray-500">↳ Закупка</span> — круг (этап) + факт (дни) + дельта (план−факт; зелёный/жёлтый/красный)</li>
                        <li><span className="text-gray-500">↳ Договор</span> — этап договора по статусу (серый = не начат)</li>
                      </ul>
                    </div>,
                    document.body
                  )}
              </th>
            );
          }
          
          // Колонка "Оценка" - для вкладок "Завершенные" и "В работе"
          if (columnKey === 'rating' && (activeTab === 'completed' || activeTab === 'in-work')) {
            return (
              <th
                key={columnKey}
                className="px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300"
                style={{ width: `${getColumnWidth('rating')}px`, minWidth: `${getColumnWidth('rating')}px`, maxWidth: `${getColumnWidth('rating')}px`, verticalAlign: 'top' }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="h-[20px] flex items-center flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px' }}></div>
                  <span className="min-h-[16px] flex items-center justify-center" title="Оценка">
                    <Star className="w-4 h-4 text-gray-500" aria-hidden />
                  </span>
                </div>
              </th>
            );
          }
          
          // Колонка "Валюта"
          if (columnKey === 'currency') {
            return (
              <SortableHeader
                key={columnKey}
                field="currency"
                label="Валюта"
                columnKey="currency"
                width={getColumnWidth('currency')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.currency || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('currency', value)}
                onFocus={() => handleFocusForHeader('currency')}
                onBlur={(e) => handleBlurForHeader(e, 'currency')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          // Колонка "Тип затрат"
          if (columnKey === 'costType') {
            return (
              <SortableHeader
                key={columnKey}
                field="costType"
                label="Тип затрат"
                columnKey="costType"
                width={getColumnWidth('costType')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.costType || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('costType', value)}
                onFocus={() => handleFocusForHeader('costType')}
                onBlur={(e) => handleBlurForHeader(e, 'costType')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          // Колонка "Тип договора"
          if (columnKey === 'contractType') {
            return (
              <SortableHeader
                key={columnKey}
                field="contractType"
                label="Тип договора"
                columnKey="contractType"
                width={getColumnWidth('contractType')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.contractType || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('contractType', value)}
                onFocus={() => handleFocusForHeader('contractType')}
                onBlur={(e) => handleBlurForHeader(e, 'contractType')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          // Колонка "Длительность договора (мес)"
          if (columnKey === 'contractDurationMonths') {
            return (
              <SortableHeader
                key={columnKey}
                field="contractDurationMonths"
                label="Длительность (мес)"
                columnKey="contractDurationMonths"
                width={getColumnWidth('contractDurationMonths')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.contractDurationMonths || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('contractDurationMonths', value)}
                onFocus={() => handleFocusForHeader('contractDurationMonths')}
                onBlur={(e) => handleBlurForHeader(e, 'contractDurationMonths')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }
          
          // Колонка "Плановая/Внеплановая"
          if (columnKey === 'isPlanned') {
            return (
              <SortableHeader
                key={columnKey}
                field="isPlanned"
                label="План"
                filterType="select"
                filterOptions={['Плановая', 'Внеплановая']}
                columnKey="isPlanned"
                width={getColumnWidth('isPlanned')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={filtersFromHook.isPlanned || ''}
                onFilterChange={(value) => handleSelectFilterChange('isPlanned', value)}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }

          // Колонка "План"
          if (columnKey === 'hasLinkedPlanItem') {
            return (
              <SortableHeader
                key={columnKey}
                field="hasLinkedPlanItem"
                label="План"
                filterType="select"
                filterOptions={['В плане', 'Не в плане']}
                columnKey="hasLinkedPlanItem"
                width={getColumnWidth('hasLinkedPlanItem')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={filtersFromHook.hasLinkedPlanItem || ''}
                onFilterChange={(value) => handleSelectFilterChange('hasLinkedPlanItem', value)}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }

          // Колонка "Сложность"
          if (columnKey === 'complexity') {
            return (
              <SortableHeader
                key={columnKey}
                field="complexity"
                label="Сложность"
                columnKey="complexity"
                width={getColumnWidth('complexity')}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                filterValue={localFilters.complexity || ''}
                onFilterChange={(value) => handleFilterChangeForHeader('complexity', value)}
                onFocus={() => handleFocusForHeader('complexity')}
                onBlur={(e) => handleBlurForHeader(e, 'complexity')}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isDragged={isDragging}
                isDragOver={isDragOver}
                onResizeStart={onResizeStart}
              />
            );
          }

          return null;
        })}
      </tr>
    </thead>
  );
}
