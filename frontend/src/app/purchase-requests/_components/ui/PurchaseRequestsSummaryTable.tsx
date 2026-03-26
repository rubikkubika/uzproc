'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { purchaserDisplayName } from '@/utils/purchaser';
import type { PurchaserSummaryItem } from '../types/purchase-requests-summary.types';

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return (
    <div className="flex items-center gap-0">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`f-${i}`} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 opacity-50" />}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`e-${i}`} className="w-2.5 h-2.5 text-gray-300" />
      ))}
      <span className="ml-0.5 text-[10px] text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
};

const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
    compactDisplay: 'short',
  }).format(value);

interface PurchaseRequestsSummaryTableProps {
  purchaserSummary: PurchaserSummaryItem[];
  completedPurchaserSummary: PurchaserSummaryItem[];
  currentYear: number;
  purchaserFilter: Set<string>;
  setPurchaserFilter: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
  setActiveTab?: (tab: 'in-work') => void;
}

export default function PurchaseRequestsSummaryTable({
  purchaserSummary,
  completedPurchaserSummary,
  currentYear,
  purchaserFilter,
  setPurchaserFilter,
  setCurrentPage,
  setActiveTab,
}: PurchaseRequestsSummaryTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_VISIBLE_ROWS = 10;

  const filteredSummary = purchaserSummary.filter((item) => (item.purchasesCount + item.ordersCount) > 0);
  const filteredCompleted = completedPurchaserSummary.filter((item) => (item.purchasesCount + item.ordersCount) > 0);

  const inWorkMap = new Map(filteredSummary.map((item) => [item.purchaser || 'Не назначен', item]));
  const completedMap = new Map(filteredCompleted.map((item) => [item.purchaser || 'Не назначен', item]));
  const allPurchasers = Array.from(new Set([...inWorkMap.keys(), ...completedMap.keys()]));

  const sortedPurchasers = allPurchasers.sort((a, b) => {
    const aInWork = inWorkMap.get(a);
    const bInWork = inWorkMap.get(b);
    const aValue = (aInWork?.ordersBudget || 0) + (aInWork?.purchasesBudget || 0);
    const bValue = (bInWork?.ordersBudget || 0) + (bInWork?.purchasesBudget || 0);
    return bValue - aValue;
  });

  const displayPurchasers = isExpanded ? sortedPurchasers : sortedPurchasers.slice(0, MAX_VISIBLE_ROWS);
  const hasMoreRows = sortedPurchasers.length > MAX_VISIBLE_ROWS;

  const onSelectPurchaser = useCallback(
    (purchaser: string, e: React.MouseEvent<HTMLTableRowElement>) => {
      const isClearingOnlySelected =
        !(e.ctrlKey || e.metaKey) && purchaserFilter.has(purchaser) && purchaserFilter.size === 1;

      if (e.ctrlKey || e.metaKey) {
        const next = new Set<string>(purchaserFilter);
        if (next.has(purchaser)) next.delete(purchaser);
        else next.add(purchaser);
        setPurchaserFilter(next);
      } else if (purchaserFilter.has(purchaser) && purchaserFilter.size === 1) {
        setPurchaserFilter(new Set<string>());
      } else {
        setPurchaserFilter(new Set<string>([purchaser]));
      }

      setCurrentPage(0);
    },
    [purchaserFilter, setPurchaserFilter, setCurrentPage, setActiveTab]
  );

  return (
    <div className="flex-shrink-0">
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex-shrink-0 relative">
        <div className="overflow-x-auto">
          <table className="border-separate table-auto" style={{ borderSpacing: 0 }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-1 py-1 border-r border-gray-300 min-w-[120px]"></th>
                <th colSpan={3} className="px-1 py-1 text-center text-[11px] font-semibold text-blue-900 border-r border-gray-300 whitespace-nowrap">
                  Заявки в работе
                </th>
                <th colSpan={6} className="px-1 py-1 text-center text-[11px] font-semibold text-green-900 whitespace-nowrap">
                  {`Завершенные заявки - ${currentYear}`}
                </th>
              </tr>
              <tr>
                <th className="px-1 py-1 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap min-w-[120px]">
                  ФИО закупщика
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-l-2 border-t-2 border-r border-gray-400 rounded-tl-lg whitespace-nowrap min-w-[56px]">
                  Кол-во
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-r-2 border-t-2 border-gray-400 whitespace-nowrap min-w-[56px]">
                  Сумма
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-r-2 border-t-2 border-gray-400 rounded-tr-lg whitespace-nowrap min-w-[56px]">
                  Сложность
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-l-2 border-t-2 border-r border-gray-400 rounded-tl-lg whitespace-nowrap min-w-[56px]">
                  Кол-во
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-r-2 border-t-2 border-gray-400 whitespace-nowrap min-w-[56px]">
                  Сумма
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-r border-t-2 border-gray-400 whitespace-nowrap min-w-[56px]">
                  Сложность
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-r border-t-2 border-gray-400 whitespace-nowrap min-w-[56px]">
                  Экономия
                </th>
                <th className="px-1 py-1 text-right text-[11px] font-medium text-gray-500 tracking-wider border-r border-t-2 border-gray-400 whitespace-nowrap min-w-[40px]">
                  SLA
                </th>
                <th className="px-1 py-1 text-center text-[11px] font-medium text-gray-500 tracking-wider border-r-2 border-t-2 border-gray-400 rounded-tr-lg whitespace-nowrap min-w-[40px]">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 inline" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayPurchasers.length > 0 ? (
                displayPurchasers.map((purchaser) => {
                  const inWork = inWorkMap.get(purchaser);
                  const completed = completedMap.get(purchaser);
                  const inWorkCount = (inWork?.ordersCount || 0) + (inWork?.purchasesCount || 0);
                  const inWorkBudget = (inWork?.ordersBudget || 0) + (inWork?.purchasesBudget || 0);
                  const inWorkComplexity = (inWork?.ordersComplexity || 0) + (inWork?.purchasesComplexity || 0);
                  const completedCount = (completed?.ordersCount || 0) + (completed?.purchasesCount || 0);
                  const completedBudget = (completed?.ordersBudget || 0) + (completed?.purchasesBudget || 0);
                  const completedComplexity = (completed?.ordersComplexity || 0) + (completed?.purchasesComplexity || 0);
                  const completedSavings = completed?.savings || 0;
                  const completedRating = completed?.averageRating;
                  const completedSlaDays = completed?.averageSlaDays;

                  return (
                    <tr
                      key={purchaser}
                      className={`${purchaserFilter.has(purchaser) ? 'bg-blue-100 hover:bg-blue-200' : 'hover:bg-gray-50'} cursor-pointer transition-colors`}
                      onClick={(e) => onSelectPurchaser(purchaser, e as unknown as React.MouseEvent<HTMLTableRowElement>)}
                    >
                      <td className="px-1 py-1 text-[11px] text-gray-900 border-r border-gray-200 whitespace-nowrap">
                        {purchaserDisplayName(purchaser) === '—' ? 'Не назначен' : purchaserDisplayName(purchaser)}
                      </td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-right border-l-2 border-t border-b border-r border-gray-400 whitespace-nowrap">{inWorkCount}</td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-right border-r-2 border-t border-b border-gray-400 whitespace-nowrap">{formatCompactNumber(inWorkBudget)}</td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-right border-r-2 border-t border-b border-gray-400 whitespace-nowrap">{inWorkComplexity}</td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-right border-l-2 border-t border-b border-r border-gray-400 whitespace-nowrap">{completedCount}</td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-right border-r-2 border-t border-b border-gray-400 whitespace-nowrap">{formatCompactNumber(completedBudget)}</td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-right border-r border-t border-b border-gray-400 whitespace-nowrap">{completedComplexity}</td>
                      <td className={`px-1 py-1 text-[11px] text-right border-r border-t border-b border-gray-400 whitespace-nowrap ${completedSavings > 0 ? 'text-green-700' : completedSavings < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCompactNumber(completedSavings)}</td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-right border-r border-t border-b border-gray-400 whitespace-nowrap">{completedSlaDays != null ? completedSlaDays : '—'}</td>
                      <td className="px-1 py-1 text-[11px] text-gray-900 text-center border-r-2 border-t border-b border-gray-400 whitespace-nowrap">{completedRating != null ? renderStars(completedRating) : '—'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-1 py-1 text-[11px] text-gray-500 text-center whitespace-nowrap">
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-300">
              <tr
                className="cursor-pointer transition-colors hover:bg-gray-100"
                onClick={() => {
                  setPurchaserFilter(new Set());
                  setCurrentPage(0);
                }}
              >
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap">Итого</td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-right border-l-2 border-t border-b-2 border-r border-gray-400 rounded-bl-lg whitespace-nowrap">
                  {purchaserSummary.reduce((sum, item) => sum + item.purchasesCount + item.ordersCount, 0)}
                </td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-right border-r-2 border-t border-b-2 border-gray-400 rounded-br-lg whitespace-nowrap">
                  {formatCompactNumber(purchaserSummary.reduce((sum, item) => sum + item.purchasesBudget + item.ordersBudget, 0))}
                </td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-right border-r-2 border-t border-b-2 border-gray-400 rounded-br-lg whitespace-nowrap">
                  {purchaserSummary.reduce((sum, item) => sum + item.purchasesComplexity + item.ordersComplexity, 0)}
                </td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-right border-l-2 border-t border-b-2 border-r border-gray-400 rounded-bl-lg whitespace-nowrap">
                  {completedPurchaserSummary.reduce((sum, item) => sum + item.purchasesCount + item.ordersCount, 0)}
                </td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-right border-r-2 border-t border-b-2 border-gray-400 whitespace-nowrap">
                  {formatCompactNumber(completedPurchaserSummary.reduce((sum, item) => sum + item.purchasesBudget + item.ordersBudget, 0))}
                </td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-right border-r border-t border-b-2 border-gray-400 whitespace-nowrap">
                  {completedPurchaserSummary.reduce((sum, item) => sum + item.purchasesComplexity + item.ordersComplexity, 0)}
                </td>
                <td className={`px-1 py-1 text-[11px] font-semibold text-right border-r border-t border-b-2 border-gray-400 whitespace-nowrap ${completedPurchaserSummary.reduce((sum, item) => sum + (item.savings || 0), 0) > 0 ? 'text-green-700' : completedPurchaserSummary.reduce((sum, item) => sum + (item.savings || 0), 0) < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatCompactNumber(completedPurchaserSummary.reduce((sum, item) => sum + (item.savings || 0), 0))}
                </td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-right border-r border-t border-b-2 border-gray-400 whitespace-nowrap">
                  {(() => {
                    const slaDays = completedPurchaserSummary.filter(item => item.averageSlaDays != null).map(item => item.averageSlaDays!);
                    if (slaDays.length === 0) return '—';
                    const avg = slaDays.reduce((sum, d) => sum + d, 0) / slaDays.length;
                    return Math.round(avg * 10) / 10;
                  })()}
                </td>
                <td className="px-1 py-1 text-[11px] font-semibold text-gray-700 text-center border-r-2 border-t border-b-2 border-gray-400 rounded-br-lg whitespace-nowrap">
                  {(() => {
                    const ratings = completedPurchaserSummary.filter(item => item.averageRating != null).map(item => item.averageRating!);
                    if (ratings.length === 0) return '—';
                    const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
                    return renderStars(Math.round(avg * 10) / 10);
                  })()}
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
            className="absolute bottom-2 right-2 p-1 hover:bg-gray-200 rounded transition-colors bg-white border border-gray-300 shadow-sm flex items-center gap-1 z-10"
            title={isExpanded ? 'Свернуть' : 'Развернуть все'}
          >
            <span className="text-[11px] text-gray-700">
              {isExpanded ? 'Свернуть' : 'Развернуть'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
