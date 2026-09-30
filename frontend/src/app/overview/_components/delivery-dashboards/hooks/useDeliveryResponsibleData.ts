'use client';

import { useMemo } from 'react';
import { DELIVERY_DASHBOARD_ENDPOINTS } from '../constants/delivery-dashboards.constants';
import type { DeliveryResponsibleSummary, DeliveryResponsibleTotals } from '../types/delivery-dashboards.types';
import { buildResponsibleRows } from '../utils/delivery-dashboards.utils';
import { useDeliveryDashboardFetch } from './useDeliveryDashboardFetch';

/**
 * Сводка по ответственным (/api/deliveries/responsible-summary — та же, что на странице поставок)
 * и строки таблицы с % в срок и уровнем проблемности.
 */
export function useDeliveryResponsibleData(year: number, enabled: boolean) {
  const state = useDeliveryDashboardFetch<DeliveryResponsibleSummary>(
    DELIVERY_DASHBOARD_ENDPOINTS.responsible,
    year,
    enabled,
    'Ошибка загрузки сводки по ответственным'
  );

  const rows = useMemo(() => buildResponsibleRows(state.data?.items ?? []), [state.data]);

  const totals = useMemo<DeliveryResponsibleTotals>(() => {
    const t: DeliveryResponsibleTotals = { totalCount: 0, overdueCount: 0, deliveredCount: 0, measurableCount: 0, onTimeCount: 0, critical: 0, byShipmentStatus: {} };
    rows.forEach((r) => {
      t.totalCount += r.totalCount;
      t.overdueCount += r.overdueCount;
      t.deliveredCount += r.deliveredCount;
      t.measurableCount += r.measurableCount ?? 0;
      t.onTimeCount += r.onTimeCount ?? 0;
      if (r.problemLevel === 'critical') t.critical += 1;
      Object.entries(r.countByShipmentStatus).forEach(([status, count]) => {
        t.byShipmentStatus[status] = (t.byShipmentStatus[status] ?? 0) + count;
      });
    });
    return t;
  }, [rows]);

  return { ...state, rows, totals, shipmentStatuses: state.data?.shipmentStatuses ?? [] };
}
