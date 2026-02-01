'use client';

import { usePurchasePlanMonthBlockData } from '../hooks/usePurchasePlanMonthBlockData';
import { PurchasePlanMonthPositionsChart } from './PurchasePlanMonthPositionsChart';
import { PurchasePlanMonthCfoTable } from './PurchasePlanMonthCfoTable';

interface PurchasePlanMonthBlockProps {
  title: string;
  /** Год и месяц блока (для загрузки последней редакции и позиций) */
  year: number;
  month: number;
  isCurrentMonth?: boolean;
}

function formatVersionDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

/**
 * UI компонент для блока месяца в плане закупок.
 * Показывает последнюю редакцию за месяц (по дате создания) и столбчатую диаграмму — сколько позиций в месяце.
 */
export function PurchasePlanMonthBlock({
  title,
  year,
  month,
  isCurrentMonth = false,
}: PurchasePlanMonthBlockProps) {
  const {
    version,
    positionsMarketCount,
    positionsLinkedToRequestCount,
    positionsExcludedCount,
    requestsPurchaseCreatedInMonthCount,
    summaryByCfo,
    loading,
    error,
  } = usePurchasePlanMonthBlockData(year, month);

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-gray-900 shrink-0">{title}</h3>
        {!loading && version && (
          <span className="text-xs text-gray-600 shrink-0">
            Редакция №{version.versionNumber} от {formatVersionDate(version.createdAt)}
            {version.description && !/от\s+\d{2}\.\d{2}\.\d{4}/.test(version.description) && ` — ${version.description}`}
          </span>
        )}
        {!loading && !version && (
          <span className="text-xs text-gray-500 shrink-0">Нет редакции за этот месяц</span>
        )}
      </div>

      {loading && (
        <div className="min-h-[80px] flex items-center justify-center text-gray-500 text-sm">
          Загрузка…
        </div>
      )}

      {error && (
        <div className="mb-2 p-2 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Диаграмма и сводная таблица по ЦФО справа */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="flex-1 min-w-0">
              <PurchasePlanMonthPositionsChart
                marketCount={positionsMarketCount}
                linkedToRequestCount={positionsLinkedToRequestCount}
                excludedCount={positionsExcludedCount}
                requestsPurchaseCreatedInMonthCount={requestsPurchaseCreatedInMonthCount}
              />
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto sm:min-w-[280px]">
              <PurchasePlanMonthCfoTable rows={summaryByCfo} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
