'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SortField, SortDirection } from '../types/purchase-request.types';

interface SortableHeaderProps {
  field: SortField;
  label: string;
  filterType?: 'text' | 'select';
  filterOptions?: string[];
  columnKey?: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  width?: number;
  // Drag and drop
  onDragStart?: (e: React.DragEvent, columnKey: string) => void;
  onDragOver?: (e: React.DragEvent, columnKey: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, columnKey: string) => void;
  isDragged?: boolean;
  isDragOver?: boolean;
  // Resize
  onResizeStart?: (e: React.MouseEvent, columnKey: string) => void;
}

/**
 * Компонент заголовка колонки с сортировкой и фильтром
 * Используется в каждой колонке таблицы заявок на закупку
 */
export default function SortableHeader({
  field,
  label,
  filterType = 'text',
  filterOptions = [],
  columnKey,
  sortField,
  sortDirection,
  onSort,
  filterValue = '',
  onFilterChange,
  onFocus,
  onBlur,
  width,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragged = false,
  isDragOver = false,
  onResizeStart,
}: SortableHeaderProps) {
  const fieldKey = field || '';
  const isSorted = sortField === field;
  
  const style: React.CSSProperties = width 
    ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px`, verticalAlign: 'top', overflow: 'hidden' }
    : { verticalAlign: 'top', overflow: 'hidden' };

  return (
    <th 
      draggable={!!columnKey}
      onDragStart={columnKey && onDragStart ? (e) => onDragStart(e, columnKey) : undefined}
      onDragOver={columnKey && onDragOver ? (e) => onDragOver(e, columnKey) : undefined}
      onDragLeave={columnKey && onDragLeave ? onDragLeave : undefined}
      onDrop={columnKey && onDrop ? (e) => onDrop(e, columnKey) : undefined}
      className={`px-2 py-0 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 relative ${columnKey ? 'cursor-move' : ''} ${isDragged ? 'opacity-50' : ''} ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
      style={style}
    >
      <div className="flex flex-col gap-0.5" style={{ minWidth: 0, width: '100%' }}>
        {/* Верхний уровень - фильтр */}
        <div className="h-[20px] flex items-center gap-1 flex-shrink-0" style={{ minHeight: '20px', maxHeight: '20px', minWidth: 0, width: '100%' }}>
          {filterType === 'select' && filterOptions.length > 0 ? (
            <select
              value={filterValue}
              onChange={(e) => {
                e.stopPropagation();
                onFilterChange?.(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ height: '20px', minHeight: '20px', maxHeight: '20px', minWidth: 0, boxSizing: 'border-box' }}
            >
              <option value="">Все</option>
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : filterType === 'text' && onFilterChange ? (
            <input
              key={`filter-${fieldKey}`}
              type="text"
              data-filter-field={fieldKey}
              value={filterValue}
              onChange={(e) => {
                onFilterChange(e.target.value);
              }}
              onFocus={(e) => {
                e.stopPropagation();
                onFocus?.();
              }}
              onBlur={(e) => {
                onBlur?.(e);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.stopPropagation();
                }
              }}
              className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Фильтр"
              style={{ height: '20px', minHeight: '20px', maxHeight: '20px', minWidth: 0, boxSizing: 'border-box' }}
            />
          ) : (
            <div className="flex-1" style={{ height: '20px', minHeight: '20px', maxHeight: '20px', minWidth: 0 }}></div>
          )}
        </div>
        
        {/* Нижний уровень - сортировка и название */}
        <div className="flex items-center gap-1 min-h-[16px]">
          {field ? (
            <button
              onClick={() => onSort(field)}
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
      {columnKey && onResizeStart && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent"
          onMouseDown={(e) => onResizeStart(e, columnKey)}
          style={{ zIndex: 10 }}
        />
      )}
    </th>
  );
}
