'use client';

import { CHART_HEIGHT } from '../constants/delivery-deadline-chart.constants';
import type { DeliveryDeadlineHistogram } from '../types/delivery-deadline-chart.types';
import DeliveryChartToolbar from './chart/DeliveryChartToolbar';
import DeliveryChartBar from './chart/DeliveryChartBar';
import DeliveryChartDayLabels from './chart/DeliveryChartDayLabels';

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
 * Столбчатая диаграмма над таблицей поставок: по столбцу на каждый день месяца.
 * Высота столбца — количество ЕЩЁ НЕ ПОСТАВЛЕННЫХ поставок с плановой датой поставки
 * в этот день. Над столбцом — галочка с количеством поставок со статусом «Поставлено»
 * и фактической датой поставки в этот день.
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
    <div data-tour="deadline-chart" className="border-b border-gray-200 px-4 py-2 bg-white">
      <DeliveryChartToolbar
        year={year}
        month={month}
        total={histogram?.total ?? 0}
        loading={loading}
        selectedDay={selectedDay}
        onToggleDay={onToggleDay}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onSelectMonth={onSelectMonth}
      />

      <div className="overflow-x-auto">
        <div className="flex items-end gap-0.5 min-w-[560px]" style={{ height: CHART_HEIGHT }}>
          {days.map(({ day, count, deliveredCount }) => {
            const date = new Date(year, month - 1, day);
            const weekday = date.getDay();
            const isPast = date < today;
            // При выбранном дне цветным остаётся только он, остальные гаснут.
            // Без выбора — гасим прошедшие дни, будущие показываем цветными.
            const isActive = hasSelection ? selectedDay === day : !isPast;

            return (
              <DeliveryChartBar
                key={day}
                day={day}
                month={month}
                year={year}
                count={count}
                deliveredCount={deliveredCount}
                maxCount={maxCount}
                isWeekend={weekday === 0 || weekday === 6}
                isActive={isActive}
                onClick={() => onToggleDay(day)}
              />
            );
          })}
        </div>

        <DeliveryChartDayLabels
          days={days}
          year={year}
          month={month}
          today={today}
          selectedDay={selectedDay}
        />
      </div>
    </div>
  );
}
