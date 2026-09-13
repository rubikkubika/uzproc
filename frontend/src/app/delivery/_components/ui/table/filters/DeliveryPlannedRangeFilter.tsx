'use client';

import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePlannedRangeFilter } from '../../../hooks/usePlannedRangeFilter';

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const DATE_INPUT = 'w-full h-6 px-1 border border-slate-300 rounded bg-white text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500';

/** Фильтр диапазона плановой даты: кнопка с текущим диапазоном и выпадашка с двумя датами. */
export default function DeliveryPlannedRangeFilter({ from, to, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const range = usePlannedRangeFilter(containerRef, from, to, onChange);
  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); range.toggle(); }}
        className={`w-full h-6 px-1.5 flex items-center justify-between gap-1 border border-slate-300 rounded bg-white text-[11px] ${
          range.active ? 'text-blue-800 font-semibold' : 'text-slate-400'
        }`}
      >
        <span className="truncate">{range.label}</span>
        <ChevronDown className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" strokeWidth={2.5} />
      </button>
      {range.open && (
        <div className="absolute left-0 top-7 z-20 w-56 p-2 bg-white border border-slate-200 rounded-md shadow-lg flex flex-col gap-1.5 font-normal">
          <label className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-5">с</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => range.setFrom(e.target.value)} className={DATE_INPUT} />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-5">по</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => range.setTo(e.target.value)} className={DATE_INPUT} />
          </label>
          <button type="button" onClick={range.clear} className="self-end text-[11px] text-slate-500 hover:text-slate-800">
            Очистить
          </button>
        </div>
      )}
    </div>
  );
}
