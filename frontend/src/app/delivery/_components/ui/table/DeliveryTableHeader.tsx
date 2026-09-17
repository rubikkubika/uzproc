'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { HeaderColumn, HeaderFilter } from '../../types/delivery-columns.types';
import type { SortDirection, SortField } from '../../types/delivery.types';
import type { DeliveryFiltersHook } from '../../hooks/useDeliveryFilters';
import { DELIVERY_GRID_CLASS } from '../../constants/delivery.constants';
import DeliveryFilterTextInput from './filters/DeliveryFilterTextInput';
import DeliveryFilterSelect from './filters/DeliveryFilterSelect';
import DeliveryPlannedRangeFilter from './filters/DeliveryPlannedRangeFilter';

interface Props {
  columns: HeaderColumn[];
  filters: DeliveryFiltersHook;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function renderFilter(filter: HeaderFilter, filters: DeliveryFiltersHook) {
  switch (filter.kind) {
    case 'text':
      return (
        <DeliveryFilterTextInput
          key={filter.field}
          field={filter.field}
          placeholder={filter.placeholder}
          compact={filter.compact}
          filters={filters}
        />
      );
    case 'select':
      return (
        <DeliveryFilterSelect
          key={filter.key}
          placeholder={filter.placeholder}
          value={filter.value}
          options={filter.options}
          onChange={filter.onChange}
          wide={filter.wide}
        />
      );
    case 'range':
      return <DeliveryPlannedRangeFilter key="range" from={filter.from} to={filter.to} onChange={filter.onChange} />;
  }
}

/** Шапка таблицы: название колонки со стрелкой сортировки и фильтры под ним. Прилипает к верху при прокрутке. */
export default function DeliveryTableHeader({ columns, filters, sortField, sortDirection, onSort }: Props) {
  return (
    <div data-tour="table-head" className={`${DELIVERY_GRID_CLASS} sticky top-0 z-10 px-5 bg-slate-50 border-b border-slate-300 text-[11px] text-slate-600`}>
      {columns.map((col) => {
        const sorted = col.sortField !== null && sortField === col.sortField;
        const SortIcon = sorted ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
        return (
          <div key={col.key} data-tour={`col-${col.key}`} className="py-2 pr-2 mr-2 border-r border-slate-100 last:border-r-0 last:mr-0 flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-1 font-semibold text-slate-700 whitespace-nowrap">
              {col.sortField !== null && (
                <button type="button" onClick={() => onSort(col.sortField)} title="Сортировка" className="flex-shrink-0">
                  <SortIcon className={`w-[11px] h-[11px] ${sorted ? 'text-blue-600' : 'text-slate-400'}`} />
                </button>
              )}
              {col.icon ? (
                <span title={col.label} aria-label={col.label} className="inline-flex">
                  <col.icon className="w-3.5 h-3.5 text-slate-500" />
                </span>
              ) : (
                col.label
              )}
              {col.sub && <span className="font-normal text-slate-400">{col.sub}</span>}
            </div>
            <div className={`grid gap-1 ${col.filterGridClass}`}>
              {col.filters.map((filter) => renderFilter(filter, filters))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
