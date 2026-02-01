import { useState, useEffect, useCallback } from 'react';
import { useDeliveryPlanTableFilters } from './useDeliveryPlanTableFilters';
import { useDeliveryPlanTableData } from './useDeliveryPlanTableData';
import { useDailyChart } from './useDailyChart';

/**
 * Главный хук таблицы плана поставок
 * Композирует все остальные хуки и управляет состоянием таблицы
 */
export function useDeliveryPlanTable() {
  const [currentPage, setCurrentPage] = useState(0);

  // Хуки
  const filtersHook = useDeliveryPlanTableFilters(setCurrentPage);
  const dataHook = useDeliveryPlanTableData();
  const dailyChartData = useDailyChart(
    dataHook.items,
    filtersHook.selectedMonth,
    filtersHook.selectedYear
  );

  // Загружаем данные при изменении фильтров или месяца
  useEffect(() => {
    dataHook.fetchData(
      filtersHook.filters,
      filtersHook.selectedMonth,
      filtersHook.selectedYear,
      filtersHook.selectedDay
    );
  }, [
    filtersHook.filters,
    filtersHook.selectedMonth,
    filtersHook.selectedYear,
    filtersHook.selectedDay,
  ]);

  // Обработчик изменения месяца
  const handleMonthChange = useCallback((month: number) => {
    filtersHook.setSelectedMonth(month);
    filtersHook.setSelectedDay(null); // Сбрасываем выбранный день при смене месяца
    setCurrentPage(0);
  }, [filtersHook]);

  // Обработчик изменения года
  const handleYearChange = useCallback((year: number) => {
    filtersHook.setSelectedYear(year);
    filtersHook.setSelectedDay(null); // Сбрасываем выбранный день при смене года
    setCurrentPage(0);
  }, [filtersHook]);

  return {
    // Данные
    items: dataHook.items,
    loading: dataHook.loading,
    error: dataHook.error,
    dailyChartData,

    // Фильтры
    filters: filtersHook,

    // Пагинация
    currentPage,
    setCurrentPage,

    // Обработчики
    handleMonthChange,
    handleYearChange,
  };
}
