'use client';

import React, { useMemo } from 'react';
import {
  PURCHASER_DISTRIBUTION,
  PurchaserDistributionGroup,
} from '../constants/purchaserDistribution';

/** Формат целого числа с разделителем тысяч (неразрывный пробел). */
function formatInt(value: number): string {
  return Math.round(value).toLocaleString('ru-RU').replace(/\s/g, ' ');
}

interface GroupTotals {
  count: number;
  budgetMln: number;
  complexity: number;
}

function getGroupTotals(group: PurchaserDistributionGroup): GroupTotals {
  return group.items.reduce<GroupTotals>(
    (acc, item) => ({
      count: acc.count + item.count,
      budgetMln: acc.budgetMln + item.budgetMln,
      complexity: acc.complexity + item.complexity,
    }),
    { count: 0, budgetMln: 0, complexity: 0 }
  );
}

const TD = 'px-2 py-2 text-xs text-gray-900 border-r border-gray-300';
const TH = 'px-2 py-2 text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300';

/**
 * Дэшборд «Распределение по закупщикам».
 * Предлагаемое справедливое распределение активных заявок по предмету
 * с учётом нового, ещё не представленного закупщика.
 */
export function PurchaserDistributionTabContent() {
  const groups = PURCHASER_DISTRIBUTION;

  const grandTotals = useMemo<GroupTotals>(() => {
    return groups.reduce<GroupTotals>(
      (acc, group) => {
        const t = getGroupTotals(group);
        return {
          count: acc.count + t.count,
          budgetMln: acc.budgetMln + t.budgetMln,
          complexity: acc.complexity + t.complexity,
        };
      },
      { count: 0, budgetMln: 0, complexity: 0 }
    );
  }, [groups]);

  return (
    <div className="w-full p-2 sm:p-3">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-900">Распределение по закупщикам</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Предлагаемое распределение активных заявок ({formatInt(grandTotals.count)} шт.) по предмету
          с учётом нового закупщика. Бюджет — в млн, сложность — сумма баллов.
        </p>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow border border-gray-300">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-300">
              <th className={`${TH} text-left`}>Закупщик</th>
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
                    <tr key={`${group.buyer}-${item.subject}`} className="border-b border-gray-200 hover:bg-gray-50">
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
                          <div className="text-[10px] font-normal text-gray-500 mt-0.5">{group.theme}</div>
                        </td>
                      ) : null}
                      <td className={TD}>{item.subject}</td>
                      <td className={`${TD} text-right tabular-nums`}>{formatInt(item.count)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{formatInt(item.budgetMln)}</td>
                      <td className={`${TD} text-right tabular-nums border-r-0`}>{formatInt(item.complexity)}</td>
                    </tr>
                  ))}
                  <tr className="border-b-2 border-gray-300 bg-gray-100 font-semibold">
                    <td className={`${TD} text-right`}>Итого</td>
                    <td className={`${TD} text-right tabular-nums`}>{formatInt(totals.count)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{formatInt(totals.budgetMln)}</td>
                    <td className={`${TD} text-right tabular-nums border-r-0`}>{formatInt(totals.complexity)}</td>
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
              <td className={`${TD} text-right tabular-nums border-r-0`}>{formatInt(grandTotals.complexity)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
