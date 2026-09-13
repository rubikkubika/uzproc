'use client';

import type { RowSignal } from '../../../types/delivery-view.types';
import { TONE_BADGE, TONE_DOT } from '../../../constants/delivery-tone.constants';

/** № поставки и ярлык сигнала «что делать» под ним. */
export default function DeliverySignalCell({ innerId, signal }: { innerId: string | null; signal: RowSignal | null }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="font-semibold tabular-nums text-slate-900 truncate" title={innerId ?? undefined}>{innerId ?? '—'}</span>
      {signal && (
        <span className={`inline-flex items-center gap-1 w-fit max-w-full text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${TONE_BADGE[signal.tone]}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TONE_DOT[signal.tone]}`} />
          <span className="truncate">{signal.label}</span>
        </span>
      )}
    </div>
  );
}
