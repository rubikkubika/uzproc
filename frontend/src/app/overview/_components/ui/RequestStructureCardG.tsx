'use client';

import React from 'react';

const C_OK = '#34a853';
const C_BRAND = '#4169e1';
const C_WARN = '#d97706';
const C_BAD = '#e53e3e';

interface Bar {
  label: string;
  value: number;
  color: string;
}

interface Props {
  planned: number;
  unplanned: number;
  unapproved: number;
  cancelled: number;
}

export function RequestStructureCardG({ planned, unplanned, unapproved, cancelled }: Props) {
  const bars: Bar[] = [
    { label: 'Плановые', value: planned, color: C_OK },
    { label: 'Внеплановые', value: unplanned, color: C_BRAND },
    { label: 'Неутверждённые', value: unapproved, color: C_WARN },
    { label: 'Отменённые', value: cancelled, color: C_BAD },
  ];

  const total = bars.reduce((s, b) => s + b.value, 0);
  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Структура заявок</h3>
        <span className="text-xs text-gray-400">Итого: {total}</span>
      </div>

      <div className="flex flex-col gap-3">
        {bars.map((bar) => {
          const pct = Math.round((bar.value / maxVal) * 100);
          return (
            <div key={bar.label} className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{bar.label}</span>
                <span className="text-sm font-semibold text-gray-800">{bar.value}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: bar.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
