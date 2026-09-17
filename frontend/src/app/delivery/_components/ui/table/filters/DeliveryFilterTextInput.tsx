'use client';

import { Search } from 'lucide-react';
import type { DeliveryFiltersHook } from '../../../hooks/useDeliveryFilters';

interface Props {
  field: string;
  placeholder: string;
  /** Узкая колонка: без иконки поиска, плотные отступы */
  compact?: boolean;
  filters: DeliveryFiltersHook;
}

/**
 * Текстовый фильтр в шапке колонки. Значение — localFilters (мгновенно), запрос — после debounce;
 * data-filter-field и onFocus нужны для восстановления фокуса и курсора после перезагрузки данных.
 */
export default function DeliveryFilterTextInput({ field, placeholder, compact = false, filters }: Props) {
  return (
    <label
      title={compact ? 'Фильтр по тексту комментария' : undefined}
      className={`flex items-center gap-1 h-6 ${compact ? 'px-1' : 'px-1.5'} border border-slate-300 rounded bg-white min-w-0 focus-within:ring-1 focus-within:ring-blue-500`}
    >
      {!compact && <Search className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />}
      <input
        type="text"
        data-filter-field={field}
        value={filters.localFilters[field] ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const newValue = e.target.value;
          const cursorPos = e.target.selectionStart ?? 0;
          filters.handleFilterChange(field, newValue);
          requestAnimationFrame(() => {
            const input = e.target as HTMLInputElement;
            if (input && document.activeElement === input) {
              const pos = Math.min(cursorPos, newValue.length);
              input.setSelectionRange(pos, pos);
            }
          });
        }}
        onFocus={(e) => { e.stopPropagation(); filters.setFocusedField(field); }}
        onBlur={(e) => {
          setTimeout(() => {
            const active = document.activeElement as HTMLElement;
            if (active && active !== e.target && !active.closest('input[data-filter-field]') && !active.closest('select')) {
              filters.setFocusedField(null);
            }
          }, 200);
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 min-w-0 bg-transparent text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </label>
  );
}
