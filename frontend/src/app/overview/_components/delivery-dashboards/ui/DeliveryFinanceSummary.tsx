'use client';

import type { DeliveryFinanceData } from '../types/delivery-dashboards.types';
import { DeliveryKpiCard } from './DeliveryKpiCard';

export interface DeliveryFinanceSummaryProps {
  year: number;
  data: DeliveryFinanceData | null;
  loading: boolean;
}

/** Плитки «Деньги и документы»: поставок года, без ЭСФ, нераспределённые оплаты. */
export function DeliveryFinanceSummary({ year, data, loading }: DeliveryFinanceSummaryProps) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      <DeliveryKpiCard label="Поставок года" hint={`${year} г., по дате поставки`} value={data?.totalCount ?? 0} loading={loading} />
      <DeliveryKpiCard
        label="Поставлено без ЭСФ"
        hint={`${year} г., нет даты ЭСФ`}
        value={data?.deliveredWithoutEsfCount ?? 0}
        tone={(data?.deliveredWithoutEsfCount ?? 0) > 0 ? 'warn' : 'neutral'}
        loading={loading}
      />
      <DeliveryKpiCard
        label="Нераспределённые оплаты"
        hint={data ? `оплаты без типа (Аванс/По факту) у ${data.deliveriesWithUndistributedCount} поставок` : 'оплаты без типа'}
        value={data?.undistributedPaymentsCount ?? 0}
        tone={(data?.undistributedPaymentsCount ?? 0) > 0 ? 'warn' : 'neutral'}
        loading={loading}
      />
    </div>
  );
}
