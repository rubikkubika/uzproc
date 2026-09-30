import { useCallback, useMemo } from 'react';
import type { PurchaserSummaryItem, PurchaserSummaryNumericField } from '../types/purchase-plan-items.types';

interface UsePurchaserSummaryTableParams {
  purchaserSummary: PurchaserSummaryItem[];
  purchaserFilter: Set<string>;
  setPurchaserFilter: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
}

const NUMERIC_FIELDS: PurchaserSummaryNumericField[] = [
  'count',
  'totalBudget',
  'totalComplexity',
  'inPlanCount',
  'inPlanBudget',
  'linkedToRequestCount',
  'linkedToRequestBudget',
  'excludedCount',
  'excludedBudget',
];

/**
 * Логика сводной таблицы по закупщикам:
 * строка «Итого» (сумма по выбранным закупщикам или по всем, если фильтр не задан),
 * клик по строке (фильтр по закупщику, Ctrl/⌘ — множественный выбор) и клик по «Итого» (сброс фильтра).
 */
export function usePurchaserSummaryTable({
  purchaserSummary,
  purchaserFilter,
  setPurchaserFilter,
  setCurrentPage,
}: UsePurchaserSummaryTableParams) {
  const totals = useMemo(() => {
    const selected = purchaserFilter.size === 0
      ? purchaserSummary
      : purchaserSummary.filter(item => purchaserFilter.has(item.purchaser));
    const result = {} as Record<PurchaserSummaryNumericField, number>;
    NUMERIC_FIELDS.forEach(field => {
      result[field] = selected.reduce((sum, item) => sum + (item[field] || 0), 0);
    });
    return result;
  }, [purchaserSummary, purchaserFilter]);

  const handleRowClick = useCallback((purchaser: string, isMultiSelect: boolean) => {
    const isSelected = purchaserFilter.has(purchaser);
    const newSet = new Set(purchaserFilter);
    if (isMultiSelect) {
      // Множественный выбор через Ctrl/Cmd
      if (isSelected) {
        newSet.delete(purchaser);
      } else {
        newSet.add(purchaser);
      }
    } else if (isSelected && purchaserFilter.size === 1) {
      // Выбран только этот закупщик — сбрасываем фильтр
      newSet.clear();
    } else {
      // Фильтр только на этого закупщика
      newSet.clear();
      newSet.add(purchaser);
    }
    setPurchaserFilter(newSet);
    setCurrentPage(0);
  }, [purchaserFilter, setPurchaserFilter, setCurrentPage]);

  const handleTotalClick = useCallback(() => {
    // «Итого» сбрасывает фильтр по закупщику
    setPurchaserFilter(new Set());
    setCurrentPage(0);
  }, [setPurchaserFilter, setCurrentPage]);

  return { totals, handleRowClick, handleTotalClick };
}
