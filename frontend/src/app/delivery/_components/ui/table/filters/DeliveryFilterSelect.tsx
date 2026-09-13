'use client';

import { ChevronDown } from 'lucide-react';
import type { FilterOption } from '../../../types/delivery-columns.types';

interface Props {
  placeholder: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  wide?: boolean;
}

/** Выпадающий фильтр в шапке колонки: без выбора показывает название фильтра, выбранное значение — синим. */
export default function DeliveryFilterSelect({ placeholder, value, options, onChange, wide = false }: Props) {
  const active = value !== '';
  return (
    <div className={`relative min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        title={active ? options.find((o) => o.value === value)?.label : placeholder}
        className={`appearance-none w-full h-6 pl-1.5 pr-4 border border-slate-300 rounded bg-white text-[11px] truncate focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          active ? 'text-blue-800 font-semibold' : 'text-slate-400'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-slate-900 font-normal">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500" strokeWidth={2.5} />
    </div>
  );
}
