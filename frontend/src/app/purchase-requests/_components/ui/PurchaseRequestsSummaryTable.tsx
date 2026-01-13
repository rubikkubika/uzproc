'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PurchaserSummaryItem {
  purchaser: string;
  ordersCount: number;
  purchasesCount: number;
  ordersBudget: number;
  purchasesBudget: number;
}

/**
 * Форматирует число в сокращенном виде (тыс., млн, млрд, трлн)
 */
const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
    compactDisplay: 'short'
  }).format(value);
};

/**
 * Извлекает фамилию и имя из полного имени закупщика (первые 2 слова)
 */
const getPurchaserFIO = (purchaser: string | null | undefined): string => {
  if (!purchaser || purchaser.trim() === '') {
    return 'Не назначен';
  }
  
  const words = purchaser.trim().split(/\s+/);
  // Берем первые 2 слова (фамилия и имя) или все слова, если их меньше 2
  const fio = words.slice(0, 2).join(' ');
  return fio;
};

interface PurchaseRequestsSummaryTableProps {
  purchaserSummary: PurchaserSummaryItem[];
  purchaserFilter: Set<string>;
  setPurchaserFilter: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * Компонент сводной таблицы по закупщикам для заявок на закупку
 * Отображает статистику по закупщикам с возможностью фильтрации
 */
export default function PurchaseRequestsSummaryTable({
  purchaserSummary,
  purchaserFilter,
  setPurchaserFilter,
  setCurrentPage,
}: PurchaseRequestsSummaryTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_VISIBLE_ROWS = 10;
  const displayRows = isExpanded ? purchaserSummary : purchaserSummary.slice(0, MAX_VISIBLE_ROWS);
  const hasMoreRows = purchaserSummary.length > MAX_VISIBLE_ROWS;

  return (
    <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex-shrink-0 relative">
        <div className="overflow-x-auto">
          <table className="border-separate table-auto" style={{ borderSpacing: 0 }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap">
                  Закупщик
                </th>
                <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-l-2 border-t-2 border-r border-gray-400 rounded-tl-lg whitespace-nowrap">
                  Заказы
                </th>
                <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r-2 border-t-2 border-gray-400 rounded-tr-lg whitespace-nowrap">
                  Сумма заказов
                </th>
                <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-l-2 border-t-2 border-r border-gray-400 rounded-tl-lg whitespace-nowrap">
                  Закупки
                </th>
                <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r-2 border-t-2 border-gray-400 rounded-tr-lg whitespace-nowrap">
                  Сумма закупок
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayRows.length > 0 ? (
                displayRows.map((item, index) => {
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
                        e.preventDefault();
                        e.stopPropagation();
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
                      title={isSelected ? 'Нажмите для снятия выделения. Ctrl/Cmd+клик для множественного выбора' : 'Нажмите для выделения. Ctrl/Cmd+клик для множественного выбора'}
                    >
                      <td className="px-2 py-1 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                        {getPurchaserFIO(item.purchaser)}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-right border-l-2 border-t border-b border-r border-gray-400 whitespace-nowrap">
                        {item.ordersCount}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-right border-r-2 border-t border-b border-gray-400 whitespace-nowrap">
                        {formatCompactNumber(item.ordersBudget)}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-right border-l-2 border-t border-b border-r border-gray-400 whitespace-nowrap">
                        {item.purchasesCount}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-right border-r-2 border-t border-b border-gray-400 whitespace-nowrap">
                        {formatCompactNumber(item.purchasesBudget)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-2 py-1 text-xs text-gray-500 text-center whitespace-nowrap">
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
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-l-2 border-t border-b-2 border-r border-gray-400 rounded-bl-lg whitespace-nowrap">
                  {(() => {
                    if (purchaserFilter.size === 0) {
                      return purchaserSummary.reduce((sum, item) => sum + item.ordersCount, 0);
                    }
                    return purchaserSummary
                      .filter(item => purchaserFilter.has(item.purchaser))
                      .reduce((sum, item) => sum + item.ordersCount, 0);
                  })()}
                </td>
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r-2 border-t border-b-2 border-gray-400 rounded-br-lg whitespace-nowrap">
                  {formatCompactNumber((() => {
                    if (purchaserFilter.size === 0) {
                      return purchaserSummary.reduce((sum, item) => sum + item.ordersBudget, 0);
                    }
                    return purchaserSummary
                      .filter(item => purchaserFilter.has(item.purchaser))
                      .reduce((sum, item) => sum + item.ordersBudget, 0);
                  })())}
                </td>
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-l-2 border-t border-b-2 border-r border-gray-400 rounded-bl-lg whitespace-nowrap">
                  {(() => {
                    if (purchaserFilter.size === 0) {
                      return purchaserSummary.reduce((sum, item) => sum + item.purchasesCount, 0);
                    }
                    return purchaserSummary
                      .filter(item => purchaserFilter.has(item.purchaser))
                      .reduce((sum, item) => sum + item.purchasesCount, 0);
                  })()}
                </td>
                <td className="px-2 py-1 text-xs font-semibold text-gray-700 text-right border-r-2 border-t border-b-2 border-gray-400 rounded-br-lg whitespace-nowrap">
                  {formatCompactNumber((() => {
                    if (purchaserFilter.size === 0) {
                      return purchaserSummary.reduce((sum, item) => sum + item.purchasesBudget, 0);
                    }
                    return purchaserSummary
                      .filter(item => purchaserFilter.has(item.purchaser))
                      .reduce((sum, item) => sum + item.purchasesBudget, 0);
                  })())}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {hasMoreRows && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="absolute bottom-2 right-2 p-1.5 hover:bg-gray-200 rounded transition-colors bg-white border border-gray-300 shadow-sm flex items-center gap-1 z-10"
            title={isExpanded ? 'Свернуть' : 'Развернуть все'}
          >
            <span className="text-xs text-gray-700">
              {isExpanded ? 'Свернуть' : 'Развернуть все'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
