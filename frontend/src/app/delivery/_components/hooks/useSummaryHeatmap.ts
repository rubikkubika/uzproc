'use client';

import { useMemo } from 'react';
import type { DeliveryResponsibleSummary } from '../types/delivery-summary.types';
import { summaryGridTemplate } from '../utils/summary.utils';

/** Максимумы по колонкам (для насыщенности заливки), итоги и шаблон сетки сводки по ответственным. */
export function useSummaryHeatmap(summary: DeliveryResponsibleSummary) {
  const { shipmentStatuses, paymentStatuses, items } = summary;

  return useMemo(() => {
    const maxOf = (values: number[]) => Math.max(0, ...values);
    const sumOf = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const byStatus = (statuses: string[], pick: (status: string) => number[], reduce: (v: number[]) => number) => (
      Object.fromEntries(statuses.map((s) => [s, reduce(pick(s))])) as Record<string, number>
    );
    const shipmentValues = (s: string) => items.map((i) => i.countByShipmentStatus?.[s] ?? 0);
    const paymentValues = (s: string) => items.map((i) => i.countByPaymentStatus?.[s] ?? 0);

    const totals = {
      byShipmentStatus: byStatus(shipmentStatuses, shipmentValues, sumOf),
      byPaymentStatus: byStatus(paymentStatuses, paymentValues, sumOf),
      total: sumOf(items.map((i) => i.totalCount)),
      overdue: sumOf(items.map((i) => i.overdueCount)),
      delivered: sumOf(items.map((i) => i.deliveredCount)),
    };

    return {
      columnMax: {
        shipment: byStatus(shipmentStatuses, shipmentValues, maxOf),
        payment: byStatus(paymentStatuses, paymentValues, maxOf),
        total: maxOf(items.map((i) => i.totalCount)),
        overdue: maxOf(items.map((i) => i.overdueCount)),
        delivered: maxOf(items.map((i) => i.deliveredCount)),
      },
      totals,
      gridTemplate: summaryGridTemplate(shipmentStatuses.length, paymentStatuses.length),
      responsibleCount: items.length,
    };
  }, [shipmentStatuses, paymentStatuses, items]);
}

export type SummaryHeatmap = ReturnType<typeof useSummaryHeatmap>;
