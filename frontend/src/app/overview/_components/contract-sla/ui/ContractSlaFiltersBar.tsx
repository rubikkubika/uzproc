'use client';

import { ContractSlaOrganizationFilter } from '../filters/ContractSlaOrganizationFilter';

export interface ContractSlaFiltersBarProps {
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  /** Выбранные организации заказчика (имена enum CustomerOrganization). */
  organizations: Set<string>;
  onOrganizationToggle: (value: string) => void;
  onOrganizationsSelectAll: () => void;
  onOrganizationsDeselectAll: () => void;
  preparedBy: string | null;
  /** «без 1P»: исключены документы ЦФО «M - Commerce 1Р». */
  exclude1p: boolean;
  onExclude1pChange: (value: boolean) => void;
  onResetFilters: () => void;
}

/**
 * Панель фильтров дашборда «SLA договоров»: год подписания, организация заказчика,
 * переключатель «без 1P» и сброс фильтров.
 */
export function ContractSlaFiltersBar({
  year,
  availableYears,
  onYearChange,
  organizations,
  onOrganizationToggle,
  onOrganizationsSelectAll,
  onOrganizationsDeselectAll,
  preparedBy,
  exclude1p,
  onExclude1pChange,
  onResetFilters,
}: ContractSlaFiltersBarProps) {
  return (
    <div className="bg-white rounded shadow px-1.5 py-1 sm:px-2 sm:py-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <label htmlFor="contract-sla-year-filter" className="text-xs font-medium text-gray-700 whitespace-nowrap">
          Год подписания:
        </label>
        <select
          id="contract-sla-year-filter"
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Организация:</span>
        <ContractSlaOrganizationFilter
          selected={organizations}
          onToggle={onOrganizationToggle}
          onSelectAll={onOrganizationsSelectAll}
          onDeselectAll={onOrganizationsDeselectAll}
        />

        <button
          type="button"
          onClick={() => onExclude1pChange(!exclude1p)}
          title="Исключить документы ЦФО «M - Commerce 1Р»"
          className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border transition-colors whitespace-nowrap ${
            exclude1p
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span
            className={`relative inline-flex items-center w-6 h-3 rounded-full transition-colors ${
              exclude1p ? 'bg-white/40' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${
                exclude1p ? 'translate-x-3' : 'translate-x-0.5'
              }`}
            />
          </span>
          без 1P
        </button>

        <button
          type="button"
          onClick={onResetFilters}
          className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors"
        >
          Сбросить фильтры
        </button>
        {preparedBy != null && preparedBy.trim() !== '' && (
          <span className="text-xs text-gray-500">Фильтр по специалисту: {preparedBy}</span>
        )}
      </div>
    </div>
  );
}
