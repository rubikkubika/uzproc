'use client';

import { useRouter } from 'next/navigation';
import { useDeliveryPlan } from './hooks/useDeliveryPlan';
import { CalendarHeader } from './ui/CalendarHeader';
import { CalendarMonthView } from './ui/CalendarMonthView';
import { CalendarWeekView } from './ui/CalendarWeekView';
import { SpecificationDetailsPanel } from './ui/SpecificationDetailsPanel';
import { DaySpecificationsPanel } from './ui/DaySpecificationsPanel';
import { formatDateKey } from './utils/delivery-plan.utils';
import type { DeliveryPlanSpecification } from './types/delivery-plan.types';

/**
 * Компонент "План поставок" - календарь с плановыми датами поставок спецификаций
 * Отображает спецификации в виде календаря (месяц/неделя) с возможностью просмотра деталей
 */
export default function DeliveryPlan() {
  const router = useRouter();
  const { loading, calendar, selectedSpec, setSelectedSpec, selectedDate, setSelectedDate } = useDeliveryPlan();
  const {
    viewMode,
    setViewMode,
    currentDate,
    calendarDates,
    itemsByDate,
    goToPrevious,
    goToNext,
    goToToday,
  } = calendar;

  const handleDateClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    setSelectedDate(dateKey);
    setSelectedSpec(null); // Закрываем детали спецификации, если открыты
  };

  const handleSpecClick = (spec: DeliveryPlanSpecification) => {
    setSelectedSpec(spec);
    setSelectedDate(null); // Закрываем список дня, если открыт
  };

  const handleClosePanel = () => {
    setSelectedDate(null);
    setSelectedSpec(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-w-0 min-h-0">
        <div className="flex-1 overflow-hidden min-h-0 min-w-0 flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 px-2 sm:px-3 lg:px-4">План поставок</h1>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
            <CalendarHeader
              viewMode={viewMode}
              setViewMode={setViewMode}
              currentDate={currentDate}
              calendarDates={calendarDates}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onToday={goToToday}
            />

            <div className="p-4 flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Загрузка спецификаций...</div>
                </div>
              ) : viewMode === 'month' ? (
                <CalendarMonthView
                  calendarDates={calendarDates}
                  currentDate={currentDate}
                  itemsByDate={itemsByDate}
                  onSelectSpec={handleSpecClick}
                  onDateClick={handleDateClick}
                />
              ) : (
                <CalendarWeekView
                  calendarDates={calendarDates}
                  itemsByDate={itemsByDate}
                  onSelectSpec={handleSpecClick}
                  onDateClick={handleDateClick}
                />
              )}
            </div>
          </div>
        </div>

        {selectedDate && itemsByDate.get(selectedDate) && (
          <DaySpecificationsPanel
            date={selectedDate}
            specifications={itemsByDate.get(selectedDate) || []}
            onClose={handleClosePanel}
            onSelectSpec={handleSpecClick}
          />
        )}
        {selectedSpec && !selectedDate && (
          <SpecificationDetailsPanel spec={selectedSpec} onClose={handleClosePanel} />
        )}
      </div>
    </div>
  );
}
