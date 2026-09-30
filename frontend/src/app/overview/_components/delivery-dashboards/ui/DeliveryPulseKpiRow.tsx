'use client';

import { EXPECTED_WINDOW_DAYS } from '../constants/delivery-dashboards.constants';
import type { DeliveryPulseData } from '../types/delivery-dashboards.types';
import { formatPercent } from '../utils/delivery-dashboards.utils';
import { DeliveryKpiCard } from './DeliveryKpiCard';

export interface DeliveryPulseKpiRowProps {
  year: number;
  data: DeliveryPulseData | null;
  loading: boolean;
}

/** Ряд KPI «Пульса поставок». */
export function DeliveryPulseKpiRow({ year, data, loading }: DeliveryPulseKpiRowProps) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      <DeliveryKpiCard
        label="Поставлено"
        hint={`${year} г., по фактической дате`}
        value={data?.deliveredCount ?? 0}
        amounts={data?.deliveredAmounts}
        tone="good"
        loading={loading}
      />
      <DeliveryKpiCard
        label="В срок"
        hint={data ? `${data.onTimeCount} из ${data.measurableCount} с известным сроком` : `${year} г.`}
        value={formatPercent(data?.onTimePercentage)}
        loading={loading}
      />
      <DeliveryKpiCard
        label="Просрочено"
        hint="на сегодня, все годы"
        value={data?.overdueCount ?? 0}
        amounts={data?.overdueAmounts}
        tone={(data?.overdueCount ?? 0) > 0 ? 'bad' : 'neutral'}
        loading={loading}
      />
      <DeliveryKpiCard
        label="Без ЭСФ"
        hint={`поставлено в ${year} г. без даты ЭСФ`}
        value={data?.deliveredWithoutEsfCount ?? 0}
        tone={(data?.deliveredWithoutEsfCount ?? 0) > 0 ? 'warn' : 'neutral'}
        loading={loading}
      />
      <DeliveryKpiCard
        label={`Ожидается за ${EXPECTED_WINDOW_DAYS} дней`}
        hint={`плановая дата: сегодня … +${EXPECTED_WINDOW_DAYS} дн.`}
        value={data?.expectedNext7Count ?? 0}
        amounts={data?.expectedNext7Amounts}
        loading={loading}
      />
      <DeliveryKpiCard
        label="Закрыто"
        hint={`«Поставлено» + «Оплачено», ${year} г.`}
        value={data?.closedCount ?? 0}
        loading={loading}
      />
    </div>
  );
}
