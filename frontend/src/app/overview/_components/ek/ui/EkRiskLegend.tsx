'use client';

import { EK_RISK_STYLES } from '../constants/ek.constants';
import type { EkRiskThresholds } from '../types/ek.types';

interface EkRiskLegendProps {
  thresholds: EkRiskThresholds;
}

/** Легенда цветов доли ЕК: < lowMax / lowMax–highMin / ≥ highMin */
export function EkRiskLegend({ thresholds }: EkRiskLegendProps) {
  const items = [
    { color: EK_RISK_STYLES.low.bar, label: `< ${thresholds.lowMax} %` },
    { color: EK_RISK_STYLES.mid.bar, label: `${thresholds.lowMax}–${thresholds.highMin} %` },
    { color: EK_RISK_STYLES.high.bar, label: `≥ ${thresholds.highMin} %` },
  ];
  return (
    <div className="flex gap-2.5 text-[11px] text-gray-500">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
