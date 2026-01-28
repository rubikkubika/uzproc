'use client';

import type { DeliveryPlanSpecification } from '../types/delivery-plan.types';
import { WEEK_DAYS } from '../constants/delivery-plan.constants';
import { formatDateKey, isToday } from '../utils/delivery-plan.utils';
import { SpecificationWeekCard } from './SpecificationWeekCard';

interface CalendarWeekViewProps {
  calendarDates: Date[];
  itemsByDate: Map<string, DeliveryPlanSpecification[]>;
  onSelectSpec: (item: DeliveryPlanSpecification) => void;
  onDateClick: (date: Date) => void;
}

export function CalendarWeekView({ calendarDates, itemsByDate, onSelectSpec, onDateClick }: CalendarWeekViewProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEK_DAYS.map((day, dayIndex) => {
        const date = calendarDates[dayIndex];
        return (
          <div
            key={day}
            className="text-center border-b border-gray-200 pb-2 cursor-pointer hover:bg-gray-50 rounded-t"
            onClick={() => onDateClick(date)}
          >
            <div className="text-xs font-semibold text-gray-600">{day}</div>
            <div
              className={`text-sm font-medium mt-1 ${isToday(date) ? 'text-blue-600 font-bold' : 'text-gray-900'}`}
            >
              {date.getDate()}
            </div>
          </div>
        );
      })}
      {calendarDates.map((date, dayIndex) => {
        const dateKey = formatDateKey(date);
        const items = itemsByDate.get(dateKey) || [];
        const isTodayDate = isToday(date);

        return (
          <div
            key={dayIndex}
            onClick={(e) => {
              // Клик на пустую область ячейки (не на спецификации)
              if (e.target === e.currentTarget) {
                onDateClick(date);
              }
            }}
            className={`min-h-[500px] border border-gray-200 rounded p-3 cursor-pointer ${
              isTodayDate ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
            }`}
          >
            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
              {items.map((item) => (
                <SpecificationWeekCard key={item.id} item={item} onSelect={onSelectSpec} />
              ))}
              {items.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">Нет событий</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
