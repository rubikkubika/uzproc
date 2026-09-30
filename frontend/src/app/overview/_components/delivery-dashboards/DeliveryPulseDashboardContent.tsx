'use client';

import { CURRENCY_NOTE, DELIVERY_MONTH_NAMES, ON_TIME_DEFINITION } from './constants/delivery-dashboards.constants';
import type { DeliveryDashboardContentProps } from './types/delivery-dashboards.types';
import { useDeliveryDashboardYear } from './hooks/useDeliveryDashboardYear';
import { useDeliveryPulseData } from './hooks/useDeliveryPulseData';
import { DeliveryBarChart } from './ui/DeliveryBarChart';
import { DeliveryDashboardCard } from './ui/DeliveryDashboardCard';
import { DeliveryDashboardYearBar } from './ui/DeliveryDashboardYearBar';
import { DeliveryPercentLineChart } from './ui/DeliveryPercentLineChart';
import { DeliveryPulseKpiRow } from './ui/DeliveryPulseKpiRow';

/**
 * Дэшборд «Пульс поставок»: KPI за год и помесячные графики —
 * поставлено / просрочено (столбцы) и % поставленных в срок (отдельная линия).
 */
export function DeliveryPulseDashboardContent({ enabled }: DeliveryDashboardContentProps) {
  const { year, setYear, availableYears } = useDeliveryDashboardYear();
  const pulse = useDeliveryPulseData(year, enabled);

  return (
    <div className="space-y-1 sm:space-y-1.5">
      <DeliveryDashboardYearBar year={year} availableYears={availableYears} onYearChange={setYear} note={CURRENCY_NOTE} />
      {pulse.error && <p className="text-xs text-red-600 px-1">{pulse.error}</p>}
      <DeliveryPulseKpiRow year={year} data={pulse.data} loading={pulse.loading} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5 sm:gap-2">
        <DeliveryDashboardCard
          title={`Поставлено и просрочено по месяцам, ${year} г.`}
          subtitle="Поставлено — по месяцу фактической даты; просрочено — не поставлено, по месяцу плановой даты, уже прошедшей"
          loading={pulse.loading}
          error={pulse.error}
        >
          <DeliveryBarChart chart={pulse.monthBars} />
        </DeliveryDashboardCard>
        <DeliveryDashboardCard
          title={`% поставленных в срок по месяцам, ${year} г.`}
          subtitle={ON_TIME_DEFINITION}
          loading={pulse.loading}
          error={pulse.error}
        >
          <DeliveryPercentLineChart
            labels={DELIVERY_MONTH_NAMES}
            values={pulse.onTimeLine}
            tooltipLabel={pulse.onTimeTooltip}
            heightClass="h-[200px]"
          />
        </DeliveryDashboardCard>
      </div>
    </div>
  );
}
