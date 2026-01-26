'use client';

import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '../constants/columns.constants';

interface PurchaseRequestsTableColumnsMenuProps {
  visibleColumns: Set<string>;
  isOpen: boolean;
  position: { top: number; left: number } | null;
  toggleColumnVisibility: (key: string) => void;
  selectAllColumns: () => void;
  selectDefaultColumns: () => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
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
  onClose,
  buttonRef,
}: PurchaseRequestsTableColumnsMenuProps) {
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
      data-columns-menu
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '250px',
        maxWidth: '350px',
      }}
    >
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-900" style={{ fontSize: '16.8px' }}>Видимые колонки</h3>
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
                  onChange={() => toggleColumnVisibility(column.key)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-900 flex-1" style={{ fontSize: '16.8px' }}>{column.label}</span>
                {isDefault && (
                  <span className="text-gray-400 ml-2" style={{ fontSize: '14px' }}>(по умолчанию)</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="p-2 border-t border-gray-200 flex justify-between gap-2">
        <button
          onClick={selectDefaultColumns}
          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors font-medium"
        >
          По умолчанию
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
