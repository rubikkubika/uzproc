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
  allItemsCount: number;
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
  allItemsCount,
  onResetFilters,
  selectedVersionId,
  onCloseVersion,
  canEdit,
  columnsMenuButtonRef,
}: PurchasePlanItemsTableHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
      {/* Сводная таблица по закупщикам */}
      <div className="flex items-start w-full">
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
        </div>
    </div>
  );
}
