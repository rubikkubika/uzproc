'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MONTH_LABELS,
  MONTH_FULL_LABELS,
  CHART_HEIGHT,
  MIN_BAR_HEIGHT,
} from '../constants/delivery-deadline-chart.constants';
import type { DeliveryDeadlineHistogram } from '../types/delivery-deadline-chart.types';

interface DeliveryDeadlineChartProps {
  year: number;
  month: number;
  histogram: DeliveryDeadlineHistogram | null;
  maxCount: number;
  loading: boolean;
  /** Выбранный день месяца — по нему отфильтрована таблица */
  selectedDay: number | null;
  onToggleDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonth: (month: number) => void;
}

/**
 * Столбчатая диаграмма над таблицей поставок: по столбцу на каждый день месяца,
 * высота — количество поставок с плановой датой поставки в этот день.
 * Клик по столбцу фильтрует таблицу по этому дню: выбранный столбец остаётся цветным,
 * остальные гасятся серым. Повторный клик снимает фильтр.
 * Прошедшие дни показаны серыми, сегодняшний день подписан оранжевым.
 */
export default function DeliveryDeadlineChart({
  year,
  month,
  histogram,
  maxCount,
  loading,
  selectedDay,
  onToggleDay,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
}: DeliveryDeadlineChartProps) {
  const days = histogram?.days ?? [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hasSelection = selectedDay !== null;

  return (
    <div className="border-b border-gray-200 px-4 py-2 bg-white">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-medium text-gray-700">Поставки по плановой дате</span>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrevMonth}
            className="p-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Предыдущий месяц"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {MONTH_LABELS.map((label, index) => (
            <button
              key={label}
              onClick={() => onSelectMonth(index + 1)}
              className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                month === index + 1
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={onNextMonth}
            className="p-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Следующий месяц"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-xs text-gray-500">{year}</span>
        <span className="text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">
          {loading ? 'Загрузка…' : `Всего: ${histogram?.total ?? 0}`}
        </span>
        {hasSelection && (
          <button
            onClick={() => onToggleDay(selectedDay)}
            className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors"
            title="Снять фильтр по дню"
          >
            Фильтр: {selectedDay} {MONTH_FULL_LABELS[month - 1]} ✕
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-end gap-0.5 min-w-[560px]" style={{ height: CHART_HEIGHT }}>
          {days.map(({ day, count }) => {
            const date = new Date(year, month - 1, day);
            const weekday = date.getDay();
            const isWeekend = weekday === 0 || weekday === 6;
            const isPast = date < today;
            const isSelected = selectedDay === day;
            // При выбранном дне цветным остаётся только он, остальные гаснут.
            // Без выбора — гасим прошедшие дни, будущие показываем цветными.
            const isActive = hasSelection ? isSelected : !isPast;
            const height = maxCount > 0 && count > 0
              ? Math.max(MIN_BAR_HEIGHT, Math.round((count / maxCount) * (CHART_HEIGHT - 4)))
              : 0;

            return (
              <button
                key={day}
                type="button"
                onClick={() => onToggleDay(day)}
                className={`flex-1 flex flex-col justify-end items-center h-full rounded-sm transition-colors ${
                  isWeekend ? 'bg-gray-50' : ''
                } hover:bg-blue-50`}
                title={`${day} ${MONTH_FULL_LABELS[month - 1]} ${year}: ${count}`}
              >
                <div
                  className={`w-full rounded-t-sm flex justify-center transition-all ${
                    count > 0
                      ? isActive ? 'bg-blue-500' : 'bg-gray-400'
                      : 'bg-gray-200'
                  }`}
                  style={{ height: count > 0 ? height : 2 }}
                >
                  {count > 0 && (
                    <span className="text-[9px] leading-none text-white font-medium pt-1">{count}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-0.5 min-w-[560px] mt-1">
          {days.map(({ day }) => {
            const date = new Date(year, month - 1, day);
            const weekday = date.getDay();
            const isWeekend = weekday === 0 || weekday === 6;
            const isToday = date.getTime() === today.getTime();
            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                className={`flex-1 text-center text-[9px] leading-none ${
                  isSelected
                    ? 'text-blue-700 font-semibold'
                    : isToday
                    ? 'text-orange-600 font-semibold'
                    : isWeekend
                    ? 'text-gray-400'
                    : 'text-gray-600'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
