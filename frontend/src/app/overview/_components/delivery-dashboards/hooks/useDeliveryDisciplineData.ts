'use client';

import { useMemo } from 'react';
import { DELIVERY_DASHBOARD_ENDPOINTS } from '../constants/delivery-dashboards.constants';
import type { DeliveryDisciplineData } from '../types/delivery-dashboards.types';
import { averageDelayBars, delayBucketBars } from '../utils/delivery-dashboards.charts';
import { useDeliveryDashboardFetch } from './useDeliveryDashboardFetch';

/** Данные дэшборда «Дисциплина сроков» (/api/overview/delivery-dashboard/discipline) и серии графиков. */
export function useDeliveryDisciplineData(year: number, enabled: boolean) {
  const state = useDeliveryDashboardFetch<DeliveryDisciplineData>(
    DELIVERY_DASHBOARD_ENDPOINTS.discipline,
    year,
    enabled,
    'Ошибка загрузки дисциплины сроков'
  );

  const bucketBars = useMemo(() => delayBucketBars(state.data?.buckets ?? []), [state.data]);
  const delayBars = useMemo(() => averageDelayBars(state.data?.months ?? []), [state.data]);
  /** Подсказка к месяцу: сколько опоздало из поставленных с известным сроком. */
  const delayTooltip = useMemo(
    () => (index: number) => {
      const m = state.data?.months.find((x) => x.month === index + 1);
      if (!m || m.measurableCount === 0) return 'Нет поставленных с известным сроком';
      return `Опоздали ${m.lateCount} из ${m.measurableCount}`;
    },
    [state.data]
  );

  return { ...state, bucketBars, delayBars, delayTooltip };
}
