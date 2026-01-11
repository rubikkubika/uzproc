'use client';

import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '../constants/purchase-plan-items.constants';

interface PurchasePlanItemsTableColumnsMenuProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  visibleColumns: Set<string>;
  onToggleColumn: (columnKey: string) => void;
  onReset: () => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Компонент меню для выбора видимых колонок таблицы
 */
export default function PurchasePlanItemsTableColumnsMenu({
  isOpen,
  position,
  visibleColumns,
  onToggleColumn,
  onReset,
  onClose,
  buttonRef,
}: PurchasePlanItemsTableColumnsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрываем при клике вне компонента
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen || !position) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '250px',
        maxWidth: '350px',
      }}
    >
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Видимые колонки</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {ALL_COLUMNS.map((column) => {
            const isVisible = visibleColumns.has(column.key);
            const isDefault = DEFAULT_VISIBLE_COLUMNS.includes(column.key);
            
            return (
              <label
                key={column.key}
                className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer rounded"
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => onToggleColumn(column.key)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 flex-1">{column.label}</span>
                {isDefault && (
                  <span className="text-xs text-gray-400 ml-2">(по умолчанию)</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="p-2 border-t border-gray-200 flex justify-between gap-2">
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700"
        >
          Сбросить
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
