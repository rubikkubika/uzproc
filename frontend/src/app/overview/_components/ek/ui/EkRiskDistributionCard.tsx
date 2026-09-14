'use client';

import { EK_RISK_STYLES } from '../constants/ek.constants';
import type { EkRiskDistributionItem } from '../types/ek.types';

interface EkRiskDistributionCardProps {
  items: EkRiskDistributionItem[];
}

/** Сколько ЦФО на каждом уровне риска доли ЕК */
export function EkRiskDistributionCard({ items }: EkRiskDistributionCardProps) {
  return (
    <div data-tour="ek-risk" className="bg-white rounded-xl shadow-sm py-3.5 px-4">
      <h3 className="text-[13px] font-semibold text-gray-900">ЦФО по уровню риска</h3>
      <div className="flex flex-col gap-2 mt-2.5">
        {items.map((item) => {
          const style = EK_RISK_STYLES[item.level];
          return (
            <div key={item.level} className="grid grid-cols-[12px_1fr_auto] gap-2 items-center text-xs">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: style.bar }} />
              <span className="text-gray-700">
                {style.label} <span className="text-gray-400">{item.range}</span>
              </span>
              <span className="font-semibold tabular-nums text-gray-900">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
