'use client';

import { Check } from 'lucide-react';
import type { RibbonDayView } from '../../types/delivery-deadline-chart.types';
import { MONTH_FULL_LABELS } from '../../constants/delivery-deadline-chart.constants';

interface Props {
  day: RibbonDayView;
  month: number;
  onClick: () => void;
}

const cellClass = (day: RibbonDayView) => {
  if (day.isSelected) return 'bg-blue-100 border-blue-600';
  if (day.isToday) return 'bg-orange-50 border-orange-600';
  return day.isWeekend ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200';
};

const numberClass = (day: RibbonDayView) => {
  const weight = day.isToday || day.plan > 0 || day.fact > 0 ? 'font-bold' : '';
  if (day.isToday) return `text-orange-600 ${weight}`;
  return `${day.isPast ? 'text-slate-400' : 'text-slate-900'} ${weight}`;
};

/**
 * День в ленте месяца: день недели, число и счётчики — ожидалось по плану и не поставлено
 * (в прошлом красный, впереди синий) и поставлено по факту (зелёный с галочкой).
 */
export default function DeliveryRibbonDay({ day, month, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${day.day} ${MONTH_FULL_LABELS[month - 1]}\nНе поставлено (план): ${day.plan}\nПоставлено (факт): ${day.fact}`}
      className={`border rounded-[5px] px-[3px] pt-1 pb-[5px] min-h-[56px] min-w-0 flex flex-col items-center gap-[3px] hover:border-slate-400 ${cellClass(day)}`}
    >
      <span className="text-[9px] uppercase text-slate-400 leading-none">{day.weekday}</span>
      <span className={`text-[12px] leading-none tabular-nums ${numberClass(day)}`}>{day.day}</span>
      <span className="mt-auto w-full flex flex-col gap-0.5">
        {day.plan > 0 && (
          <span
            className={`text-[10px] font-bold text-center rounded-[3px] py-px ${
              day.isPast ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {day.plan}
          </span>
        )}
        {day.fact > 0 && (
          <span className="text-[10px] font-bold rounded-[3px] py-px bg-green-100 text-green-700 flex items-center justify-center gap-px">
            <Check className="w-2 h-2" strokeWidth={4} />
            {day.fact}
          </span>
        )}
      </span>
    </button>
  );
}
