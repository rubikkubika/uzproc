'use client';

import { useMemo } from 'react';
import {
  DELIVERY_DASHBOARD_ENDPOINTS,
  PAYMENT_SCHEME_COLORS,
  PAYMENT_STATUS_COLORS,
} from '../constants/delivery-dashboards.constants';
import type { DeliveryFinanceData } from '../types/delivery-dashboards.types';
import { toDonutSegments } from '../utils/delivery-dashboards.utils';
import { esfMonthBars } from '../utils/delivery-dashboards.charts';
import { useDeliveryDashboardFetch } from './useDeliveryDashboardFetch';

/** Данные дэшборда «Деньги и документы» (/api/overview/delivery-dashboard/finance) и сегменты колец. */
export function useDeliveryFinanceData(year: number, enabled: boolean) {
  const state = useDeliveryDashboardFetch<DeliveryFinanceData>(
    DELIVERY_DASHBOARD_ENDPOINTS.finance,
    year,
    enabled,
    'Ошибка загрузки данных по оплатам и документам'
  );

  const statusSegments = useMemo(
    () => toDonutSegments(state.data?.byPaymentStatus ?? [], PAYMENT_STATUS_COLORS),
    [state.data]
  );
  const schemeSegments = useMemo(
    () => toDonutSegments(state.data?.byPaymentScheme ?? [], undefined, PAYMENT_SCHEME_COLORS),
    [state.data]
  );

  const esfBars = useMemo(() => esfMonthBars(state.data?.esfByMonth ?? []), [state.data]);

  return { ...state, statusSegments, schemeSegments, esfBars };
}
