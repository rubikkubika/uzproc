'use client';

import React from 'react';
import type { PurchaserSummaryNumericField } from '../types/purchase-plan-items.types';
import { PURCHASER_SUMMARY_STATUS_GROUPS, SUMMARY_GROUP_START_CLASS } from '../constants/purchaser-summary.constants';
import {
  formatSummaryBreakdownValue,
  formatSummaryBudget,
  formatSummaryComplexity,
} from '../utils/purchase-plan-items.utils';

interface PurchaserSummaryValueCellsProps {
  values: Record<PurchaserSummaryNumericField, number>;
  showStatusBreakdown: boolean;
  /** Базовый класс ячейки (обычная строка или «Итого») */
  cellClassName: string;
}

/**
 * Числовые ячейки строки свода по закупщикам: итоги (кол-во, сумма, сложность)
 * и, при необходимости, кол-во и сумма по каждой группе статусов.
 */
export default function PurchaserSummaryValueCells({
  values,
  showStatusBreakdown,
  cellClassName,
}: PurchaserSummaryValueCellsProps) {
  return (
    <>
      <td className={`${cellClassName} text-right`}>{values.count}</td>
      <td className={`${cellClassName} text-right`}>{formatSummaryBudget(values.totalBudget)}</td>
      <td className={`${cellClassName} text-right`}>{formatSummaryComplexity(values.totalComplexity)}</td>
      {showStatusBreakdown && PURCHASER_SUMMARY_STATUS_GROUPS.map(group => (
        <React.Fragment key={group.key}>
          <td className={`${cellClassName} ${SUMMARY_GROUP_START_CLASS} text-right`}>
            {formatSummaryBreakdownValue(values[group.countField], false)}
          </td>
          <td className={`${cellClassName} text-right`}>
            {formatSummaryBreakdownValue(values[group.budgetField], true)}
          </td>
        </React.Fragment>
      ))}
    </>
  );
}
