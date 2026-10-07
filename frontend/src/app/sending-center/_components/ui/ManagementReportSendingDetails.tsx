import type { ManagementReportSendingInfo } from '@/utils/sending-center.api';
import { MANAGEMENT_REPORT_SCHEDULE_DISABLED_NOTE } from '../constants/management-report-sending.constants';
import { formatIsoDate } from '../utils/delivery-sending.utils';
import { formatSendDateTime } from '../utils/management-report-sending.utils';

interface ManagementReportSendingDetailsProps {
  info: ManagementReportSendingInfo;
}

/** Параметры рассылки управленческой отчётности: период, получатели, расписание. */
export default function ManagementReportSendingDetails({ info }: ManagementReportSendingDetailsProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Отчётный период', value: info.periodLabel },
    { label: 'Тема письма', value: info.subject },
    { label: 'Получатель', value: `${info.recipientFullName} (${info.recipient})` },
    { label: 'Копия', value: info.cc.length > 0 ? info.cc.join(', ') : '—' },
    {
      label: 'Расписание',
      value: `${info.workingDayNumber}-й рабочий день месяца, ${info.sendTime} (Ташкент) — за прошлый месяц`,
    },
    { label: 'Ближайшая отправка', value: formatIsoDate(info.nextSendDate) },
    {
      label: `Автоотправка за ${info.periodLabel}`,
      value: info.autoSentAt
        ? `${formatSendDateTime(info.autoSentAt)}${info.autoSendSummary?.startsWith('FAILED') ? ' — не удалась' : ''}`
        : 'ещё не выполнялась',
    },
  ];

  return (
    <div className="space-y-2">
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[220px_1fr]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-gray-500">{row.label}</dt>
            <dd className="text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>
      {!info.scheduleEnabled && (
        <p className="text-xs text-amber-700">{MANAGEMENT_REPORT_SCHEDULE_DISABLED_NOTE}</p>
      )}
    </div>
  );
}
