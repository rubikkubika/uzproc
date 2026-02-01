'use client';

import React from 'react';
import DailyChart from './DailyChart';
import type { DailyChartData } from '../types/delivery-plan-table.types';

interface DeliveryPlanTableHeaderProps {
  selectedMonth: number;
  selectedYear: number;
  selectedDay: number | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDaySelect: (day: number | null) => void;
  dailyChartData: DailyChartData[];
}

/**
 * Компонент заголовка таблицы плана поставок
 * Включает заголовок и столбчатую диаграмму с селектором месяца/года
 */
export default function DeliveryPlanTableHeader({
  selectedMonth,
  selectedYear,
  selectedDay,
  onMonthChange,
  onYearChange,
  onDaySelect,
  dailyChartData,
}: DeliveryPlanTableHeaderProps) {
  return (
    <div className="px-4 py-3 bg-gray-50">
      {/* Диаграмма с селектором месяца/года */}
      <div className="flex-shrink-0" style={{ width: '800px' }}>
        <DailyChart
          data={dailyChartData}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDay={selectedDay}
          onMonthChange={onMonthChange}
          onYearChange={onYearChange}
          onDaySelect={onDaySelect}
        />
      </div>
    </div>
  );
}
