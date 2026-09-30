'use client';

import type { DeliveryDisciplineData } from '../types/delivery-dashboards.types';
import { formatDays, formatPercent, percentOf } from '../utils/delivery-dashboards.utils';
import { DeliveryKpiCard } from './DeliveryKpiCard';

export interface DeliveryDisciplineSummaryProps {
  year: number;
  data: DeliveryDisciplineData | null;
  loading: boolean;
}

/** Итоговые плитки «Дисциплины сроков»: доля опозданий, средняя задержка, поставки без срока. */
export function DeliveryDisciplineSummary({ year, data, loading }: DeliveryDisciplineSummaryProps) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      <DeliveryKpiCard
        label="Опоздали"
        hint={data ? `${data.lateCount} из ${data.measurableCount} поставленных в ${year} г.` : `${year} г.`}
        value={formatPercent(data ? percentOf(data.lateCount, data.measurableCount) : null)}
        tone={(data?.lateCount ?? 0) > 0 ? 'bad' : 'neutral'}
        loading={loading}
      />
      <DeliveryKpiCard
        label="Средняя задержка"
        hint="по опоздавшим, календарные дни"
        value={formatDays(data?.averageDelayDays)}
        loading={loading}
      />
      <DeliveryKpiCard
        label="Без срока"
        hint="поставлено без дедлайна и плановой даты — не учтены"
        value={data?.unmeasurableCount ?? 0}
        loading={loading}
      />
    </div>
  );
}
