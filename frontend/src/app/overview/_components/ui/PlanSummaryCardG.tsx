'use client';

import React from 'react';
import { DonutChartSvg } from './DonutChartSvg';

const C_BRAND = '#4169e1';
const C_OK = '#34a853';
const C_BAD = '#e53e3e';

function qualityColor(pct: number): string {
  if (pct >= 70) return C_OK;
  if (pct >= 30) return '#d97706';
  return C_BAD;
}

function qualityLabel(pct: number): string {
  if (pct >= 70) return 'высокое';
  if (pct >= 30) return 'среднее';
  return 'низкое';
}

interface Props {
  planned: number;
  initiated: number;
  excluded: number;
}

const LEGEND = [
  { key: 'planned', label: 'Запланированы', color: C_BRAND },
  { key: 'initiated', label: 'Инициированы', color: C_OK },
  { key: 'excluded', label: 'Исключены', color: C_BAD },
] as const;

export function PlanSummaryCardG({ planned, initiated, excluded }: Props) {
  const quality = planned > 0 ? Math.round((initiated / planned) * 100) : 0;
  const qColor = qualityColor(quality);
  const qLabel = qualityLabel(quality);

  const segments = [
    { value: planned, color: C_BRAND, label: 'Запланированы' },
    { value: initiated, color: C_OK, label: 'Инициированы' },
    { value: excluded, color: C_BAD, label: 'Исключены' },
  ];

  const values: Record<string, number> = { planned, initiated, excluded };

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Сводка месяца</h3>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: qColor + '22', color: qColor }}
        >
          {quality}% · {qLabel}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <DonutChartSvg
          segments={segments}
          centerValue={planned}
          centerLabel="ПЛАН"
        />

        <div className="flex flex-col gap-3 flex-1">
          {LEGEND.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500 flex-1">{label}</span>
              <span className="text-sm font-semibold text-gray-800">{values[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
