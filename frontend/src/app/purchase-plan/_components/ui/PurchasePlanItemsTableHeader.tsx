'use client';

import React from 'react';
import { Download, Settings, Plus, X, Search } from 'lucide-react';
import { PurchasePlanItem, SortField, SortDirection } from '../types/purchase-plan-items.types';

interface PurchaserSummaryItem {
  purchaser: string;
  count: number;
  totalBudget: number;
  totalComplexity: number;
}

interface PurchasePlanItemsTableHeaderProps {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  allYears: number[];
  selectedMonths: Set<number>;
  setSelectedMonths: (months: Set<number>) => void;
  selectedMonthYear: number | null;
  setSelectedMonthYear: (year: number | null) => void;
  selectedCurrency: 'UZS' | 'USD';
  setSelectedCurrency: (currency: 'UZS' | 'USD') => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportExcelAll: () => void;
  onCreateVersion: () => void;
  onViewVersions: () => void;
  onCreateItem: () => void;
  onColumnsSettings: () => void;
  isViewingArchiveVersion: boolean;
  selectedVersionInfo: any;
  // Новые пропсы для сводной таблицы и фильтров
  purchaserSummary: PurchaserSummaryItem[];
  purchaserFilter: Set<string>;
  setPurchaserFilter: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
  totalRecords: number;
  // Пропсы для сброса фильтров
  onResetFilters: () => void;
  // Пропсы для версий
  selectedVersionId: number | null;
  onCloseVersion: () => void;
  canEdit: boolean;
  // Ref для кнопки колонок
  columnsMenuButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Компонент заголовка таблицы плана закупок
 * Содержит элементы управления: выбор года, месяцев, валюты, экспорт, создание и т.д.
 * Структура соответствует оригинальному файлу PurchasePlanItemsTable.old.tsx
 */
export default function PurchasePlanItemsTableHeader({
  selectedYear,
  setSelectedYear,
  allYears,
  selectedMonths,
  setSelectedMonths,
  selectedMonthYear,
  setSelectedMonthYear,
  selectedCurrency,
  setSelectedCurrency,
  onExportPDF,
  onExportExcel,
  onExportExcelAll,
  onCreateVersion,
  onViewVersions,
  onCreateItem,
  onColumnsSettings,
  isViewingArchiveVersion,
  selectedVersionInfo,
  purchaserSummary,
  purchaserFilter,
  setPurchaserFilter,
  setCurrentPage,
  totalRecords,
  onResetFilters,
  selectedVersionId,
  onCloseVersion,
  canEdit,
  columnsMenuButtonRef,
}: PurchasePlanItemsTableHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
      {/* Сводная таблица по закупщикам и элементы управления */}
      <div className="flex items-start w-full">
        {/* Сводная таблица и элементы управления в одной строке */}
        <div className="flex items-start">
          {/* Сводная таблица */}
          <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
            <div className="overflow-x-auto">
              <table className="border-collapse table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                      Закупщик
                    </th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                      Количество
                    </th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                      Сумма бюджета
                    </th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                      Сложность
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaserSummary.length > 0 ? (
                    purchaserSummary.map((item, index) => {
                      const isSelected = purchaserFilter.has(item.purchaser);
                      return (
                        <tr 
                          key={index} 
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-100 hover:bg-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={(e) => {
                            const newSet = new Set(purchaserFilter);
                            if (e.ctrlKey || e.metaKey) {
                              // Множественный выбор через Ctrl/Cmd
                              if (isSelected) {
                                newSet.delete(item.purchaser);
                              } else {
                                newSet.add(item.purchaser);
                              }
                            } else {
                              // Одиночный выбор - заменяем весь фильтр
                              if (isSelected && purchaserFilter.size === 1) {
                                // Если выбран только этот закупщик, сбрасываем фильтр
                                newSet.clear();
                              } else {
                                // Устанавливаем фильтр только на этого закупщика
                                newSet.clear();
                                newSet.add(item.purchaser);
                              }
                            }
                            setPurchaserFilter(newSet);
                            setCurrentPage(0);
                          }}
                        >
                          <td className="px-2 py-1 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                            {item.purchaser}
                          </td>
                          <td className="px-2 py-1 text-xs text-gray-900 text-right border-r border-gray-200 whitespace-nowrap">
                            {item.count}
                          </td>
                          <td className="px-2 py-1 text-xs text-gray-900 text-right border-r border-gray-200 whitespace-nowrap">
                            {item.totalBudget.toLocaleString('ru-RU', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 0 
                            })}
                          </td>
                          <td className="px-2 py-1 text-xs text-gray-900 text-right whitespace-nowrap">
                            {item.totalComplexity > 0 
                              ? item.totalComplexity.toLocaleString('ru-RU', { 
                                  minimumFractionDigits: 0, 
                                  maximumFractionDigits: 2 
                                })
                              : '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-2 py-1 text-xs text-gray-500 text-center whitespace-nowrap">
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-300">
                  <tr 
                    className="cursor-pointer transition-colors hover:bg-gray-100"
                    onClick={() => {
                      // При клике на "Итого" сбрасываем фильтр по закупщику, чтобы показать все записи
                      setPurchaserFilter(new Set());
                      setCurrentPage(0);
                    }}
                  >
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      Итого
                    </td>
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r border-gray-200 whitespace-nowrap">
                      {(() => {
                        // Если фильтр по закупщику не установлен, показываем сумму всех закупщиков
                        if (purchaserFilter.size === 0) {
                          return purchaserSummary.reduce((sum, item) => sum + item.count, 0);
                        }
                        // Если фильтр установлен, суммируем только выбранных закупщиков
                        return purchaserSummary
                          .filter(item => purchaserFilter.has(item.purchaser))
                          .reduce((sum, item) => sum + item.count, 0);
                      })()}
                    </td>
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r border-gray-200 whitespace-nowrap">
                      {(() => {
                        // Если фильтр по закупщику не установлен, показываем сумму всех закупщиков
                        if (purchaserFilter.size === 0) {
                          return purchaserSummary.reduce((sum, item) => sum + item.totalBudget, 0);
                        }
                        // Если фильтр установлен, суммируем только выбранных закупщиков
                        return purchaserSummary
                          .filter(item => purchaserFilter.has(item.purchaser))
                          .reduce((sum, item) => sum + item.totalBudget, 0);
                      })().toLocaleString('ru-RU', { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 0 
                      })}
                    </td>
                    <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right whitespace-nowrap">
                      {(() => {
                        // Если фильтр по закупщику не установлен, показываем сумму всех закупщиков
                        let totalComplexity: number;
                        if (purchaserFilter.size === 0) {
                          totalComplexity = purchaserSummary.reduce((sum, item) => sum + item.totalComplexity, 0);
                        } else {
                          // Если фильтр установлен, суммируем только выбранных закупщиков
                          totalComplexity = purchaserSummary
                            .filter(item => purchaserFilter.has(item.purchaser))
                            .reduce((sum, item) => sum + item.totalComplexity, 0);
                        }
                        return totalComplexity > 0 
                          ? totalComplexity.toLocaleString('ru-RU', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 2 
                            })
                          : '-';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
            
          {/* Элементы управления справа от сводной таблицы */}
          <div className="flex items-start gap-2 flex-shrink-0 ml-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    ref={columnsMenuButtonRef}
                    onClick={onColumnsSettings}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2"
                    title="Настройка колонок"
                  >
                    <Settings className="w-4 h-4" />
                    Колонки
                  </button>
                </div>
                <button
                  onClick={onResetFilters}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                >
                  Сбросить фильтры
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-700 font-medium">Год планирования:</span>
                {allYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      selectedYear === year
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {year}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedYear(null)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedYear === null
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Все
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {selectedVersionId && (
                <div className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-2 ${
                  selectedVersionInfo?.isCurrent 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}>
                  <span>
                    {selectedVersionInfo?.isCurrent 
                      ? 'Просмотр текущей редакции' 
                      : `Просмотр редакции #${selectedVersionInfo?.versionNumber}`}
                  </span>
                  <button
                    onClick={onCloseVersion}
                    className={selectedVersionInfo?.isCurrent 
                      ? 'text-green-800 hover:text-green-900' 
                      : 'text-yellow-800 hover:text-yellow-900'}
                    title="Вернуться к текущей версии"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {canEdit && (
                <button
                  onClick={onCreateItem}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Создать новую строку плана закупок"
                  disabled={selectedVersionId !== null && !selectedVersionInfo?.isCurrent}
                >
                  <Plus className="w-4 h-4" />
                  Создать строку
                </button>
              )}
              {canEdit && (
                <button
                  onClick={onCreateVersion}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Создать редакцию плана закупок"
                  disabled={selectedVersionId !== null && !selectedVersionInfo?.isCurrent}
                >
                  <Plus className="w-4 h-4" />
                  Создать редакцию
                </button>
              )}
              <button
                onClick={onViewVersions}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
                title="Просмотр редакций плана закупок"
              >
                <Settings className="w-4 h-4" />
                Редакции
              </button>
              <button
                onClick={onExportPDF}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2"
                title="Экспорт в PDF"
              >
                <Download className="w-4 h-4" />
                Экспорт в PDF
              </button>
              <button
                onClick={onExportExcel}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Экспорт в Excel с фильтрами"
              >
                <Download className="w-4 h-4" />
                Excel (с фильтрами)
              </button>
              <button
                onClick={onExportExcelAll}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Экспорт в Excel всех данных"
              >
                <Download className="w-4 h-4" />
                Excel (все данные)
              </button>
            </div>
          </div>
          <div className="relative flex items-center">
            <div className="absolute -top-6 left-0">
              <p className="text-sm text-gray-500">
                Всего записей: {totalRecords}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
