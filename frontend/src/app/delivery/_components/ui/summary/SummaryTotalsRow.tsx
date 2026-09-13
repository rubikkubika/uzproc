'use client';

import type { SummaryHeatmap } from '../../hooks/useSummaryHeatmap';

interface Props {
  shipmentStatuses: string[];
  paymentStatuses: string[];
  heatmap: SummaryHeatmap;
}

const Value = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`h-[30px] m-px flex items-center justify-center tabular-nums ${className}`}>
    {value > 0 ? value : <span className="text-slate-300">—</span>}
  </div>
);

/** Строка «Итого» сводки: без заливки и без кликов. */
export default function SummaryTotalsRow({ shipmentStatuses, paymentStatuses, heatmap }: Props) {
  const { totals } = heatmap;
  return (
    <div className="grid bg-slate-50 font-semibold text-slate-900" style={{ gridTemplateColumns: heatmap.gridTemplate }}>
      <div className="h-[30px] px-3 flex items-center">Итого</div>
      {shipmentStatuses.map((s) => <Value key={`ship-${s}`} value={totals.byShipmentStatus[s]} />)}
      <div />
      {paymentStatuses.map((s) => <Value key={`pay-${s}`} value={totals.byPaymentStatus[s]} />)}
      <div />
      <Value value={totals.total} />
      <Value value={totals.overdue} className="text-orange-700" />
      <Value value={totals.delivered} className="text-green-700" />
    </div>
  );
}
