'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { CfoSummaryRow } from '../hooks/usePurchasePlanMonthBlockData';

const QUALITY_TOOLTIP =
  'Качество планирования: заявки инициированы / (запланированы + внеплановые заявки), в %. Одинаковая формула по каждому ЦФО и в итого.';

interface PurchasePlanMonthCfoTableProps {
  rows: CfoSummaryRow[];
}

/** Сумма в виде «X млн», «X млрд», «X тыс» (например: "1,5 млрд", "230 млн", "50 тыс") */
function formatSumWithUnit(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000_000) {
    const v = value / 1_000_000_000;
    const s = Number.isInteger(v) ? v.toLocaleString('ru-RU') : v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return sign + s + ' млрд';
  }
  if (abs >= 1_000_000) {
    const v = value / 1_000_000;
    const s = Number.isInteger(v) ? v.toLocaleString('ru-RU') : v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return sign + s + ' млн';
  }
  if (abs >= 1_000) {
    const v = value / 1_000;
    const s = Number.isInteger(v) ? v.toLocaleString('ru-RU') : v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return sign + s + ' тыс';
  }
  return sign + Math.round(abs).toLocaleString('ru-RU');
}

/** По ЦФО: заявки инициированы / (запланированы + внеплановые заявки по ЦФО), в % */
function formatQualityPercentRow(row: { market: number; linked: number; requestsNonPlanned: number }): string {
  const denom = row.market + row.requestsNonPlanned;
  if (denom === 0) return '—';
  return ((row.linked / denom) * 100).toFixed(1) + '%';
}

/**
 * Сводная таблица по ЦФО: показатели как в диаграмме + суммы позиций и заявок.
 */
export function PurchasePlanMonthCfoTable({ rows }: PurchasePlanMonthCfoTableProps) {
  const [showQualityTip, setShowQualityTip] = useState(false);

  // Сортировка по качеству: linked / (market + requestsNonPlanned) от больших к меньшим
  const sortedRows = [...rows].sort((a, b) => {
    const denomA = a.market + a.requestsNonPlanned;
    const denomB = b.market + b.requestsNonPlanned;
    const qA = denomA === 0 ? 0 : a.linked / denomA;
    const qB = denomB === 0 ? 0 : b.linked / denomB;
    return qB - qA;
  });

  if (rows.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-500">
        Нет данных по ЦФО
      </div>
    );
  }

  const totals = sortedRows.reduce(
    (acc, row) => ({
      market: acc.market + row.market,
      linked: acc.linked + row.linked,
      excluded: acc.excluded + row.excluded,
      requestsPurchase: acc.requestsPurchase + row.requestsPurchase,
      requestsPlanned: acc.requestsPlanned + row.requestsPlanned,
      requestsNonPlanned: acc.requestsNonPlanned + row.requestsNonPlanned,
      requestsUnapproved: acc.requestsUnapproved + row.requestsUnapproved,
      requestsExcluded: acc.requestsExcluded + row.requestsExcluded,
      sumMarket: acc.sumMarket + row.sumMarket,
      sumRequests: acc.sumRequests + row.sumRequests,
    }),
    {
      market: 0,
      linked: 0,
      excluded: 0,
      requestsPurchase: 0,
      requestsPlanned: 0,
      requestsNonPlanned: 0,
      requestsUnapproved: 0,
      requestsExcluded: 0,
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
  // Группа «Заявки»: Плановые, Внеплановые, Неутверждена, Отмена, Сумма заявок
  const reqFirstTh = 'border-l-2 border-t-2 border-r border-gray-400 rounded-tl-lg ' + baseTh;
  const reqMidTh = 'border-t-2 border-r border-gray-400 ' + baseTh;
  const reqLastTh = 'border-r-2 border-t-2 border-gray-400 ' + baseTh;
  const reqFirstTd = 'border-l-2 border-t border-b border-r border-gray-400 ' + baseCell;
  const reqMidTd = 'border-t border-b border-r border-gray-400 ' + baseCell;
  const reqLastTd = 'border-r-2 border-t border-b border-gray-400 ' + baseCellNowrap;
  const reqFirstFt = 'border-l-2 border-t border-b-2 border-r border-gray-400 ' + baseFt;
  const reqMidFt = 'border-t border-b-2 border-r border-gray-400 ' + baseFt;
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
              <th className={posMidTh}>Заявки инициированы</th>
              <th className={posLastTh}>Исключена</th>
              <th className={reqFirstTh}>Плановые</th>
              <th className={reqMidTh}>Внеплановые</th>
              <th className={reqMidTh}>Неутверждена</th>
              <th className={reqMidTh}>Отмена</th>
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
            {sortedRows.map((row) => (
              <tr key={row.cfo} className="hover:bg-gray-50">
                <td className={tdLabel}>{row.cfo}</td>
                <td className={posFirstTd}>{row.market}</td>
                <td className={posMidTdNowrap}>{formatSumWithUnit(row.sumMarket)}</td>
                <td className={posMidTd}>{row.linked}</td>
                <td className={posLastTd}>{row.excluded}</td>
                <td className={reqFirstTd}>{row.requestsPlanned}</td>
                <td className={reqMidTd}>{row.requestsNonPlanned}</td>
                <td className={reqMidTd}>{row.requestsUnapproved}</td>
                <td className={reqMidTd}>{row.requestsExcluded}</td>
                <td className={reqLastTd}>{formatSumWithUnit(row.sumRequests)}</td>
                <td className={tdQuality}>{formatQualityPercentRow(row)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr className="font-medium border-t border-gray-300">
              <td className={ftLabel}>Итого</td>
              <td className={posFirstFt}>{totals.market}</td>
              <td className={posMidFtNowrap}>{formatSumWithUnit(totals.sumMarket)}</td>
              <td className={posMidFt}>{totals.linked}</td>
              <td className={posLastFt}>{totals.excluded}</td>
              <td className={reqFirstFt}>{totals.requestsPlanned}</td>
              <td className={reqMidFt}>{totals.requestsNonPlanned}</td>
              <td className={reqMidFt}>{totals.requestsUnapproved}</td>
              <td className={reqMidFt}>{totals.requestsExcluded}</td>
              <td className={reqLastFt}>{formatSumWithUnit(totals.sumRequests)}</td>
              <td className={ftQuality}>
                {formatQualityPercentRow(totals)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
