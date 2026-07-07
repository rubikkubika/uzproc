'use client';

import React from 'react';
import { usePurchaserDistribution } from '../hooks/usePurchaserDistribution';
import { usePurchaserDistributionExport } from '../hooks/usePurchaserDistributionExport';
import { PurchaserDistributionTable } from './PurchaserDistributionTable';
import { PurchaserBalanceSummary } from './PurchaserBalanceSummary';

/** Целое с разделителем тысяч. */
function formatInt(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

/**
 * Дэшборд «Распределение по закупщикам».
 * Предлагаемое распределение заявок (срез 2026) по предполагаемым закупщикам —
 * владельцам тематических категорий, с учётом нового закупщика.
 */
export function PurchaserDistributionTabContent() {
  const { groups, grandTotals, balance } = usePurchaserDistribution();
  const { exportToExcel } = usePurchaserDistributionExport();

  return (
    <div className="w-full p-2 sm:p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Распределение по закупщикам</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Предлагаемое распределение заявок ({formatInt(grandTotals.count)} шт., срез 2026) по
            предполагаемым закупщикам с учётом нового закупщика. Бюджет — в млн, сложность — сумма
            баллов.
          </p>
        </div>
        <button
          type="button"
          onClick={exportToExcel}
          className="flex-shrink-0 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Выгрузить в Excel
        </button>
      </div>

      <div className="mb-3">
        <PurchaserBalanceSummary balance={balance} />
      </div>

      <PurchaserDistributionTable groups={groups} grandTotals={grandTotals} />
    </div>
  );
}
