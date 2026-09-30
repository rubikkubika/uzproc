'use client';

import { useMemo } from 'react';
import { DELIVERY_DASHBOARD_ENDPOINTS } from '../constants/delivery-dashboards.constants';
import type { DeliveryPulseData } from '../types/delivery-dashboards.types';
import { pulseMonthBars, pulseOnTimeLine } from '../utils/delivery-dashboards.charts';
import { useDeliveryDashboardFetch } from './useDeliveryDashboardFetch';

/** Данные дэшборда «Пульс поставок» (/api/overview/delivery-dashboard/pulse) и серии графиков. */
export function useDeliveryPulseData(year: number, enabled: boolean) {
  const state = useDeliveryDashboardFetch<DeliveryPulseData>(
    DELIVERY_DASHBOARD_ENDPOINTS.pulse,
    year,
    enabled,
    'Ошибка загрузки пульса поставок'
  );

  const months = useMemo(() => state.data?.months ?? [], [state.data]);
  const monthBars = useMemo(() => pulseMonthBars(months), [months]);
  const onTimeLine = useMemo(() => pulseOnTimeLine(months), [months]);
  /** Подсказка к точке линии: «N из M в срок». */
  const onTimeTooltip = useMemo(
    () => (index: number) => {
      const m = months.find((x) => x.month === index + 1);
      if (!m || m.measurableCount === 0) return 'Нет поставок с известным сроком';
      return `${Math.round(m.onTimePercentage ?? 0)}% — ${m.onTimeCount} из ${m.measurableCount} в срок`;
    },
    [months]
  );

  return { ...state, monthBars, onTimeLine, onTimeTooltip };
}
