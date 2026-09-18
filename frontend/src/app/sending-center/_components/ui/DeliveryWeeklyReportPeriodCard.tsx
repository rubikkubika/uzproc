import type { DeliveryWeeklyReportPeriod } from '@/utils/sending-center.api';
import { formatAmount, formatPeriod } from '../utils/delivery-sending.utils';

interface DeliveryWeeklyReportPeriodCardProps {
  title: string;
  period: DeliveryWeeklyReportPeriod;
}

/** Сводка одного блока письма: поставлено, просрочено и без даты ЭСФ за период. */
export default function DeliveryWeeklyReportPeriodCard({
  title,
  period,
}: DeliveryWeeklyReportPeriodCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">{formatPeriod(period.from, period.to)}</span>
      </div>

      <dl className="space-y-1.5 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-gray-500">Поставлено</dt>
          <dd className="text-gray-900">
            <strong>{period.deliveredCount}</strong> на {formatAmount(period.deliveredAmount)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-gray-500">Просрочено (нет факта)</dt>
          <dd className="text-gray-900">
            <strong>{period.overdueCount}</strong> на {formatAmount(period.overdueAmount)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-gray-500">Без даты ЭСФ</dt>
          <dd className="text-gray-900">
            <strong>{period.missingEsfCount}</strong> на {formatAmount(period.missingEsfAmount)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
