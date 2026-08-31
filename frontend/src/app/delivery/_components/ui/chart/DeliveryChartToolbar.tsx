'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_LABELS, MONTH_FULL_LABELS } from '../../constants/delivery-deadline-chart.constants';

interface Props {
  year: number;
  month: number;
  /** Непоставленные поставки месяца — сумма столбцов */
  total: number;
  loading: boolean;
  selectedDay: number | null;
  onToggleDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonth: (month: number) => void;
}

/** Панель над диаграммой: переключатель месяцев, итоги и активный фильтр по дню. */
export default function DeliveryChartToolbar({
  year,
  month,
  total,
  loading,
  selectedDay,
  onToggleDay,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
}: Props) {
  return (
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
        {loading ? 'Загрузка…' : `Всего: ${total}`}
      </span>
      {selectedDay !== null && (
        <button
          onClick={() => onToggleDay(selectedDay)}
          className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors"
          title="Снять фильтр по дню"
        >
          Фильтр: {selectedDay} {MONTH_FULL_LABELS[month - 1]} ✕
        </button>
      )}
    </div>
  );
}
