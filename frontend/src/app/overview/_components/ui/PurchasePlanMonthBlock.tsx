'use client';

import { usePurchasePlanMonthBlockData } from '../hooks/usePurchasePlanMonthBlockData';
import { PurchasePlanMonthPositionsChart } from './PurchasePlanMonthPositionsChart';
import { PurchasePlanMonthCfoTable } from './PurchasePlanMonthCfoTable';
import type { PurchasePlanMonthBlockData, OverviewPlanVersion, CfoSummaryRow } from '../hooks/usePurchasePlanMonthBlockData';

function formatVersionDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Пропсы для отображения блока месяца (без хука). */
export interface PurchasePlanMonthBlockViewProps {
  title: string;
  version: OverviewPlanVersion | null;
  positionsMarketCount: number;
  positionsLinkedToRequestCount: number;
  positionsExcludedCount: number;
  requestsPurchaseCreatedInMonthCount: number;
  requestsPurchasePlannedCount: number;
  requestsPurchaseNonPlannedCount: number;
  requestsPurchaseUnapprovedCount: number;
  requestsPurchaseExcludedCount: number;
  summaryByCfo: CfoSummaryRow[];
  loading: boolean;
  error: string | null;
}

/**
 * Только отображение блока месяца (без запросов). Используется в Overview с данными с /api/overview/purchase-plan-months.
 */
export function PurchasePlanMonthBlockView({
  title,
  version,
  positionsMarketCount,
  positionsLinkedToRequestCount,
  positionsExcludedCount,
  requestsPurchaseCreatedInMonthCount,
  requestsPurchasePlannedCount,
  requestsPurchaseNonPlannedCount,
  requestsPurchaseUnapprovedCount,
  requestsPurchaseExcludedCount,
  summaryByCfo,
  loading,
  error,
}: PurchasePlanMonthBlockViewProps) {
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
                requestsPurchasePlannedCount={requestsPurchasePlannedCount}
                requestsPurchaseNonPlannedCount={requestsPurchaseNonPlannedCount}
                requestsPurchaseUnapprovedCount={requestsPurchaseUnapprovedCount}
                requestsPurchaseExcludedCount={requestsPurchaseExcludedCount}
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

interface PurchasePlanMonthBlockProps {
  title: string;
  year: number;
  month: number;
  isCurrentMonth?: boolean;
  /** Данные с обзорного API — при передаче хук не вызывается */
  blockData?: PurchasePlanMonthBlockData | null;
  loading?: boolean;
  error?: string | null;
}

/**
 * Блок месяца в плане закупок: либо данные с родителя (blockData), либо загрузка через хук.
 */
export function PurchasePlanMonthBlock({
  title,
  year,
  month,
  isCurrentMonth = false,
  blockData: propsBlockData,
  loading: propsLoading,
  error: propsError,
}: PurchasePlanMonthBlockProps) {
  const hookData = usePurchasePlanMonthBlockData(year, month);
  const useProps = propsBlockData !== undefined;
  return (
    <PurchasePlanMonthBlockView
      title={title}
      version={useProps ? (propsBlockData?.version ?? null) : hookData.version}
      positionsMarketCount={useProps ? (propsBlockData?.positionsMarketCount ?? 0) : hookData.positionsMarketCount}
      positionsLinkedToRequestCount={useProps ? (propsBlockData?.positionsLinkedToRequestCount ?? 0) : hookData.positionsLinkedToRequestCount}
      positionsExcludedCount={useProps ? (propsBlockData?.positionsExcludedCount ?? 0) : hookData.positionsExcludedCount}
      requestsPurchaseCreatedInMonthCount={useProps ? (propsBlockData?.requestsPurchaseCreatedInMonthCount ?? 0) : hookData.requestsPurchaseCreatedInMonthCount}
      requestsPurchasePlannedCount={useProps ? (propsBlockData?.requestsPurchasePlannedCount ?? 0) : hookData.requestsPurchasePlannedCount}
      requestsPurchaseNonPlannedCount={useProps ? (propsBlockData?.requestsPurchaseNonPlannedCount ?? 0) : hookData.requestsPurchaseNonPlannedCount}
      requestsPurchaseUnapprovedCount={useProps ? (propsBlockData?.requestsPurchaseUnapprovedCount ?? 0) : hookData.requestsPurchaseUnapprovedCount}
      requestsPurchaseExcludedCount={useProps ? (propsBlockData?.requestsPurchaseExcludedCount ?? 0) : hookData.requestsPurchaseExcludedCount}
      summaryByCfo={useProps ? (propsBlockData?.summaryByCfo ?? []) : hookData.summaryByCfo}
      loading={useProps ? (propsLoading ?? false) : hookData.loading}
      error={useProps ? (propsError ?? null) : hookData.error}
    />
  );
}
