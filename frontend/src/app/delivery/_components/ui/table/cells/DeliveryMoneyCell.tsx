'use client';

import type { DeliveryRowView } from '../../../types/delivery-view.types';
import { TONE_BADGE, TONE_TEXT } from '../../../constants/delivery-tone.constants';

/** Дорожка «Деньги»: схема оплаты, распределение платежей и итоговый статус оплаты — сверху вниз. */
export default function DeliveryMoneyCell({ row }: { row: DeliveryRowView }) {
  return (
    <div className="flex flex-col gap-[3px] text-[11px] min-w-0">
      <span className={`truncate ${row.schemeMissing ? 'text-slate-400' : 'text-slate-900'}`} title={row.schemeLabel}>
        {row.schemeLabel}
      </span>
      <span className={`whitespace-nowrap ${TONE_TEXT[row.payments.tone]} ${row.payments.tone === 'orange' ? 'font-semibold' : ''}`}>
        {row.payments.label}
      </span>
      {row.paymentStatus ? (
        <span className={`w-fit max-w-full truncate font-semibold px-1.5 py-px rounded whitespace-nowrap ${TONE_BADGE[row.paymentStatus.tone]}`}>
          {row.paymentStatus.label}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      )}
    </div>
  );
}
