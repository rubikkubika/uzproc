'use client';

import React from 'react';
import type { CfoSummaryRow } from '../hooks/usePurchasePlanMonthBlockData';

const COLS = [
  { key: 'market', label: 'Запланированы', color: '#4169e1' },
  { key: 'linked', label: 'Инициированы', color: '#4169e1' },
  { key: 'excluded', label: 'Исключены', color: '#e53e3e' },
  { key: 'requestsPlanned', label: 'Плановые', color: '#34a853' },
  { key: 'requestsNonPlanned', label: 'Внеплановые', color: '#4169e1' },
  { key: 'requestsUnapproved', label: 'Неутверждённые', color: '#d97706' },
  { key: 'requestsExcluded', label: 'Отменённые', color: '#e53e3e' },
] as const;

type ColKey = typeof COLS[number]['key'];

function cellBg(value: number, colMax: number, color: string): string {
  if (colMax === 0) return 'transparent';
  const alpha = 0.08 + (value / colMax) * 0.55;
  const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${color}${hex}`;
}

function qualColor(pct: number): string {
  if (pct >= 70) return '#34a853';
  if (pct >= 30) return '#d97706';
  return '#e53e3e';
}

function qualLabel(pct: number): string {
  if (pct >= 70) return 'высокое';
  if (pct >= 30) return 'среднее';
  return 'низкое';
}

function fmtBudget(val: number): string {
  if (val === 0) return '—';
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} млрд`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} млн`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)} тыс`;
  return `${val}`;
}

interface Props {
  rows: CfoSummaryRow[];
}

export function CfoHeatmapCardG({ rows }: Props) {
  if (rows.length === 0) return null;

  const colMaxes = COLS.reduce<Record<string, number>>((acc, col) => {
    acc[col.key] = Math.max(...rows.map((r) => r[col.key as keyof CfoSummaryRow] as number), 0);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Heatmap · ЦФО × Метрики</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 font-medium text-gray-500 border border-gray-200 min-w-[160px]">ЦФО</th>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 font-medium text-center border border-gray-200 min-w-[80px]"
                  style={{ color: col.color }}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 font-medium text-center text-gray-500 border border-gray-200 min-w-[90px]">Σ Бюджет</th>
              <th className="px-2 py-2 font-medium text-center text-gray-500 border border-gray-200 min-w-[70px]">Качество</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const qual = row.market > 0 ? Math.round((row.linked / row.market) * 100) : 0;
              const qCol = qualColor(qual);
              return (
                <tr key={row.cfo} className="hover:brightness-95 transition-all">
                  <td className="px-3 py-1.5 font-medium text-gray-700 border border-gray-200 bg-gray-50">
                    {row.cfo}
                  </td>
                  {COLS.map((col) => {
                    const val = row[col.key as keyof CfoSummaryRow] as number;
                    const bg = cellBg(val, colMaxes[col.key], col.color);
                    return (
                      <td
                        key={col.key}
                        className="px-2 py-1.5 text-center font-medium border border-gray-200"
                        style={{ backgroundColor: bg, color: val === 0 ? '#9ca3af' : '#111827' }}
                      >
                        {val === 0 ? '—' : val}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center text-gray-700 font-medium border border-gray-200 whitespace-nowrap">
                    {fmtBudget(row.sumMarket)}
                  </td>
                  <td className="px-2 py-1.5 text-center border border-gray-200">
                    {row.market > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                        style={{ backgroundColor: qCol + '22', color: qCol }}
                      >
                        {qual}% · {qualLabel(qual)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
