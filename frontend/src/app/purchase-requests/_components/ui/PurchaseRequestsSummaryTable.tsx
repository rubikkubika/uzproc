'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { purchaserDisplayName } from '@/utils/purchaser';
import type { PurchaserSummaryItem } from '../types/purchase-requests-summary.types';

const ACCENT_AT_PURCHASER = '#3b82f6';
const ACCENT_CONTRACT_IN_WORK = '#3b82f6';
const ACCENT_COMPLETED = '#10b981';

const HUE_AT_PURCHASER = 220;
const HUE_CONTRACT_IN_WORK = 220;
const HUE_COMPLETED = 155;

function heatmapCellStyle(value: number, colMax: number, hue: number): CSSProperties {
  if (value === 0 || colMax === 0) return {};
  const intensity = 0.12 + 0.88 * (value / colMax);
  const L = (0.96 - intensity * 0.45).toFixed(3);
  const C = (0.02 + intensity * 0.13).toFixed(3);
  return {
    backgroundColor: `oklch(${L} ${C} ${hue})`,
    color: intensity > 0.55 ? '#ffffff' : '#1f2937',
  };
}

const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
    compactDisplay: 'short',
  }).format(value);

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return (
    <div className="flex items-center gap-0 justify-center">
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

interface PurchaseRequestsSummaryTableProps {
  purchaserSummary: PurchaserSummaryItem[];
  completedPurchaserSummary: PurchaserSummaryItem[];
  currentYear: number;
  purchaserFilter: Set<string>;
  setPurchaserFilter: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
  setActiveTab?: (tab: 'in-work') => void;
  setStatusFilter?: (filter: Set<string>) => void;
}

export default function PurchaseRequestsSummaryTable({
  purchaserSummary,
  completedPurchaserSummary,
  currentYear,
  purchaserFilter,
  setPurchaserFilter,
  setCurrentPage,
  setActiveTab,
  setStatusFilter,
}: PurchaseRequestsSummaryTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeStatusGroup, setActiveStatusGroup] = useState<'atPurchaser' | 'contractInWork' | null>(null);

  const MAX_VISIBLE_ROWS = 10;

  const filteredSummary = useMemo(
    () => purchaserSummary.filter((item) => (item.purchasesCount + item.ordersCount) > 0),
    [purchaserSummary]
  );
  const filteredCompleted = useMemo(
    () => completedPurchaserSummary.filter((item) => (item.purchasesCount + item.ordersCount) > 0),
    [completedPurchaserSummary]
  );

  const inWorkMap = useMemo(
    () => new Map(filteredSummary.map((item) => [item.purchaser || 'Не назначен', item])),
    [filteredSummary]
  );
  const completedMap = useMemo(
    () => new Map(filteredCompleted.map((item) => [item.purchaser || 'Не назначен', item])),
    [filteredCompleted]
  );

  const sortedPurchasers = useMemo(() => {
    const all = Array.from(new Set([...inWorkMap.keys(), ...completedMap.keys()]));
    return all.sort((a, b) => {
      const aInWork = inWorkMap.get(a);
      const bInWork = inWorkMap.get(b);
      const aValue = (aInWork?.ordersBudget || 0) + (aInWork?.purchasesBudget || 0);
      const bValue = (bInWork?.ordersBudget || 0) + (bInWork?.purchasesBudget || 0);
      return bValue - aValue;
    });
  }, [inWorkMap, completedMap]);

  const colMaxValues = useMemo(() => ({
    atPurchaserCount: Math.max(0, ...sortedPurchasers.map(p => inWorkMap.get(p)?.atPurchaserCount ?? 0)),
    contractInWorkCount: Math.max(0, ...sortedPurchasers.map(p => inWorkMap.get(p)?.contractInWorkCount ?? 0)),
    completedCount: Math.max(0, ...sortedPurchasers.map(p => {
      const c = completedMap.get(p);
      return (c?.ordersCount ?? 0) + (c?.purchasesCount ?? 0);
    })),
  }), [sortedPurchasers, inWorkMap, completedMap]);

  const displayPurchasers = isExpanded ? sortedPurchasers : sortedPurchasers.slice(0, MAX_VISIBLE_ROWS);
  const hasMoreRows = sortedPurchasers.length > MAX_VISIBLE_ROWS;

  const handleSubcategoryClick = useCallback(
    (purchaser: string, subcategory: 'atPurchaser' | 'contractInWork', e: React.MouseEvent) => {
      e.stopPropagation();
      if (!setStatusFilter || !setActiveTab) return;
      const isSamePurchaser = purchaserFilter.size === 1 && purchaserFilter.has(purchaser);
      const isSameCategory = activeStatusGroup === subcategory && isSamePurchaser;
      if (isSameCategory) {
        setActiveStatusGroup(null);
        setStatusFilter(new Set());
        setPurchaserFilter(new Set());
      } else {
        setActiveStatusGroup(subcategory);
        setPurchaserFilter(new Set([purchaser]));
        setStatusFilter(
          subcategory === 'atPurchaser'
            ? new Set(['Заявка у закупщика'])
            : new Set(['Договор в работе', 'Спецификация в работе'])
        );
        setActiveTab('in-work');
      }
      setCurrentPage(0);
    },
    [purchaserFilter, activeStatusGroup, setStatusFilter, setPurchaserFilter, setActiveTab, setCurrentPage]
  );

  const onSelectPurchaser = useCallback(
    (purchaser: string, e: React.MouseEvent) => {
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
    [purchaserFilter, setPurchaserFilter, setCurrentPage]
  );

  // Totals
  const totalAtPurchaserCount = purchaserSummary.reduce((s, i) => s + (i.atPurchaserCount || 0), 0);
  const totalAtPurchaserBudget = purchaserSummary.reduce((s, i) => s + (i.atPurchaserBudget || 0), 0);
  const totalContractInWorkCount = purchaserSummary.reduce((s, i) => s + (i.contractInWorkCount || 0), 0);
  const totalContractInWorkBudget = purchaserSummary.reduce((s, i) => s + (i.contractInWorkBudget || 0), 0);
  const totalInWorkComplexity = purchaserSummary.reduce((s, i) => s + i.purchasesComplexity + i.ordersComplexity, 0);
  const totalInWorkGrand = totalAtPurchaserCount + totalContractInWorkCount;
  const totalCompletedCount = completedPurchaserSummary.reduce((s, i) => s + i.purchasesCount + i.ordersCount, 0);
  const totalCompletedBudget = completedPurchaserSummary.reduce((s, i) => s + i.purchasesBudget + i.ordersBudget, 0);
  const totalCompletedComplexity = completedPurchaserSummary.reduce((s, i) => s + i.purchasesComplexity + i.ordersComplexity, 0);
  const totalCompletedSavings = completedPurchaserSummary.reduce((s, i) => s + (i.savings || 0), 0);
  const avgSlaDays = (() => {
    const days = completedPurchaserSummary.filter(i => i.averageSlaDays != null).map(i => i.averageSlaDays!);
    if (!days.length) return null;
    return Math.round(days.reduce((s, d) => s + d, 0) / days.length * 10) / 10;
  })();
  const avgRating = (() => {
    const ratings = completedPurchaserSummary.filter(i => i.averageRating != null).map(i => i.averageRating!);
    if (!ratings.length) return null;
    return Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length * 10) / 10;
  })();

  const totalColCount = 12;

  return (
    <div className="flex-shrink-0">
      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto relative">
        <table className="border-collapse text-xs">
          <thead>
            {/* Row 1: super-headers */}
            <tr className="bg-white">
              <th
                rowSpan={3}
                className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 border-b border-gray-200 border-r border-gray-200 align-middle bg-gray-50"
                style={{ minWidth: 140 }}
              >
                Закупщик
              </th>
              <th
                colSpan={5}
                className="px-2 py-1 text-center text-[11px] font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-300"
              >
                В работе
              </th>
              <th
                colSpan={6}
                className="px-2 py-1 text-center text-[11px] font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-300 border-l-2 border-l-gray-300"
              >
                Завершено {currentYear}
              </th>
            </tr>
            {/* Row 2: sub-group headers */}
            <tr className="bg-white">
              <th
                colSpan={2}
                className="px-2 py-1 text-center text-[11px] font-semibold bg-white whitespace-nowrap"
                style={{ borderBottom: `2px solid ${ACCENT_AT_PURCHASER}`, color: ACCENT_AT_PURCHASER }}
              >
                У закупщика
              </th>
              <th
                colSpan={2}
                className="px-2 py-1 text-center text-[11px] font-semibold bg-white whitespace-nowrap"
                style={{ borderBottom: `2px solid ${ACCENT_CONTRACT_IN_WORK}`, color: ACCENT_CONTRACT_IN_WORK }}
              >
                Дог. в работе
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                Итого
              </th>
              {/* Completed — all with rowspan=2 */}
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 border-l-2 border-l-gray-300 align-bottom bg-gray-50 whitespace-nowrap"
              >
                Кол-во
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                Сумма
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                Сложн.
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                Экон.
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                SLA
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 border-l border-gray-200 align-bottom bg-gray-50 whitespace-nowrap"
              >
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 inline" />
              </th>
            </tr>
            {/* Row 3: column labels for sub-groups */}
            <tr className="bg-gray-50">
              <th className="px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap" style={{ minWidth: 36 }}>
                Кол.
              </th>
              <th className="px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap" style={{ minWidth: 52 }}>
                Сумма
              </th>
              <th className="px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap" style={{ minWidth: 36 }}>
                Кол.
              </th>
              <th className="px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap" style={{ minWidth: 52 }}>
                Сумма
              </th>
            </tr>
          </thead>
          <tbody>
            {displayPurchasers.length === 0 ? (
              <tr>
                <td colSpan={totalColCount} className="px-4 py-8 text-center text-gray-400">
                  Нет данных
                </td>
              </tr>
            ) : (
              displayPurchasers.map((purchaser, idx) => {
                const inWork = inWorkMap.get(purchaser);
                const completed = completedMap.get(purchaser);
                const isSelected = purchaserFilter.has(purchaser);

                const atPurchaserCount = inWork?.atPurchaserCount ?? 0;
                const atPurchaserBudget = inWork?.atPurchaserBudget ?? 0;
                const contractInWorkCount = inWork?.contractInWorkCount ?? 0;
                const contractInWorkBudget = inWork?.contractInWorkBudget ?? 0;
                const inWorkComplexity = (inWork?.ordersComplexity || 0) + (inWork?.purchasesComplexity || 0);
                const inWorkGrand = atPurchaserCount + contractInWorkCount;

                const completedCount = (completed?.ordersCount || 0) + (completed?.purchasesCount || 0);
                const completedBudget = (completed?.ordersBudget || 0) + (completed?.purchasesBudget || 0);
                const completedComplexity = (completed?.ordersComplexity || 0) + (completed?.purchasesComplexity || 0);
                const completedSavings = completed?.savings || 0;
                const completedRating = completed?.averageRating;
                const completedSlaDays = completed?.averageSlaDays;

                const atPurchaserStyle = heatmapCellStyle(atPurchaserCount, colMaxValues.atPurchaserCount, HUE_AT_PURCHASER);
                const contractInWorkStyle = heatmapCellStyle(contractInWorkCount, colMaxValues.contractInWorkCount, HUE_CONTRACT_IN_WORK);
                const completedCountStyle = heatmapCellStyle(completedCount, colMaxValues.completedCount, HUE_COMPLETED);

                const isAtPurchaserActive = activeStatusGroup === 'atPurchaser' && isSelected;
                const isContractInWorkActive = activeStatusGroup === 'contractInWork' && isSelected;

                return (
                  <tr
                    key={purchaser}
                    className={`border-b border-gray-100 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/40'
                        : idx % 2 === 0
                          ? 'bg-white hover:bg-gray-50/60'
                          : 'bg-gray-50/30 hover:bg-gray-50/60'
                    }`}
                    onClick={(e) => onSelectPurchaser(purchaser, e)}
                  >
                    {/* Закупщик */}
                    <td className={`px-2 py-1.5 border-r border-gray-200 whitespace-nowrap ${isSelected ? 'bg-blue-50' : ''}`}>
                      <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                        {purchaserDisplayName(purchaser) === '—' ? 'Не назначен' : purchaserDisplayName(purchaser)}
                      </span>
                    </td>

                    {/* У закупщика: кол-во */}
                    <td
                      onClick={(e) => handleSubcategoryClick(purchaser, 'atPurchaser', e)}
                      style={isAtPurchaserActive ? {} : atPurchaserStyle}
                      className={`py-1.5 text-center font-medium cursor-pointer transition-colors ${
                        isAtPurchaserActive ? 'bg-blue-200 text-blue-900 ring-1 ring-blue-400 ring-inset' : ''
                      }`}
                      title="Фильтр: Заявка у закупщика"
                    >
                      {atPurchaserCount > 0 ? atPurchaserCount : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>
                    {/* У закупщика: сумма */}
                    <td
                      onClick={(e) => handleSubcategoryClick(purchaser, 'atPurchaser', e)}
                      className={`px-1.5 py-1.5 text-center text-[10px] cursor-pointer transition-colors ${
                        isAtPurchaserActive ? 'bg-blue-200 text-blue-900' : 'text-gray-600 hover:bg-blue-50/40'
                      }`}
                      title="Фильтр: Заявка у закупщика"
                    >
                      {atPurchaserBudget > 0 ? formatCompactNumber(atPurchaserBudget) : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>

                    {/* Договоров в работе: кол-во */}
                    <td
                      onClick={(e) => handleSubcategoryClick(purchaser, 'contractInWork', e)}
                      style={isContractInWorkActive ? {} : contractInWorkStyle}
                      className={`py-1.5 text-center font-medium cursor-pointer transition-colors ${
                        isContractInWorkActive ? 'bg-blue-200 text-blue-900 ring-1 ring-blue-400 ring-inset' : ''
                      }`}
                      title="Фильтр: Договор в работе / Спецификация в работе"
                    >
                      {contractInWorkCount > 0 ? contractInWorkCount : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>
                    {/* Договоров в работе: сумма */}
                    <td
                      onClick={(e) => handleSubcategoryClick(purchaser, 'contractInWork', e)}
                      className={`px-1.5 py-1.5 text-center text-[10px] cursor-pointer transition-colors ${
                        isContractInWorkActive ? 'bg-blue-200 text-blue-900' : 'text-gray-600 hover:bg-blue-50/40'
                      }`}
                      title="Фильтр: Договор в работе / Спецификация в работе"
                    >
                      {contractInWorkBudget > 0 ? formatCompactNumber(contractInWorkBudget) : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>

                    {/* Итого в работе */}
                    <td className="px-2 py-1.5 text-center border-l border-gray-200 font-semibold text-gray-900 bg-gray-50">
                      {inWorkGrand > 0 ? inWorkGrand : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Завершено: кол-во */}
                    <td
                      style={completedCountStyle}
                      className="py-1.5 text-center font-medium border-l-2 border-l-gray-300"
                    >
                      {completedCount > 0 ? completedCount : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>
                    {/* Завершено: сумма */}
                    <td className="px-1.5 py-1.5 text-center text-[10px] text-gray-600 border-l border-gray-200">
                      {completedBudget > 0 ? formatCompactNumber(completedBudget) : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>
                    {/* Завершено: сложность */}
                    <td className="px-1.5 py-1.5 text-center text-[10px] text-gray-600 border-l border-gray-200">
                      {completedComplexity > 0 ? completedComplexity : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>
                    {/* Завершено: экономия */}
                    <td className={`px-1.5 py-1.5 text-center text-[10px] border-l border-gray-200 font-medium ${
                      completedSavings > 0 ? 'text-emerald-700' : completedSavings < 0 ? 'text-red-600' : 'text-gray-200'
                    }`}>
                      {completedSavings !== 0 ? formatCompactNumber(completedSavings) : '·'}
                    </td>
                    {/* Завершено: SLA */}
                    <td className="px-1.5 py-1.5 text-center text-[10px] text-gray-600 border-l border-gray-200">
                      {completedSlaDays != null ? completedSlaDays : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>
                    {/* Завершено: рейтинг */}
                    <td className="px-1.5 py-1.5 text-center border-l border-gray-200">
                      {completedRating != null ? renderStars(completedRating) : <span className="text-gray-200 text-[10px]">·</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {sortedPurchasers.length > 0 && (
            <tfoot>
              <tr
                className="border-t-2 border-gray-200 bg-gray-50 font-semibold cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => { setPurchaserFilter(new Set()); setCurrentPage(0); }}
              >
                <td className="px-2 py-1.5 text-xs text-gray-600 border-r border-gray-200">Итого</td>
                <td className="py-1.5 text-center text-xs text-gray-700">
                  {totalAtPurchaserCount > 0 ? totalAtPurchaserCount : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-1.5 py-1.5 text-center text-xs text-gray-700">
                  {totalAtPurchaserBudget > 0 ? formatCompactNumber(totalAtPurchaserBudget) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-1.5 text-center text-xs text-gray-700">
                  {totalContractInWorkCount > 0 ? totalContractInWorkCount : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-1.5 py-1.5 text-center text-xs text-gray-700">
                  {totalContractInWorkBudget > 0 ? formatCompactNumber(totalContractInWorkBudget) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-900 border-l border-gray-200">
                  {totalInWorkGrand || <span className="text-gray-300">—</span>}
                </td>
                <td className="py-1.5 text-center text-xs text-gray-700 border-l-2 border-l-gray-300">
                  {totalCompletedCount > 0 ? totalCompletedCount : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-1.5 py-1.5 text-center text-xs text-gray-700 border-l border-gray-200">
                  {totalCompletedBudget > 0 ? formatCompactNumber(totalCompletedBudget) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-1.5 py-1.5 text-center text-xs text-gray-700 border-l border-gray-200">
                  {totalCompletedComplexity > 0 ? totalCompletedComplexity : <span className="text-gray-300">—</span>}
                </td>
                <td className={`px-1.5 py-1.5 text-center text-xs font-semibold border-l border-gray-200 ${
                  totalCompletedSavings > 0 ? 'text-emerald-700' : totalCompletedSavings < 0 ? 'text-red-600' : 'text-gray-300'
                }`}>
                  {totalCompletedSavings !== 0 ? formatCompactNumber(totalCompletedSavings) : '—'}
                </td>
                <td className="px-1.5 py-1.5 text-center text-xs text-gray-700 border-l border-gray-200">
                  {avgSlaDays != null ? avgSlaDays : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-1.5 py-1.5 text-center border-l border-gray-200">
                  {avgRating != null ? renderStars(avgRating) : <span className="text-gray-300 text-xs">—</span>}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {hasMoreRows && (
        <div className="flex justify-end mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <>Свернуть <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Ещё {sortedPurchasers.length - MAX_VISIBLE_ROWS} <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
