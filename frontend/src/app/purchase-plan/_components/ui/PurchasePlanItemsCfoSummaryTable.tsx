'use client';

import React from 'react';
import { CfoSummaryItem } from '../types/purchase-plan-items.types';

interface PurchasePlanItemsCfoSummaryTableProps {
  cfoSummary: CfoSummaryItem[];
  cfoFilter: Set<string>;
  setCfoFilter: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * Компонент сводной таблицы по ЦФО.
 * Отображает количество позиций, сумму бюджета и сложность по каждому ЦФО
 * с возможностью фильтрации таблицы по клику на строку.
 */
export default function PurchasePlanItemsCfoSummaryTable({
  cfoSummary,
  cfoFilter,
  setCfoFilter,
  setCurrentPage,
}: PurchasePlanItemsCfoSummaryTableProps) {
  const selectedItems = cfoFilter.size === 0
    ? cfoSummary
    : cfoSummary.filter(item => cfoFilter.has(item.cfo));

  const totalCount = selectedItems.reduce((sum, item) => sum + item.count, 0);
  const totalBudget = selectedItems.reduce((sum, item) => sum + item.totalBudget, 0);
  const totalComplexity = selectedItems.reduce((sum, item) => sum + item.totalComplexity, 0);

  const handleRowClick = (cfo: string, isMultiSelect: boolean, isSelected: boolean) => {
    const newSet = new Set(cfoFilter);
    if (isMultiSelect) {
      if (isSelected) {
        newSet.delete(cfo);
      } else {
        newSet.add(cfo);
      }
    } else if (isSelected && cfoFilter.size === 1) {
      newSet.clear();
    } else {
      newSet.clear();
      newSet.add(cfo);
    }
    setCfoFilter(newSet);
    setCurrentPage(0);
  };

  return (
    <div className="flex-shrink-0">
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
        <div className="overflow-auto max-h-[220px]">
          <table className="border-collapse table-auto">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                  ЦФО
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
              {cfoSummary.length > 0 ? (
                cfoSummary.map((item, index) => {
                  const isSelected = cfoFilter.has(item.cfo);
                  return (
                    <tr
                      key={index}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={(e) => handleRowClick(item.cfo, e.ctrlKey || e.metaKey, isSelected)}
                    >
                      <td className="px-2 py-1 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                        {item.cfo}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-right border-r border-gray-200 whitespace-nowrap">
                        {item.count}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-right border-r border-gray-200 whitespace-nowrap">
                        {item.totalBudget.toLocaleString('ru-RU', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-right whitespace-nowrap">
                        {item.totalComplexity > 0
                          ? item.totalComplexity.toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
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
                  setCfoFilter(new Set());
                  setCurrentPage(0);
                }}
              >
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  Итого
                </td>
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r border-gray-200 whitespace-nowrap">
                  {totalCount}
                </td>
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r border-gray-200 whitespace-nowrap">
                  {totalBudget.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right whitespace-nowrap">
                  {totalComplexity > 0
                    ? totalComplexity.toLocaleString('ru-RU', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })
                    : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
