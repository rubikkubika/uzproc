'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import type { CfoSummaryRow } from '../hooks/usePurchasePlanMonthBlockData';

const QUALITY_TOOLTIP =
  'Качество планирования: заявки инициированы / (запланированы + внеплановые заявки), в %. Одинаковая формула по каждому ЦФО и в итого.';

const HEADERS_FULL = {
  cfo: 'ЦФО',
  planned: 'Запланированы',
  sumPlanned: 'Сумма запл.',
  initiated: 'Заявки инициированы',
  excluded: 'Исключена',
  plannedReq: 'Плановые',
  nonPlanned: 'Внеплановые',
  unapproved: 'Неутверждена',
  canceled: 'Отмена',
  sumRequests: 'Сумма заявок',
  quality: 'Кач. план.',
} as const;

const HEADERS_COMPACT = {
  cfo: 'ЦФО',
  planned: 'Запл.',
  sumPlanned: 'Сумма запл.',
  initiated: 'Иниц.',
  excluded: 'Искл.',
  plannedReq: 'Планов.',
  nonPlanned: 'Внеплан.',
  unapproved: 'Неутв.',
  canceled: 'Отмена',
  sumRequests: 'Сумма заявок',
  quality: 'Кач. план.',
} as const;

const COMPACT_BREAKPOINT = 480;

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
 * На узких экранах — сокращённые заголовки; один контейнер overflow-x-auto без вложенной вертикальной прокрутки.
 */
export function PurchasePlanMonthCfoTable({ rows }: PurchasePlanMonthCfoTableProps) {
  const [showQualityTip, setShowQualityTip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setCompact(el.getBoundingClientRect().width < COMPACT_BREAKPOINT);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const headers = compact ? HEADERS_COMPACT : HEADERS_FULL;

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
  const thBorder = 'border-r border-gray-300 ';
  const tdBorder = 'border-r border-gray-200 ';
  const posFirstTh = thBorder + baseTh;
  const posMidTh = thBorder + baseTh;
  const posLastTh = thBorder + baseTh;
  const posFirstTd = tdBorder + baseCell;
  const posMidTd = tdBorder + baseCell;
  const posMidTdNowrap = tdBorder + baseCellNowrap;
  const posLastTd = tdBorder + baseCell;
  const posFirstFt = tdBorder + baseFt;
  const posMidFt = tdBorder + baseFt;
  const posMidFtNowrap = tdBorder + baseFtNowrap;
  const posLastFt = tdBorder + baseFt;
  const reqFirstTh = thBorder + baseTh;
  const reqMidTh = thBorder + baseTh;
  const reqLastTh = thBorder + baseTh;
  const reqFirstTd = tdBorder + baseCell;
  const reqMidTd = tdBorder + baseCell;
  const reqLastTd = tdBorder + baseCellNowrap;
  const reqFirstFt = tdBorder + baseFt;
  const reqMidFt = tdBorder + baseFt;
  const reqLastFt = tdBorder + baseFtNowrap;
  const tdLabel = 'px-1.5 py-0.5 text-gray-900 font-medium whitespace-nowrap ' + tdBorder;
  const ftLabel = 'px-1.5 py-0.5 text-gray-900 whitespace-nowrap ' + tdBorder;
  const thQuality = thBorder + 'px-1.5 py-0.5 text-right font-medium text-gray-700 whitespace-nowrap';
  const tdQuality = tdBorder + 'px-1.5 py-0.5 text-right text-gray-700 tabular-nums';
  const ftQuality = tdBorder + 'px-1.5 py-0.5 text-right text-gray-900 tabular-nums';

  return (
    <div ref={containerRef} className="rounded border border-gray-200 bg-gray-50 min-w-0 max-w-full overflow-hidden">
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="border-collapse text-[11px] w-max min-w-full">
          <thead className="bg-gray-100">
            <tr className="border-b border-gray-300">
              <th className={thLabel}>{headers.cfo}</th>
              <th className={posFirstTh}>{headers.planned}</th>
              <th className={posMidTh}>{headers.sumPlanned}</th>
              <th className={posMidTh}>{headers.initiated}</th>
              <th className={posLastTh}>{headers.excluded}</th>
              <th className={reqFirstTh}>{headers.plannedReq}</th>
              <th className={reqMidTh}>{headers.nonPlanned}</th>
              <th className={reqMidTh}>{headers.unapproved}</th>
              <th className={reqMidTh}>{headers.canceled}</th>
              <th className={reqLastTh}>{headers.sumRequests}</th>
              <th className={thQuality}>
                <span className="inline-flex items-center justify-end gap-0.5">
                  {headers.quality}
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
