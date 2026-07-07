'use client';

import React from 'react';
import {
  DistributionGroup,
  DistributionTotals,
  getGroupTotals,
} from '../hooks/usePurchaserDistribution';

/** Целое с разделителем тысяч. */
function formatInt(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

const TD = 'px-2 py-2 text-xs text-gray-900 border-r border-gray-300';
const TH = 'px-2 py-2 text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300';

interface PurchaserDistributionTableProps {
  groups: DistributionGroup[];
  grandTotals: DistributionTotals;
}

/**
 * Таблица предлагаемого распределения: предполагаемый закупщик → статья расходов,
 * с итогами по группе и по всему срезу.
 */
export function PurchaserDistributionTable({
  groups,
  grandTotals,
}: PurchaserDistributionTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded shadow border border-gray-300">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-300">
            <th className={`${TH} text-left`}>Закупщик (предполагается)</th>
            <th className={`${TH} text-left`}>Предмет (статья расходов)</th>
            <th className={`${TH} text-right`}>Заявок</th>
            <th className={`${TH} text-right`}>Бюджет, млн</th>
            <th className={`${TH} text-right`}>Сложность, Σ</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const totals = getGroupTotals(group);
            return (
              <React.Fragment key={group.buyer}>
                {group.items.map((item, idx) => (
                  <tr
                    key={`${group.buyer}-${item.subject}`}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    {idx === 0 ? (
                      <td
                        className={`${TD} align-top font-medium bg-gray-50`}
                        rowSpan={group.items.length + 1}
                      >
                        <div className="flex items-center gap-1">
                          <span>{group.buyer}</span>
                          {group.isNew && (
                            <span className="px-1 py-0.5 text-[10px] leading-none rounded bg-blue-100 text-blue-700 border border-blue-200">
                              новый
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                          {group.theme}
                        </div>
                      </td>
                    ) : null}
                    <td className={TD}>{item.subject}</td>
                    <td className={`${TD} text-right tabular-nums`}>{formatInt(item.count)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{formatInt(item.budgetMln)}</td>
                    <td className={`${TD} text-right tabular-nums border-r-0`}>
                      {formatInt(item.complexity)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b-2 border-gray-300 bg-gray-100 font-semibold">
                  <td className={`${TD} text-right`}>Итого</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatInt(totals.count)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatInt(totals.budgetMln)}</td>
                  <td className={`${TD} text-right tabular-nums border-r-0`}>
                    {formatInt(totals.complexity)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
          <tr className="bg-gray-200 font-bold text-gray-900">
            <td className={`${TD}`} colSpan={2}>
              ВСЕГО
            </td>
            <td className={`${TD} text-right tabular-nums`}>{formatInt(grandTotals.count)}</td>
            <td className={`${TD} text-right tabular-nums`}>{formatInt(grandTotals.budgetMln)}</td>
            <td className={`${TD} text-right tabular-nums border-r-0`}>
              {formatInt(grandTotals.complexity)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
