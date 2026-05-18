'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../types/kpi.types';

interface KpiMonthSelectorProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

export function KpiMonthSelector({ year, month, onPrev, onNext }: KpiMonthSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold text-gray-800 min-w-[200px] text-center">
        Январь – {MONTH_NAMES[month - 1]} {year}
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
