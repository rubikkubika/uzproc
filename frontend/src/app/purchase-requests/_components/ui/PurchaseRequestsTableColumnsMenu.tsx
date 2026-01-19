'use client';

import React from 'react';
import { ALL_COLUMNS } from '../constants/columns.constants';

interface PurchaseRequestsTableColumnsMenuProps {
  visibleColumns: Set<string>;
  isOpen: boolean;
  position: { top: number; left: number } | null;
  toggleColumnVisibility: (key: string) => void;
  selectAllColumns: () => void;
  selectDefaultColumns: () => void;
}

/**
 * Компонент меню выбора колонок для таблицы заявок на закупку
 */
export default function PurchaseRequestsTableColumnsMenu({
  visibleColumns,
  isOpen,
  position,
  toggleColumnVisibility,
  selectAllColumns,
  selectDefaultColumns,
}: PurchaseRequestsTableColumnsMenuProps) {
  if (!isOpen || !position) return null;

  return (
    <div 
      data-columns-menu="true"
      className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Выбор колонок</h3>
      </div>
      <div className="p-2 border-b border-gray-200 flex gap-2">
        <button
          onClick={selectAllColumns}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Все
        </button>
        <button
          onClick={selectDefaultColumns}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          По умолчанию
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
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
  );
}
