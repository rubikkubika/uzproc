'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../constants/delivery-plan.constants';
import type { DeliveryPlanViewMode } from '../types/delivery-plan.types';

interface CalendarHeaderProps {
  viewMode: DeliveryPlanViewMode;
  setViewMode: (mode: DeliveryPlanViewMode) => void;
  currentDate: Date;
  calendarDates: Date[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  viewMode,
  setViewMode,
  currentDate,
  calendarDates,
  onPrevious,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  const title =
    viewMode === 'month'
      ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : `Неделя ${calendarDates[0]?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${calendarDates[calendarDates.length - 1]?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onPrevious}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          title="Предыдущий период"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Сегодня
        </button>
        <button
          onClick={onNext}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          title="Следующий период"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('month')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Месяц
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Неделя
        </button>
      </div>
    </div>
  );
}
