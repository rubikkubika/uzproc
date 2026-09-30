'use client';

import { ON_TIME_DEFINITION } from './constants/delivery-dashboards.constants';
import type { DeliveryDashboardContentProps } from './types/delivery-dashboards.types';
import { useDeliveryDashboardYear } from './hooks/useDeliveryDashboardYear';
import { useDeliveryDisciplineData } from './hooks/useDeliveryDisciplineData';
import { formatDays } from './utils/delivery-dashboards.utils';
import { DeliveryBarChart } from './ui/DeliveryBarChart';
import { DeliveryDashboardCard } from './ui/DeliveryDashboardCard';
import { DeliveryDashboardYearBar } from './ui/DeliveryDashboardYearBar';
import { DeliveryDisciplineSummary } from './ui/DeliveryDisciplineSummary';
import { DeliveryTopSuppliersTable } from './ui/DeliveryTopSuppliersTable';

/**
 * Дэшборд «Дисциплина сроков»: гистограмма задержек (в срок / 1–7 / 8–30 / более 30 дней),
 * средняя задержка по месяцам и топ-10 поставщиков по просрочкам.
 */
export function DeliveryDisciplineDashboardContent({ enabled }: DeliveryDashboardContentProps) {
  const { year, setYear, availableYears } = useDeliveryDashboardYear();
  const discipline = useDeliveryDisciplineData(year, enabled);

  return (
    <div className="space-y-1 sm:space-y-1.5">
      <DeliveryDashboardYearBar year={year} availableYears={availableYears} onYearChange={setYear} note={ON_TIME_DEFINITION} />
      <DeliveryDisciplineSummary year={year} data={discipline.data} loading={discipline.loading} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5 sm:gap-2">
        <DeliveryDashboardCard
          title={`Распределение задержек, ${year} г.`}
          subtitle="Поставлено — фактическая дата минус срок; не поставлено — сегодня минус плановая дата (плановая дата в выбранном году)"
          loading={discipline.loading}
          error={discipline.error}
        >
          <DeliveryBarChart chart={discipline.bucketBars} showValues />
        </DeliveryDashboardCard>
        <DeliveryDashboardCard
          title={`Средняя задержка по месяцам поставки, ${year} г.`}
          subtitle="Среди поставленных с опозданием; месяц — по фактической дате поставки"
          loading={discipline.loading}
          error={discipline.error}
        >
          <DeliveryBarChart chart={discipline.delayBars} formatValue={formatDays} tooltipFooter={discipline.delayTooltip} />
        </DeliveryDashboardCard>
      </div>
      <DeliveryDashboardCard
        title="Топ-10 поставщиков по просрочкам"
        subtitle={`Поставлено в ${year} г. с опозданием + не поставлено с прошедшей плановой датой в ${year} г.`}
        loading={discipline.loading}
        error={discipline.error}
        empty={(discipline.data?.topSuppliers.length ?? 0) === 0}
      >
        <DeliveryTopSuppliersTable rows={discipline.data?.topSuppliers ?? []} />
      </DeliveryDashboardCard>
    </div>
  );
}
