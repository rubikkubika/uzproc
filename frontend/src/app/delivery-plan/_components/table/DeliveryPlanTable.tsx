'use client';

import React from 'react';
import { useDeliveryPlanTable } from './hooks/useDeliveryPlanTable';
import DeliveryPlanTableHeader from './ui/DeliveryPlanTableHeader';
import DeliveryPlanTableBody from './ui/DeliveryPlanTableBody';
import DailyChart from './ui/DailyChart';

/**
 * Главный компонент таблицы плана поставок
 * Интегрирует все хуки и UI компоненты
 */
export default function DeliveryPlanTable() {
  const table = useDeliveryPlanTable();

  if (table.loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (table.error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-8">
          <p className="text-red-600">Ошибка: {table.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Верхняя часть: заголовок с фильтром месяца и диаграммой */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex-shrink-0">
        <DeliveryPlanTableHeader
          selectedMonth={table.filters.selectedMonth}
          selectedYear={table.filters.selectedYear}
          selectedDay={table.filters.selectedDay}
          onMonthChange={table.handleMonthChange}
          onYearChange={table.handleYearChange}
          onDaySelect={table.filters.handleDaySelect}
          dailyChartData={table.dailyChartData}
        />
      </div>

      {/* Нижняя часть: таблица на всю ширину */}
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col min-h-0">
        <DeliveryPlanTableBody
          items={table.items}
          localFilters={table.filters.localFilters}
          focusedField={table.filters.focusedField}
          onFilterChange={table.filters.handleFilterChange}
          onFocusForHeader={table.filters.handleFocusForHeader}
          onBlurForHeader={table.filters.handleBlurForHeader}
          onResetFilters={table.filters.resetFilters}
        />
      </div>
    </div>
  );
}
