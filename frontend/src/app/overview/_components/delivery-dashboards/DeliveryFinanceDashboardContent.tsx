'use client';

import { CURRENCY_NOTE } from './constants/delivery-dashboards.constants';
import type { DeliveryDashboardContentProps } from './types/delivery-dashboards.types';
import { useDeliveryDashboardYear } from './hooks/useDeliveryDashboardYear';
import { useDeliveryFinanceData } from './hooks/useDeliveryFinanceData';
import { DeliveryBarChart } from './ui/DeliveryBarChart';
import { DeliveryBreakdownDonut } from './ui/DeliveryBreakdownDonut';
import { DeliveryDashboardCard } from './ui/DeliveryDashboardCard';
import { DeliveryDashboardYearBar } from './ui/DeliveryDashboardYearBar';
import { DeliveryFinanceSummary } from './ui/DeliveryFinanceSummary';

/**
 * Дэшборд «Деньги и документы»: поставки года по статусу и схеме оплаты (кольца по количеству,
 * суммы по валютам в легенде), поставленные без ЭСФ по месяцам и нераспределённые оплаты.
 * Поставка относится к году по фактической дате поставки, для непоставленных — по плановой.
 */
export function DeliveryFinanceDashboardContent({ enabled }: DeliveryDashboardContentProps) {
  const { year, setYear, availableYears } = useDeliveryDashboardYear();
  const finance = useDeliveryFinanceData(year, enabled);
  const total = finance.data?.totalCount ?? 0;

  return (
    <div className="space-y-1 sm:space-y-1.5">
      <DeliveryDashboardYearBar year={year} availableYears={availableYears} onYearChange={setYear} note={CURRENCY_NOTE} />
      <DeliveryFinanceSummary year={year} data={finance.data} loading={finance.loading} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5 sm:gap-2">
        <DeliveryDashboardCard
          title={`По статусу оплаты, ${year} г.`}
          subtitle="Количество поставок; суммы — по валютам"
          loading={finance.loading}
          error={finance.error}
          empty={total === 0}
        >
          <DeliveryBreakdownDonut segments={finance.statusSegments} total={total} centerLabel="поставок" />
        </DeliveryDashboardCard>
        <DeliveryDashboardCard
          title={`По схеме оплаты, ${year} г.`}
          subtitle="Схема из справочника, без неё — тип (предоплата / постоплата)"
          loading={finance.loading}
          error={finance.error}
          empty={total === 0}
        >
          <DeliveryBreakdownDonut segments={finance.schemeSegments} total={total} centerLabel="поставок" />
        </DeliveryDashboardCard>
      </div>
      <DeliveryDashboardCard
        title={`Поставлено с ЭСФ и без ЭСФ по месяцам, ${year} г.`}
        subtitle="Месяц — по фактической дате поставки; «без ЭСФ» — не заполнена дата ЭСФ"
        loading={finance.loading}
        error={finance.error}
      >
        <DeliveryBarChart chart={finance.esfBars} />
      </DeliveryDashboardCard>
    </div>
  );
}
