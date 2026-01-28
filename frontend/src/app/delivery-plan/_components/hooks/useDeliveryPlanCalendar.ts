import { useState, useMemo, useCallback } from 'react';
import type { DeliveryPlanSpecification, DeliveryPlanViewMode } from '../types/delivery-plan.types';

export function useDeliveryPlanCalendar(specifications: DeliveryPlanSpecification[]) {
  const [viewMode, setViewMode] = useState<DeliveryPlanViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDay = (firstDay.getDay() + 6) % 7;
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDay);
      const endDay = (lastDay.getDay() + 6) % 7;
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDay));
      const current = new Date(startDate);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      const today = new Date(currentDate);
      const dayOfWeek = (today.getDay() + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
      }
    }

    return dates;
  }, [currentDate, viewMode]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, DeliveryPlanSpecification[]>();
    specifications.forEach((spec) => {
      const dateStr = spec.plannedDeliveryStartDate;
      if (dateStr) {
        try {
          // Парсим дату и нормализуем к локальному времени (без учета часового пояса)
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            // Используем локальную дату, чтобы избежать проблем с часовыми поясами
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${day}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(spec);
          }
        } catch {
          // skip invalid date
        }
      }
    });
    return map;
  }, [specifications]);

  const goToPrevious = useCallback(() => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  }, [viewMode, currentDate]);

  const goToNext = useCallback(() => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  }, [viewMode, currentDate]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  return {
    viewMode,
    setViewMode,
    currentDate,
    calendarDates,
    itemsByDate,
    goToPrevious,
    goToNext,
    goToToday,
  };
}
