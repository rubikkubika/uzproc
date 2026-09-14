'use client';

import type { ReactNode } from 'react';

import { EK_BAR_TRACK_COLOR, EK_RISK_STYLES } from '../constants/ek.constants';
import type { EkTotals } from '../types/ek.types';
import { formatAmountFull, formatAmountShort, formatCount, formatPercent } from '../utils/ek-format.utils';

interface EkShareCardProps {
  totals: EkTotals;
  /** Знак валюты для полных сумм */
  currency: string | null;
}

/** Главный KPI: общая доля ЕК по сумме, суммы и количество заявок */
export function EkShareCard({ totals, currency }: EkShareCardProps) {
  const risk = EK_RISK_STYLES[totals.risk];
  return (
    <div data-tour="ek-share" className="bg-white rounded-xl shadow-sm py-3.5 px-4">
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Доля ЕК по сумме</span>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: risk.bg, color: risk.text }}
        >
          {risk.label}
        </span>
      </div>
      <div className="text-[32px] font-semibold tracking-tight mt-0.5 tabular-nums" style={{ color: risk.text }}>
        {formatPercent(totals.percentByAmount)}
      </div>
      <div className="h-2 rounded mt-2 overflow-hidden" style={{ backgroundColor: EK_BAR_TRACK_COLOR }}>
        <div className="h-full" style={{ width: `${Math.min(100, totals.percentByAmount)}%`, backgroundColor: risk.bar }} />
      </div>
      <div className="grid grid-cols-2 gap-y-2.5 gap-x-3.5 mt-3.5 text-xs">
        <Metric label="Сумма ЕК" title={formatAmountFull(totals.singleSupplierAmount, currency)}>
          {formatAmountShort(totals.singleSupplierAmount)}
        </Metric>
        <Metric label="Сумма заявок" title={formatAmountFull(totals.totalAmount, currency)}>
          {formatAmountShort(totals.totalAmount)}
        </Metric>
        <Metric label="Заявок ЕК">
          {formatCount(totals.singleSupplierCount)}{' '}
          <span className="text-xs font-normal text-gray-500">из {formatCount(totals.totalCount)}</span>
        </Metric>
        <Metric label="По количеству">{formatPercent(totals.percentByCount)}</Metric>
      </div>
    </div>
  );
}

function Metric({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div title={title} className="text-[15px] font-semibold text-gray-900 mt-0.5 tabular-nums">
        {children}
      </div>
    </div>
  );
}
