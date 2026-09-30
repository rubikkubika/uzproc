'use client';

import type { DeliveryDashboardContentProps } from './types/delivery-dashboards.types';
import { useDeliveryDashboardYear } from './hooks/useDeliveryDashboardYear';
import { useDeliveryResponsibleData } from './hooks/useDeliveryResponsibleData';
import { DeliveryDashboardCard } from './ui/DeliveryDashboardCard';
import { DeliveryDashboardYearBar } from './ui/DeliveryDashboardYearBar';
import { DeliveryResponsibleLegend } from './ui/DeliveryResponsibleLegend';
import { DeliveryResponsibleTable } from './ui/DeliveryResponsibleTable';

/**
 * Дэшборд «По ответственным»: ответственный × статусы поставки, просрочки, поставлено за год и % в срок.
 * Данные — та же сводка, что на странице «Поставки» (GET /api/deliveries/responsible-summary).
 * Проблемные строки подсвечиваются и поднимаются наверх.
 */
export function DeliveryResponsibleDashboardContent({ enabled }: DeliveryDashboardContentProps) {
  const { year, setYear, availableYears } = useDeliveryDashboardYear();
  const summary = useDeliveryResponsibleData(year, enabled);

  return (
    <div className="space-y-1 sm:space-y-1.5">
      <DeliveryDashboardYearBar year={year} availableYears={availableYears} onYearChange={setYear} />
      <DeliveryDashboardCard
        title="Поставки по ответственным"
        subtitle={
          summary.data
            ? `Ответственных: ${summary.rows.length}, из них проблемных: ${summary.totals.critical}`
            : undefined
        }
        loading={summary.loading}
        error={summary.error}
        empty={summary.rows.length === 0}
      >
        <DeliveryResponsibleTable
          year={year}
          rows={summary.rows}
          shipmentStatuses={summary.shipmentStatuses}
          totals={summary.totals}
        />
      </DeliveryDashboardCard>
      <DeliveryResponsibleLegend />
    </div>
  );
}
