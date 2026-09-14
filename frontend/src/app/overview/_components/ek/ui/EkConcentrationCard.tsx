'use client';

import type { EkConcentrationSegment } from '../types/ek.types';
import { formatAmountFull, formatAmountShort, formatPercent } from '../utils/ek-format.utils';

interface EkConcentrationCardProps {
  segments: EkConcentrationSegment[];
  /** Знак валюты для полных сумм */
  currency: string | null;
}

/** Где сосредоточена сумма ЕК: топ ЦФО и «Остальные» стековым баром и легендой */
export function EkConcentrationCard({ segments, currency }: EkConcentrationCardProps) {
  return (
    <div data-tour="ek-concentration" className="bg-white rounded-xl shadow-sm py-3.5 px-4">
      <h3 className="text-[13px] font-semibold text-gray-900">Где сосредоточена сумма ЕК</h3>
      <div className="text-[11px] text-gray-500 mt-0.5">Доля ЦФО в общей сумме ЕК</div>
      {segments.length === 0 ? (
        <div className="text-xs text-gray-400 mt-2.5">Нет закупок у единственного источника</div>
      ) : (
        <>
          <div className="flex h-2.5 rounded-[5px] overflow-hidden gap-0.5 mt-2.5">
            {segments.map((s) => (
              <div
                key={s.name}
                title={`${s.name}: ${formatAmountFull(s.amount, currency)}`}
                style={{ width: `${s.share}%`, backgroundColor: s.color }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5 mt-2.5">
            {segments.map((s) => (
              <div key={s.name} className="grid grid-cols-[10px_minmax(0,1fr)_auto_auto] gap-2 items-center text-xs">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-gray-700 truncate" title={s.name}>
                  {s.name}
                </span>
                <span className="text-gray-500 tabular-nums" title={formatAmountFull(s.amount, currency)}>
                  {formatAmountShort(s.amount)}
                </span>
                <span className="font-semibold tabular-nums min-w-[44px] text-right text-gray-900">
                  {formatPercent(s.share)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
