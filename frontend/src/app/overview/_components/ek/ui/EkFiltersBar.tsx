'use client';

import type { ReactNode } from 'react';

interface EkFiltersBarProps {
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  /** Бейджи режима (появляются, когда данные загружены) */
  children?: ReactNode;
}

/** Панель фильтров дашборда ЕК: заголовок, год, бейджи режима */
export function EkFiltersBar({ year, availableYears, onYearChange, children }: EkFiltersBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm px-3.5 py-2.5 flex items-center gap-3.5 flex-wrap">
      <h2 className="text-sm font-semibold text-gray-900 mr-1.5">Закупки у единственного источника</h2>
      <label className="flex items-center gap-2">
        <span className="text-[13px] text-gray-700">Год</span>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="text-[13px] py-[5px] pl-2.5 pr-7 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      {children}
    </div>
  );
}
