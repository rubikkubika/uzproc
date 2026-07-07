'use client';

import React from 'react';
import { PurchaserBalanceRow } from '../hooks/usePurchaserDistribution';

/** Целое с разделителем тысяч. */
function formatInt(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

interface PurchaserBalanceSummaryProps {
  balance: PurchaserBalanceRow[];
}

/**
 * Сводка нагрузки: сколько заявок закупщик ведёт сейчас против предполагаемого
 * распределения (по владельцу категории).
 */
export function PurchaserBalanceSummary({ balance }: PurchaserBalanceSummaryProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {balance.map((row) => {
        const delta = row.proposedCount - row.currentCount;
        return (
          <div
            key={row.purchaser}
            className="flex flex-col gap-0.5 rounded border border-gray-300 bg-white px-2 py-1.5 min-w-[140px]"
          >
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-gray-900">{row.purchaser}</span>
              {row.isNew && (
                <span className="px-1 py-0.5 text-[10px] leading-none rounded bg-blue-100 text-blue-700 border border-blue-200">
                  новый
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 tabular-nums">
              ведёт: <span className="text-gray-900">{formatInt(row.currentCount)}</span>
              {' → '}
              предполагается: <span className="text-gray-900">{formatInt(row.proposedCount)}</span>
            </div>
            {delta !== 0 && (
              <div
                className={`text-[11px] tabular-nums ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {delta > 0 ? `+${formatInt(delta)}` : formatInt(delta)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
