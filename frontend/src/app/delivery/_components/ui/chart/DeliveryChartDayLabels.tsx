'use client';

import type { DeliveryDeadlineDay } from '../../types/delivery-deadline-chart.types';

interface Props {
  days: DeliveryDeadlineDay[];
  year: number;
  month: number;
  today: Date;
  selectedDay: number | null;
}

/** Подписи дней под столбцами: выходные — серым, сегодня — оранжевым, выбранный день — синим. */
export default function DeliveryChartDayLabels({ days, year, month, today, selectedDay }: Props) {
  return (
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
  );
}
