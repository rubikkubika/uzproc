'use client';

import { EK_TABLE_COLUMNS, EK_TABLE_HINT } from '../constants/ek.constants';
import type { EkApiResponse, EkRiskThresholds, EkRow, EkSortKey, EkSortState, EkTotals } from '../types/ek.types';
import { resolveRowCurrency } from '../utils/ek-dashboard.utils';
import { EkCfoTableFooter } from './EkCfoTableFooter';
import { EkCfoTableRow } from './EkCfoTableRow';
import { EkRiskLegend } from './EkRiskLegend';

interface EkCfoTableProps {
  rows: EkRow[];
  totals: EkTotals;
  data: EkApiResponse;
  totalsCurrency: string | null;
  thresholds: EkRiskThresholds;
  sort: EkSortState;
  onSort: (key: EkSortKey) => void;
}

/** Таблица «Доля ЕК по ЦФО» со встроенными 100%-барами и сортировкой по заголовкам */
export function EkCfoTable({ rows, totals, data, totalsCurrency, thresholds, sort, onSort }: EkCfoTableProps) {
  return (
    <div data-tour="ek-table" className="bg-white rounded-xl shadow-sm py-3.5 px-4 min-w-0">
      <div className="flex justify-between items-start gap-3 flex-wrap mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Доля ЕК по ЦФО</h3>
          <div className="text-xs text-gray-500 mt-0.5">{EK_TABLE_HINT}</div>
        </div>
        <EkRiskLegend thresholds={thresholds} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] lg:min-w-0 table-fixed text-[13px] border-collapse">
          <colgroup>
            <col className="w-[21%]" />
            <col />
            <col />
            <col className="w-[96px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead className="border-b border-gray-200">
            <tr>
              {EK_TABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  onClick={() => onSort(column.key)}
                  className={`text-xs text-gray-500 font-medium px-2 py-2 cursor-pointer select-none whitespace-nowrap hover:text-gray-900 ${
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {column.label}
                  {sort.key === column.key && <span className="ml-1">{sort.dir === 1 ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <EkCfoTableRow key={row.cfo} row={row} currency={resolveRowCurrency(row, data)} />
            ))}
          </tbody>
          <EkCfoTableFooter totals={totals} currency={totalsCurrency} />
        </table>
      </div>
    </div>
  );
}
