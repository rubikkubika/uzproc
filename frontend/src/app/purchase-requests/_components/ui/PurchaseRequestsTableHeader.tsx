'use client';

import React from 'react';
import { Download, Copy, Settings } from 'lucide-react';
import PurchaseRequestsTableColumnsMenu from './PurchaseRequestsTableColumnsMenu';

interface PurchaseRequestsTableHeaderProps {
  // Данные
  allItemsCount: number;
  totalElements: number | undefined;
  allYears: number[];
  selectedYear: number | null;
  
  // Колонки
  visibleColumns: Set<string>;
  isColumnsMenuOpen: boolean;
  columnsMenuPosition: { top: number; left: number } | null;
  columnsMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  toggleColumnVisibility: (key: string) => void;
  selectAllColumns: () => void;
  selectDefaultColumns: () => void;
  setIsColumnsMenuOpen: (open: boolean) => void;
  
  // Обработчики
  onResetFilters: () => void;
  onYearChange: (year: number | null) => void;
  onExportToExcel: () => void;
  onCopyToClipboard: () => void;
}

/**
 * Компонент заголовка таблицы заявок на закупку
 * Содержит счетчик записей, кнопки управления, фильтры по году, настройки колонок и экспорт
 */
export default function PurchaseRequestsTableHeader({
  allItemsCount,
  totalElements,
  allYears,
  selectedYear,
  visibleColumns,
  isColumnsMenuOpen,
  columnsMenuPosition,
  columnsMenuButtonRef,
  toggleColumnVisibility,
  selectAllColumns,
  selectDefaultColumns,
  setIsColumnsMenuOpen,
  onResetFilters,
  onYearChange,
  onExportToExcel,
  onCopyToClipboard,
}: PurchaseRequestsTableHeaderProps) {
  return (
    <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Кнопка - Сбросить фильтры */}
        <button
          onClick={onResetFilters}
          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
        >
          Сбросить фильтры
        </button>
        
        {/* Фильтр по дате назначения на закупщика (год) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Дата назначения (год):</span>
          <button
            onClick={() => onYearChange(null)}
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
              onClick={() => onYearChange(year)}
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
        
        {/* Кнопка настройки колонок */}
        <div className="relative">
          <button
            ref={columnsMenuButtonRef}
            onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
            title="Настройка колонок"
          >
            <Settings className="w-3 h-3" />
            Колонки
          </button>
          <PurchaseRequestsTableColumnsMenu
            visibleColumns={visibleColumns}
            isOpen={isColumnsMenuOpen}
            position={columnsMenuPosition}
            toggleColumnVisibility={toggleColumnVisibility}
            selectAllColumns={selectAllColumns}
            selectDefaultColumns={selectDefaultColumns}
            onClose={() => setIsColumnsMenuOpen(false)}
            buttonRef={columnsMenuButtonRef}
          />
        </div>
        
        {/* Кнопки экспорта и копирования */}
        <div className="flex items-center gap-1">
          <button
            onClick={onExportToExcel}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
            title="Сохранить в Excel"
          >
            <Download className="w-3 h-3" />
            Excel
          </button>
          <button
            onClick={onCopyToClipboard}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
            title="Копировать в буфер обмена"
          >
            <Copy className="w-3 h-3" />
            Копировать
          </button>
        </div>
      </div>
      {/* Информация о количестве записей справа */}
      <div className="text-xs text-gray-700 flex-shrink-0">
        Показано {allItemsCount || 0} из {totalElements || 0} записей
      </div>
    </div>
  );
}
