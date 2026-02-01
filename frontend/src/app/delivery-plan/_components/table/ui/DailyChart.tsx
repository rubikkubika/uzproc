'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyChartData } from '../types/delivery-plan-table.types';
import { MONTH_OPTIONS } from '../constants/delivery-plan-table.constants';

interface DailyChartProps {
  data: DailyChartData[];
  selectedMonth: number;
  selectedYear: number;
  selectedDay: number | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDaySelect: (day: number | null) => void;
}

/**
 * Компонент столбчатой диаграммы распределения поставок по дням месяца
 * Каждый столбец представляет день месяца и показывает количество запланированных поставок
 */
export default function DailyChart({
  data,
  selectedMonth,
  selectedYear,
  selectedDay,
  onMonthChange,
  onYearChange,
  onDaySelect,
}: DailyChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Переход к предыдущему месяцу
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onMonthChange(11);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(selectedMonth - 1);
    }
  };

  // Переход к следующему месяцу
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onMonthChange(0);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(selectedMonth + 1);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок с селектором месяца/года */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-0.5 hover:bg-gray-200 rounded transition-colors"
          title="Предыдущий месяц"
        >
          <ChevronLeft className="w-3 h-3 text-gray-600" />
        </button>

        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="px-2 py-0.5 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {MONTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="w-16 px-2 py-0.5 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          min={2020}
          max={2100}
        />

        <button
          onClick={handleNextMonth}
          className="p-0.5 hover:bg-gray-200 rounded transition-colors"
          title="Следующий месяц"
        >
          <ChevronRight className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-end justify-between gap-1" style={{ height: '96px' }}>
          {data.map(({ day, count }) => {
            const containerHeight = 96;
            const topMargin = 2;
            const availableHeight = containerHeight - topMargin;
            let columnHeight = 0;

            if (count > 0 && maxCount > 0) {
              const ratio = count / maxCount;
              const scaledRatio = Math.pow(ratio, 0.4);
              columnHeight = scaledRatio * availableHeight;
              if (columnHeight < 8) {
                columnHeight = 8;
              }
            }

            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                className="flex flex-col items-center flex-1 min-w-0"
              >
                <div className="flex-1 flex items-end w-full">
                  <div
                    className={`w-full rounded-t transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 ring-2 ring-blue-400'
                        : count > 0
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    style={{
                      height: `${columnHeight}px`,
                      minHeight: count > 0 ? '2px' : '0px',
                      maxHeight: containerHeight + 'px',
                    }}
                    title={`${day} число: ${count} поставок`}
                    onClick={() => onDaySelect(day)}
                  >
                    {count > 0 && (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-[7px] text-white font-bold">
                          {count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[9px] font-bold text-gray-700 mt-0.5">{day}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
