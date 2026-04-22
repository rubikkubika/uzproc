'use client';

import React from 'react';
import { PlanSummaryCardG } from './PlanSummaryCardG';
import { RequestStructureCardG } from './RequestStructureCardG';
import { CfoHeatmapCardG } from './CfoHeatmapCardG';
import { MonthlyExecutionChartG } from './MonthlyExecutionChartG';
import type { PurchasePlanMonthBlockData, OverviewPlanVersion } from '../hooks/usePurchasePlanMonthBlockData';
import { useOverviewPurchasePlanYearChart } from '../hooks/useOverviewPurchasePlanYearChart';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: PurchasePlanMonthBlockData | null;
  loading: boolean;
  error: string | null;
  monthLabel: string;
  currentMonth: number;
  selectedYear: number;
  availableYears: number[];
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onYearChange: (year: number) => void;
  enabled: boolean;
}

function VersionBadge({ version }: { version: OverviewPlanVersion | null }) {
  if (!version) return null;
  const dateStr = version.createdAt
    ? new Date(version.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;
  return (
    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
      Ред. {version.versionNumber}{dateStr ? ` · ${dateStr}` : ''}
    </span>
  );
}

export function PurchasePlanDashboardG({
  data,
  loading,
  error,
  monthLabel,
  currentMonth,
  selectedYear,
  availableYears,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onYearChange,
  enabled,
}: Props) {
  const yearChart = useOverviewPurchasePlanYearChart(selectedYear, enabled);

  return (
    <div className="flex flex-col gap-3">
      {/* Topbar */}
      <div className="bg-white rounded-xl shadow px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Год:</label>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">{monthLabel}</span>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="ml-auto">
          <VersionBadge version={data?.version ?? null} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow p-4 h-48 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {/* Cards */}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PlanSummaryCardG
              planned={data.positionsMarketCount}
              initiated={data.positionsLinkedToRequestCount}
              excluded={data.positionsExcludedCount}
            />
            <RequestStructureCardG
              planned={data.requestsPurchasePlannedCount}
              unplanned={data.requestsPurchaseNonPlannedCount}
              unapproved={data.requestsPurchaseUnapprovedCount}
              cancelled={data.requestsPurchaseExcludedCount}
            />
            <MonthlyExecutionChartG
              points={yearChart.points}
              currentMonth={currentMonth}
              loading={yearChart.loading}
            />
          </div>

          {data.summaryByCfo.length > 0 && (
            <CfoHeatmapCardG rows={data.summaryByCfo} />
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !error && !data && (
        <div className="bg-white rounded-xl shadow px-4 py-8 text-center text-sm text-gray-400">
          Нет данных за выбранный период
        </div>
      )}
    </div>
  );
}
