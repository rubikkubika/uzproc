'use client';

import { useMemo } from 'react';
import type { ContractSlaByPreparer } from '../types/contract-sla.types';

export interface ContractSlaByPreparerTableProps {
  year: number;
  rows: ContractSlaByPreparer[];
  loading?: boolean;
  error?: string | null;
  /** Выбранный специалист (фильтр). */
  selectedPreparer?: string | null;
  /** Клик по строке: повторный клик по выбранной снимает фильтр. */
  onPreparerClick?: (preparedBy: string) => void;
}

/**
 * Таблица «СЛА по договорным специалистам»: специалист, подписано, без нарушения, %.
 * Строки отсортированы по % СЛА от большего к меньшему.
 */
export function ContractSlaByPreparerTable({
  year,
  rows,
  loading,
  error,
  selectedPreparer = null,
  onPreparerClick,
}: ContractSlaByPreparerTableProps) {
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const pA = a.percentage ?? -1;
      const pB = b.percentage ?? -1;
      if (pB !== pA) return pB - pA;
      return a.preparedBy.localeCompare(b.preparedBy);
    });
  }, [rows]);

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col justify-center min-h-[200px] w-full max-w-[280px] shrink-0">
        <p className="text-xs font-medium text-gray-700 leading-tight">СЛА по специалистам</p>
        <p className="text-[10px] text-gray-500 leading-tight">{year} г.</p>
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col h-[200px] max-w-[280px] shrink-0 overflow-hidden">
      <p className="text-xs font-medium text-gray-700 leading-tight">СЛА по специалистам</p>
      <p className="text-[10px] text-gray-500 leading-tight mb-1">{year} г.</p>
      {loading ? (
        <p className="text-xs text-gray-500 leading-tight">Загрузка…</p>
      ) : sortedRows.length === 0 ? (
        <p className="text-xs text-gray-500 leading-tight">Нет данных</p>
      ) : (
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 -mx-0.5">
          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-1.5 py-0.5 text-left font-medium text-gray-600 whitespace-nowrap border-b border-gray-200">
                  Специалист
                </th>
                <th className="px-1.5 py-0.5 text-right font-medium text-gray-600 whitespace-nowrap border-b border-gray-200 tabular-nums">
                  Подписано
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
              {sortedRows.map((row) => {
                const isSelected =
                  selectedPreparer != null &&
                  selectedPreparer.trim() !== '' &&
                  row.preparedBy.trim() === selectedPreparer.trim();
                return (
                  <tr
                    key={row.preparedBy}
                    onClick={onPreparerClick ? () => onPreparerClick(row.preparedBy) : undefined}
                    className={
                      onPreparerClick
                        ? `cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 hover:bg-blue-200' : 'hover:bg-gray-50'}`
                        : 'hover:bg-gray-50'
                    }
                    title={
                      onPreparerClick
                        ? isSelected
                          ? 'Снять фильтр по специалисту'
                          : 'Показать только документы этого специалиста'
                        : undefined
                    }
                  >
                    <td className="px-1.5 py-0.5 text-gray-900 whitespace-nowrap border-r border-gray-100">
                      <span className={isSelected ? 'font-medium text-blue-700' : ''}>{row.preparedBy}</span>
                    </td>
                    <td className="px-1.5 py-0.5 text-right text-gray-700 tabular-nums border-r border-gray-100">
                      {row.totalSigned}
                    </td>
                    <td className="px-1.5 py-0.5 text-right text-gray-700 tabular-nums border-r border-gray-100">
                      {row.metSla}
                    </td>
                    <td className="px-1.5 py-0.5 text-right text-gray-900 tabular-nums font-medium">
                      {row.percentage != null ? `${Math.round(row.percentage)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
