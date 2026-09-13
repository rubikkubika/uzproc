'use client';

import { Check, TriangleAlert, X } from 'lucide-react';
import type { DeliveryRowView } from '../../../types/delivery-view.types';
import { TONE_BADGE } from '../../../constants/delivery-tone.constants';
import { formatDate } from '../../../utils/date.utils';

const ESF = {
  present: { text: 'ЭСФ есть', className: 'text-green-700', Icon: Check },
  missing: { text: 'ЭСФ нет', className: 'text-red-700', Icon: X },
  pending: { text: 'ЭСФ —', className: 'text-slate-400', Icon: null },
} as const;

/**
 * Дорожка «Отгрузка»: статус поставки, наличие ЭСФ и статус ручного отчёта —
 * последний показывается только когда противоречит системе.
 */
export default function DeliveryShipmentCell({ row }: { row: DeliveryRowView }) {
  const esf = ESF[row.esfState];
  return (
    <div className="flex flex-col gap-1 min-w-0">
      {row.shipment ? (
        <span className={`w-fit max-w-full truncate text-[11px] font-semibold px-[7px] py-0.5 rounded whitespace-nowrap ${TONE_BADGE[row.shipment.tone]}`}>
          {row.shipment.label}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      )}
      <span
        className={`inline-flex items-center gap-1 text-[11px] ${esf.className}`}
        title={row.delivery.esfDate ? `ЭСФ: ${formatDate(row.delivery.esfDate)}` : undefined}
      >
        {esf.Icon && <esf.Icon className="w-[11px] h-[11px]" strokeWidth={3} />}
        {esf.text}
      </span>
      {row.reportDiscrepancy && (
        <span
          className="inline-flex items-center gap-1 text-[11px] text-orange-700 whitespace-nowrap min-w-0"
          title="Статус ручного отчёта противоречит состоянию поставки в системе"
        >
          <TriangleAlert className="w-[11px] h-[11px] flex-shrink-0" strokeWidth={2.2} />
          <span className="truncate">Отчёт: {row.reportDiscrepancy}</span>
        </span>
      )}
    </div>
  );
}
