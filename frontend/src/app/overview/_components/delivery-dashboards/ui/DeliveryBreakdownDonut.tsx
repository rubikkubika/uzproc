'use client';

import { DonutChartSvg } from '../../ui/DonutChartSvg';
import type { DeliveryDonutSegment } from '../types/delivery-dashboards.types';
import { formatAmountsInline } from '../utils/delivery-dashboards.utils';

export interface DeliveryBreakdownDonutProps {
  segments: DeliveryDonutSegment[];
  total: number;
  centerLabel: string;
}

/** Кольцо по количеству поставок и легенда: количество и суммы сегмента по валютам. */
export function DeliveryBreakdownDonut({ segments, total, centerLabel }: DeliveryBreakdownDonutProps) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <DonutChartSvg
        segments={segments.map((s) => ({ value: s.count, color: s.color, label: s.label }))}
        centerValue={total}
        centerLabel={centerLabel}
      />
      <ul className="flex-1 min-w-[200px] space-y-1">
        {segments.map((s) => (
          <li key={s.key} className="flex items-start gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: s.color }} />
            <div className="min-w-0">
              <p className="text-xs text-gray-900 leading-tight">
                {s.label}: <span className="font-semibold tabular-nums">{s.count}</span>
              </p>
              <p className="text-[10px] text-gray-500 tabular-nums leading-tight">{formatAmountsInline(s.amounts)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
