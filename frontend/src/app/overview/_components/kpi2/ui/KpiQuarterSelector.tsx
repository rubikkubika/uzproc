'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../../kpi/types/kpi.types';

interface KpiQuarterSelectorProps {
  year: number;
  quarter: number;
  onPrev: () => void;
  onNext: () => void;
}

export function KpiQuarterSelector({ year, quarter, onPrev, onNext }: KpiQuarterSelectorProps) {
  const startMonth = (quarter - 1) * 3;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold text-gray-800 min-w-[240px] text-center">
        {quarter} квартал {year} ({MONTH_NAMES[startMonth]} – {MONTH_NAMES[startMonth + 2]})
      </span>
      <button
        onClick={onNext}
        className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
