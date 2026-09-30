'use client';

import React from 'react';
import type { PurchaserSummaryItem } from '../types/purchase-plan-items.types';
import { usePurchaserSummaryTable } from '../hooks/usePurchaserSummaryTable';
import {
  PURCHASER_SUMMARY_STATUS_GROUPS,
  SUMMARY_TD_CLASS,
  SUMMARY_TOTAL_TD_CLASS,
} from '../constants/purchaser-summary.constants';
import PurchaserSummaryTableHead from './PurchaserSummaryTableHead';
import PurchaserSummaryValueCells from './PurchaserSummaryValueCells';

interface PurchasePlanItemsSummaryTableProps {
  purchaserSummary: PurchaserSummaryItem[];
  purchaserFilter: Set<string>;
  setPurchaserFilter: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
  /** Показывать разбивку по статусам «В плане» / «Связано с заявкой» / «Исключено» */
  showStatusBreakdown?: boolean;
}

/**
 * Сводная таблица по закупщикам: итоги по каждому закупщику и (опционально) разбивка по статусам.
 * Клик по строке фильтрует таблицу по закупщику, Ctrl/⌘ — множественный выбор, «Итого» — сброс фильтра.
 */
export default function PurchasePlanItemsSummaryTable({
  purchaserSummary,
  purchaserFilter,
  setPurchaserFilter,
  setCurrentPage,
  showStatusBreakdown = false,
}: PurchasePlanItemsSummaryTableProps) {
  const { totals, handleRowClick, handleTotalClick } = usePurchaserSummaryTable({
    purchaserSummary,
    purchaserFilter,
    setPurchaserFilter,
    setCurrentPage,
  });
  const columnsCount = 4 + (showStatusBreakdown ? PURCHASER_SUMMARY_STATUS_GROUPS.length * 2 : 0);

  return (
    <div data-tour="purchaser-summary" className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
      <div className="overflow-auto max-h-[220px]">
        <table className="border-collapse table-auto">
          <PurchaserSummaryTableHead showStatusBreakdown={showStatusBreakdown} />
          <tbody className="bg-white divide-y divide-gray-200">
            {purchaserSummary.length > 0 ? (
              purchaserSummary.map(item => {
                const isSelected = purchaserFilter.has(item.purchaser);
                return (
                  <tr
                    key={item.purchaser}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 hover:bg-blue-200' : 'hover:bg-gray-50'}`}
                    onClick={(e) => handleRowClick(item.purchaser, e.ctrlKey || e.metaKey)}
                  >
                    <td className={SUMMARY_TD_CLASS}>{item.purchaser}</td>
                    <PurchaserSummaryValueCells
                      values={item}
                      showStatusBreakdown={showStatusBreakdown}
                      cellClassName={SUMMARY_TD_CLASS}
                    />
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columnsCount} className="px-2 py-1 text-xs text-gray-500 text-center whitespace-nowrap">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-300">
            <tr className="cursor-pointer transition-colors hover:bg-gray-100" onClick={handleTotalClick}>
              <td className={SUMMARY_TOTAL_TD_CLASS}>Итого</td>
              <PurchaserSummaryValueCells
                values={totals}
                showStatusBreakdown={showStatusBreakdown}
                cellClassName={SUMMARY_TOTAL_TD_CLASS}
              />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
