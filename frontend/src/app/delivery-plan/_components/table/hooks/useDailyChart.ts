import { useMemo } from 'react';
import { calculateDailyDistribution } from '../utils/delivery-plan-table.utils';
import type { DeliveryPlanItem, DailyChartData } from '../types/delivery-plan-table.types';

/**
 * Хук для расчета данных диаграммы по дням месяца
 */
export function useDailyChart(
  items: DeliveryPlanItem[],
  selectedMonth: number,
  selectedYear: number
): DailyChartData[] {
  const dailyData = useMemo(() => {
    return calculateDailyDistribution(items, selectedMonth, selectedYear);
  }, [items, selectedMonth, selectedYear]);

  return dailyData;
}
