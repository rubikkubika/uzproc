'use client';

import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';
import { WEEK_DAYS } from '../constants/delivery-plan.constants';
import { formatDateKey, isToday, isCurrentMonth } from '../utils/delivery-plan.utils';
import { SpecificationCellCard } from './SpecificationCellCard';

interface CalendarMonthViewProps {
  calendarDates: Date[];
  currentDate: Date;
  itemsByDate: Map<string, DeliveryPlanSpecification[]>;
  onSelectSpec: (item: DeliveryPlanSpecification) => void;
  onDateClick: (date: Date) => void;
}

const MAX_ITEMS_PER_CELL = 5;

export function CalendarMonthView({
  calendarDates,
  currentDate,
  itemsByDate,
  onSelectSpec,
  onDateClick,
}: CalendarMonthViewProps) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEK_DAYS.map((day) => (
        <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
          {day}
        </div>
      ))}
      {calendarDates.map((date, index) => {
        const dateKey = formatDateKey(date);
        const items = itemsByDate.get(dateKey) || [];
        const isTodayDate = isToday(date);
        const isCurrentMonthDate = isCurrentMonth(date, currentDate);

        return (
          <div
            key={index}
            onClick={(e) => {
              // Клик на пустую область ячейки (не на спецификации)
              if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('date-number')) {
                onDateClick(date);
              }
            }}
            className={`min-h-[150px] border border-gray-200 rounded p-2 cursor-pointer ${
              !isCurrentMonthDate ? 'bg-gray-50 opacity-50' : 'bg-white'
            } ${isTodayDate ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onDateClick(date);
              }}
              className={`text-sm font-medium mb-2 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 -mx-1 -my-0.5 date-number ${
                isTodayDate ? 'text-blue-600 font-bold' : isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {date.getDate()}
            </div>
            <div className="space-y-1 max-h-[120px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {items.slice(0, MAX_ITEMS_PER_CELL).map((item) => (
                <SpecificationCellCard key={item.id} item={item} onSelect={onSelectSpec} />
              ))}
              {items.length > MAX_ITEMS_PER_CELL && (
                <div className="text-xs text-gray-500 px-2 py-1">+{items.length - MAX_ITEMS_PER_CELL} еще</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
