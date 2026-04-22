'use client';

import React from 'react';
import type { MonthExecutionPoint } from '../hooks/useOverviewPurchasePlanYearChart';

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const W = 340;
const H = 140;
const PAD = { top: 12, right: 8, bottom: 28, left: 32 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

function barColor(pct: number): string {
  if (pct >= 70) return '#34a853';
  if (pct >= 30) return '#d97706';
  return '#e53e3e';
}

interface Props {
  points: MonthExecutionPoint[];
  currentMonth: number;
  loading: boolean;
}

export function MonthlyExecutionChartG({ points, currentMonth, loading }: Props) {
  const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const pointMap = new Map(points.map((p) => [p.month, p]));

  const barW = CHART_W / 12;
  const barPad = barW * 0.2;

  const yLines = [0, 25, 50, 75, 100];

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-700">Выполнение плана по месяцам</h3>

      {loading ? (
        <div className="h-[140px] bg-gray-100 rounded animate-pulse" />
      ) : (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
          {/* Y grid lines */}
          {yLines.map((y) => {
            const cy = PAD.top + CHART_H - (y / 100) * CHART_H;
            return (
              <g key={y}>
                <line
                  x1={PAD.left} y1={cy} x2={PAD.left + CHART_W} y2={cy}
                  stroke="#e5e7eb" strokeWidth={1}
                />
                <text x={PAD.left - 4} y={cy + 3.5} textAnchor="end"
                  style={{ fontSize: 8, fill: '#9ca3af' }}>
                  {y}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {ALL_MONTHS.map((m) => {
            const pt = pointMap.get(m);
            const pct = pt?.pct ?? 0;
            const hasData = pt && pt.planned > 0;
            const x = PAD.left + (m - 1) * barW;
            const barH = hasData ? Math.max((pct / 100) * CHART_H, 2) : 0;
            const barY = PAD.top + CHART_H - barH;
            const isCurrent = m === currentMonth;
            const color = hasData ? barColor(pct) : '#e5e7eb';

            return (
              <g key={m}>
                {/* Current month highlight */}
                {isCurrent && (
                  <rect
                    x={x} y={PAD.top} width={barW} height={CHART_H}
                    fill="#f3f4f6" rx={2}
                  />
                )}
                {/* Bar */}
                <rect
                  x={x + barPad} y={barY}
                  width={barW - barPad * 2} height={barH}
                  fill={color} rx={2}
                  opacity={isCurrent ? 1 : 0.75}
                />
                {/* Value label on bar */}
                {hasData && pct > 0 && (
                  <text
                    x={x + barW / 2} y={barY - 2}
                    textAnchor="middle"
                    style={{ fontSize: 7, fill: color, fontWeight: 600 }}
                  >
                    {pct}%
                  </text>
                )}
                {/* Month label */}
                <text
                  x={x + barW / 2}
                  y={PAD.top + CHART_H + 10}
                  textAnchor="middle"
                  style={{
                    fontSize: 8,
                    fill: isCurrent ? '#111827' : '#9ca3af',
                    fontWeight: isCurrent ? 700 : 400,
                  }}
                >
                  {MONTH_LABELS[m - 1]}
                </text>
              </g>
            );
          })}
        </svg>
      )}

    </div>
  );
}
