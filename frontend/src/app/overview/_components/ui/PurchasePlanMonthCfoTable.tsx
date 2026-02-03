'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { CfoSummaryRow } from '../hooks/usePurchasePlanMonthBlockData';

const QUALITY_TOOLTIP = 'Отношение позиций «Связаны с заявкой» к запланированным, в процентах.';

interface PurchasePlanMonthCfoTableProps {
  rows: CfoSummaryRow[];
}

function formatSum(value: number): string {
  if (value === 0) return '0';
  return Math.round(value).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

/** Отношение «Связаны с заявкой» к запланированным по ЦФО (в %) */
function formatQualityPercent(row: { market: number; linked: number }): string {
  if (row.market === 0) return '—';
  return ((row.linked / row.market) * 100).toFixed(1) + '%';
}

/**
 * Сводная таблица по ЦФО: показатели как в диаграмме + суммы позиций и заявок.
 */
export function PurchasePlanMonthCfoTable({ rows }: PurchasePlanMonthCfoTableProps) {
  const [showQualityTip, setShowQualityTip] = useState(false);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-500">
        Нет данных по ЦФО
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, row) => ({
      market: acc.market + row.market,
      linked: acc.linked + row.linked,
      excluded: acc.excluded + row.excluded,
      requestsPurchase: acc.requestsPurchase + row.requestsPurchase,
      sumMarket: acc.sumMarket + row.sumMarket,
      sumRequests: acc.sumRequests + row.sumRequests,
    }),
    {
      market: 0,
      linked: 0,
      excluded: 0,
      requestsPurchase: 0,
      sumMarket: 0,
      sumRequests: 0,
    }
  );

  const baseCell = 'px-1.5 py-0.5 text-right text-gray-700 tabular-nums';
  const baseCellNowrap = 'px-1.5 py-0.5 text-right text-gray-700 tabular-nums whitespace-nowrap';
  const baseFt = 'px-1.5 py-0.5 text-right text-gray-900 tabular-nums';
  const baseFtNowrap = 'px-1.5 py-0.5 text-right text-gray-900 tabular-nums whitespace-nowrap';
  const baseTh = 'px-1.5 py-0.5 text-right font-medium text-gray-700 whitespace-nowrap';
  const thLabel = 'px-1.5 py-0.5 text-left font-medium text-gray-700 whitespace-nowrap border-r border-gray-300';
  // Группа «Позиции»: рамка border-gray-400
  const posFirstTh = 'border-l-2 border-t-2 border-r border-gray-400 rounded-tl-lg ' + baseTh;
  const posMidTh = 'border-t-2 border-r border-gray-400 ' + baseTh;
  const posLastTh = 'border-r-2 border-t-2 border-gray-400 rounded-tr-lg ' + baseTh;
  const posFirstTd = 'border-l-2 border-t border-b border-r border-gray-400 ' + baseCell;
  const posMidTd = 'border-t border-b border-r border-gray-400 ' + baseCell;
  const posMidTdNowrap = 'border-t border-b border-r border-gray-400 ' + baseCellNowrap;
  const posLastTd = 'border-r-2 border-t border-b border-gray-400 ' + baseCell;
  const posFirstFt = 'border-l-2 border-t border-b-2 border-r border-gray-400 rounded-bl-lg ' + baseFt;
  const posMidFt = 'border-t border-b-2 border-r border-gray-400 ' + baseFt;
  const posMidFtNowrap = 'border-t border-b-2 border-r border-gray-400 ' + baseFtNowrap;
  const posLastFt = 'border-r-2 border-t border-b-2 border-gray-400 ' + baseFt;
  // Группа «Заявки»
  const reqFirstTh = 'border-l-2 border-t-2 border-r border-gray-400 rounded-tl-lg ' + baseTh;
  const reqLastTh = 'border-r-2 border-t-2 border-gray-400 ' + baseTh;
  const reqFirstTd = 'border-l-2 border-t border-b border-r border-gray-400 ' + baseCell;
  const reqLastTd = 'border-r-2 border-t border-b border-gray-400 ' + baseCellNowrap;
  const reqFirstFt = 'border-l-2 border-t border-b-2 border-r border-gray-400 ' + baseFt;
  const reqLastFt = 'border-r-2 border-t border-b-2 border-gray-400 ' + baseFtNowrap;
  const tdLabel = 'px-1.5 py-0.5 text-gray-900 font-medium whitespace-nowrap border-r border-gray-200';
  const ftLabel = 'px-1.5 py-0.5 text-gray-900 whitespace-nowrap border-r border-gray-200';
  const thQuality = 'px-1.5 py-0.5 text-right font-medium text-gray-700 whitespace-nowrap border-r border-gray-300 rounded-tr-lg';
  const tdQuality = 'px-1.5 py-0.5 text-right text-gray-700 tabular-nums border-r border-gray-200';
  const ftQuality = 'px-1.5 py-0.5 text-right text-gray-900 tabular-nums border-r border-gray-200 rounded-br-lg';

  return (
    <div className="rounded border border-gray-200 bg-gray-50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-separate text-[11px]" style={{ borderSpacing: 0 }}>
          <thead className="bg-gray-100">
            <tr>
              <th className={thLabel}>ЦФО</th>
              <th className={posFirstTh}>Запланированы</th>
              <th className={posMidTh}>Сумма запл.</th>
              <th className={posMidTh}>Связаны с заявкой</th>
              <th className={posLastTh}>Исключена</th>
              <th className={reqFirstTh}>Заявок (закупка)</th>
              <th className={reqLastTh}>Сумма заявок</th>
              <th className={thQuality}>
                <span className="inline-flex items-center justify-end gap-0.5">
                  Кач. план.
                  <span
                    className="relative inline-flex shrink-0"
                    onMouseEnter={() => setShowQualityTip(true)}
                    onMouseLeave={() => setShowQualityTip(false)}
                  >
                    <span className="inline-flex text-blue-500 hover:text-blue-600 cursor-help" aria-label={QUALITY_TOOLTIP}>
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden />
                    </span>
                    {showQualityTip && (
                      <span
                        className="absolute right-0 top-full mt-1 z-50 px-2 py-1.5 text-xs text-white bg-gray-800 rounded shadow-lg whitespace-normal max-w-[220px] pointer-events-none"
                        role="tooltip"
                      >
                        {QUALITY_TOOLTIP}
                      </span>
                    )}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.cfo} className="hover:bg-gray-50">
                <td className={tdLabel}>{row.cfo}</td>
                <td className={posFirstTd}>{row.market}</td>
                <td className={posMidTdNowrap}>{formatSum(row.sumMarket)}</td>
                <td className={posMidTd}>{row.linked}</td>
                <td className={posLastTd}>{row.excluded}</td>
                <td className={reqFirstTd}>{row.requestsPurchase}</td>
                <td className={reqLastTd}>{formatSum(row.sumRequests)}</td>
                <td className={tdQuality}>{formatQualityPercent(row)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr className="font-medium border-t border-gray-300">
              <td className={ftLabel}>Итого</td>
              <td className={posFirstFt}>{totals.market}</td>
              <td className={posMidFtNowrap}>{formatSum(totals.sumMarket)}</td>
              <td className={posMidFt}>{totals.linked}</td>
              <td className={posLastFt}>{totals.excluded}</td>
              <td className={reqFirstFt}>{totals.requestsPurchase}</td>
              <td className={reqLastFt}>{formatSum(totals.sumRequests)}</td>
              <td className={ftQuality}>
                {formatQualityPercent(totals)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
