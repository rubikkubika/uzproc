'use client';

import { useMemo } from 'react';
import { purchaserDisplayName } from '@/utils/purchaser';
import type { OverviewSlaPercentageByPurchaser } from '../hooks/useOverviewSlaData';

export interface SlaByPurchaserTableProps {
  year: number;
  rows: OverviewSlaPercentageByPurchaser[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Таблица «Выполнение СЛА по году в разрезе закупщиков»: закупщик, завершено, в срок, %.
 * Строки отсортированы по % СЛА от большего к меньшему.
 */
export function SlaByPurchaserTable({ year, rows, loading, error }: SlaByPurchaserTableProps) {
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const pA = a.percentage ?? -1;
      const pB = b.percentage ?? -1;
      if (pB !== pA) return pB - pA;
      return (a.purchaser ?? '').localeCompare(b.purchaser ?? '');
    });
  }, [rows]);
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col justify-center min-h-[200px] w-full max-w-[280px] shrink-0">
        <p className="text-xs font-medium text-gray-700 leading-tight">СЛА по закупщикам</p>
        <p className="text-[10px] text-gray-500 leading-tight">{year} г.</p>
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col min-h-[200px] max-w-[280px] shrink-0 overflow-hidden">
      <p className="text-xs font-medium text-gray-700 leading-tight">СЛА по закупщикам</p>
      <p className="text-[10px] text-gray-500 leading-tight mb-1">{year} г.</p>
      {loading ? (
        <p className="text-xs text-gray-500 leading-tight">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-500 leading-tight">Нет данных</p>
      ) : (
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 -mx-0.5">
          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-1.5 py-0.5 text-left font-medium text-gray-600 whitespace-nowrap border-b border-gray-200">
                  Закупщик
                </th>
                <th className="px-1.5 py-0.5 text-right font-medium text-gray-600 whitespace-nowrap border-b border-gray-200 tabular-nums">
                  Завершено
                </th>
                <th className="px-1.5 py-0.5 text-right font-medium text-gray-600 whitespace-nowrap border-b border-gray-200 tabular-nums">
                  В срок
                </th>
                <th className="px-1.5 py-0.5 text-right font-medium text-gray-600 whitespace-nowrap border-b border-gray-200 tabular-nums">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedRows.map((row) => (
                <tr key={row.purchaser} className="hover:bg-gray-50">
                  <td className="px-1.5 py-0.5 text-gray-900 whitespace-nowrap border-r border-gray-100">
                    {purchaserDisplayName(row.purchaser)}
                  </td>
                  <td className="px-1.5 py-0.5 text-right text-gray-700 tabular-nums border-r border-gray-100">
                    {row.totalCompleted}
                  </td>
                  <td className="px-1.5 py-0.5 text-right text-gray-700 tabular-nums border-r border-gray-100">
                    {row.metSla}
                  </td>
                  <td className="px-1.5 py-0.5 text-right text-gray-900 tabular-nums font-medium">
                    {row.percentage != null ? `${Math.round(row.percentage)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
