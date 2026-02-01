import { useState, useCallback } from 'react';
import { useDebouncedFiltersSync } from './useDebouncedFiltersSync';
import { getCurrentMonthAndYear } from '../utils/delivery-plan-table.utils';
import type { DeliveryPlanTableFilters } from '../types/delivery-plan-table.types';

/**
 * Хук для управления фильтрами таблицы плана поставок
 * Реализует архитектуру с debounce для предотвращения "дёргания" таблицы
 */
export function useDeliveryPlanTableFilters(setCurrentPage: (page: number) => void) {
  // ДВА состояния: localFilters (UI) и filters (данные)
  const [localFilters, setLocalFilters] = useState<DeliveryPlanTableFilters>({
    innerId: '',
    name: '',
    title: '',
    cfo: '',
    company: '',
    category: '',
    plannedDeliveryStartDate: '',
    plannedDeliveryEndDate: '',
    purchaseRequestId: '',
  });

  const [filters, setFilters] = useState<DeliveryPlanTableFilters>({
    innerId: '',
    name: '',
    title: '',
    cfo: '',
    company: '',
    category: '',
    plannedDeliveryStartDate: '',
    plannedDeliveryEndDate: '',
    purchaseRequestId: '',
  });

  // Состояние для отслеживания focused поля
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Фильтр месяца и года
  const { month: currentMonth, year: currentYear } = getCurrentMonthAndYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Фильтр по дню
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Debounce хук для синхронизации localFilters и filters
  useDebouncedFiltersSync({
    localFilters,
    filtersFromHook: filters,
    focusedField,
    setFilters,
    setCurrentPage,
  });

  // Обработчик изменения текстовых фильтров
  const handleFilterChange = useCallback((field: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  // Обработчик фокуса на поле
  const handleFocusForHeader = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  // Обработчик потери фокуса
  const handleBlurForHeader = useCallback(() => {
    // Не сбрасываем focusedField сразу, чтобы debounce мог восстановить фокус
    setTimeout(() => {
      setFocusedField(null);
    }, 100);
  }, []);

  // Сброс всех фильтров
  const resetFilters = useCallback(() => {
    const emptyFilters: DeliveryPlanTableFilters = {
      innerId: '',
      name: '',
      title: '',
      cfo: '',
      company: '',
      category: '',
      plannedDeliveryStartDate: '',
      plannedDeliveryEndDate: '',
      purchaseRequestId: '',
    };
    setLocalFilters(emptyFilters);
    setFilters(emptyFilters);
    setCurrentPage(0);

    const { month, year } = getCurrentMonthAndYear();
    setSelectedMonth(month);
    setSelectedYear(year);
    setSelectedDay(null);
  }, [setCurrentPage]);

  // Обработчик выбора дня
  const handleDaySelect = useCallback((day: number | null) => {
    setSelectedDay(prev => prev === day ? null : day);
    setCurrentPage(0);
  }, [setCurrentPage]);

  return {
    // Состояния фильтров
    localFilters,
    filters,
    focusedField,
    selectedMonth,
    selectedYear,
    selectedDay,

    // Сеттеры
    setLocalFilters,
    setFilters,
    setFocusedField,
    setSelectedMonth,
    setSelectedYear,
    setSelectedDay,

    // Обработчики
    handleFilterChange,
    handleFocusForHeader,
    handleBlurForHeader,
    handleDaySelect,
    resetFilters,
  };
}
