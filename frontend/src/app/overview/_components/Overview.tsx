'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOverview } from './hooks/useOverview';
import { useOverviewSlaData } from './hooks/useOverviewSlaData';
import type { OverviewSlaBlock, OverviewSlaRequestRow } from './hooks/useOverviewSlaData';
import { countWorkingDaysBetween, getPlannedSlaDaysNumber } from './utils/overviewSlaUtils';
import { useOverviewPurchasePlanMonthsData } from './hooks/useOverviewPurchasePlanMonthsData';
import { OverviewTabs } from './ui/OverviewTabs';
import { usePurchasePlanMonths } from './hooks/usePurchasePlanMonths';
import { PurchasePlanMonthBlockView } from './ui/PurchasePlanMonthBlock';
import { SlaStatusBlock } from './ui/SlaStatusBlock';
import { SlaCombinedChart } from './ui/SlaCombinedChart';
import { SlaAverageBlock } from './ui/SlaAverageBlock';
import { SlaByPurchaserTable } from './ui/SlaByPurchaserTable';
import AllCsiFeedback from './ui/AllCsiFeedback';

/**
 * Главный компонент страницы обзор
 * Интегрирует все вкладки и их содержимое
 */
export default function Overview() {
  const { activeTab, setActiveTab } = useOverview();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [slaYear, setSlaYear] = useState<number>(currentYear);
  const slaAvailableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) years.push(i);
    return years;
  }, [currentYear]);
  const {
    previousMonth,
    currentMonth,
    formatMonth,
    goToPreviousMonth,
    goToNextMonth,
    hasPreviousMonth,
    hasNextMonth,
    selectedYear,
    availableYears,
    handleYearChange,
  } = usePurchasePlanMonths();

  const slaData = useOverviewSlaData(activeTab === 'sla' ? slaYear : null);

  /** Заявки «Требует внимания»: из группы «Заявка у закупщика», у которых минус в дельте либо осталось менее 30% от планового SLA. */
  const requiresAttentionRequests = useMemo((): OverviewSlaRequestRow[] => {
    const blocks = slaData.data?.statusBlocks ?? [];
    const atBuyerBlock = blocks.find((b) => b.statusGroup === 'Заявка у закупщика');
    const requests = atBuyerBlock?.requests ?? [];
    const now = new Date();
    return requests.filter((row) => {
      const assignmentIso = row.approvalAssignmentDate;
      if (!assignmentIso) return false;
      const planned = getPlannedSlaDaysNumber(row.complexity);
      const start = new Date(assignmentIso);
      if (isNaN(start.getTime())) return false;
      const end = row.purchaseCompletionDate ? new Date(row.purchaseCompletionDate) : now;
      if (isNaN(end.getTime())) return false;
      const factual = countWorkingDaysBetween(start, end);
      const delta = planned != null ? planned - factual : null;
      const remainingPercent =
        planned != null && planned > 0 ? ((planned - factual) / planned) * 100 : 100;
      return (delta != null && delta < 0) || (planned != null && planned > 0 && remainingPercent < 30);
    });
  }, [slaData.data?.statusBlocks]);

  /** Закупки завершённые по месяцам завершения в выбранном году (из slaPercentageByMonth с бэкенда). */
  const slaCompletedByMonth = useMemo((): number[] => {
    const counts = new Array(12).fill(0);
    const list = slaData.data?.slaPercentageByMonth ?? [];
    for (const m of list) {
      if (m.month >= 1 && m.month <= 12) counts[m.month - 1] = m.totalCompleted;
    }
    return counts;
  }, [slaData.data?.slaPercentageByMonth]);

  /** Блоки SLA для отображения: первый блок «Требует внимания», затем «Договор в работе» и «Договор подписан» объединены в «Закупка завершена». */
  const slaDisplayBlocks = useMemo((): OverviewSlaBlock[] => {
    const blocks = slaData.data?.statusBlocks ?? [];
    const attentionBlock: OverviewSlaBlock = {
      statusGroup: 'Требует внимания',
      requests: requiresAttentionRequests,
    };
    if (blocks.length === 0) return [attentionBlock];
    if (blocks.length === 1) return [attentionBlock, ...blocks];
    const [first, ...rest] = blocks;
    const lastTwoMerged =
      rest.length >= 2 &&
      rest[rest.length - 2].statusGroup === 'Договор в работе' &&
      rest[rest.length - 1].statusGroup === 'Договор подписан'
        ? [
            ...rest.slice(0, -2),
            {
              statusGroup: 'Закупка завершена',
              requests: [...rest[rest.length - 2].requests, ...rest[rest.length - 1].requests],
            },
          ]
        : rest;
    return [attentionBlock, first, ...lastTwoMerged];
  }, [slaData.data?.statusBlocks, requiresAttentionRequests]);
  /** Средний % выполнения СЛА в году (взвешенный: сумма metSla / сумма totalCompleted). */
  const averageSlaPercentage = useMemo((): number | null => {
    const list = slaData.data?.slaPercentageByMonth ?? [];
    let totalCompleted = 0;
    let metSla = 0;
    for (const m of list) {
      totalCompleted += m.totalCompleted;
      metSla += m.metSla;
    }
    if (totalCompleted === 0) return null;
    return (metSla / totalCompleted) * 100;
  }, [slaData.data?.slaPercentageByMonth]);

  const purchasePlanMonthsParam = useMemo(
    () =>
      activeTab === 'purchase-plan'
        ? [previousMonth.getMonth() + 1, currentMonth.getMonth() + 1]
        : [],
    [activeTab, previousMonth, currentMonth]
  );
  const purchasePlanMonthsData = useOverviewPurchasePlanMonthsData(
    selectedYear,
    purchasePlanMonthsParam,
    activeTab === 'purchase-plan'
  );

  return (
    <div className="space-y-0.5 sm:space-y-1">
      <OverviewTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="w-full">
        {activeTab === 'sla' && (
          <div className="space-y-0.5 sm:space-y-1">
            <div className="bg-white rounded shadow px-1.5 py-1 sm:px-2 sm:py-1">
              <div className="flex items-center gap-1.5">
                <label htmlFor="sla-year-filter" className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  Год завершения:
                </label>
                <select
                  id="sla-year-filter"
                  value={slaYear}
                  onChange={(e) => setSlaYear(Number(e.target.value))}
                  className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {slaAvailableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2 w-full min-w-0 items-stretch">
              <SlaAverageBlock
                year={slaYear}
                averagePercentage={averageSlaPercentage}
                loading={slaData.loading}
                error={slaData.error}
              />
              <SlaByPurchaserTable
                year={slaYear}
                rows={slaData.data?.slaPercentageByPurchaser ?? []}
                loading={slaData.loading}
                error={slaData.error}
              />
              <div className="flex-1 min-w-0 h-[200px] flex" style={{ position: 'relative' }}>
                <SlaCombinedChart
                  year={slaYear}
                  countsByMonth={slaCompletedByMonth}
                  slaPercentageByMonth={slaData.data?.slaPercentageByMonth ?? []}
                  loading={slaData.loading}
                  error={slaData.error}
                />
              </div>
            </div>
            {slaDisplayBlocks.map((block) => (
              <SlaStatusBlock
                key={block.statusGroup}
                title={block.statusGroup}
                requests={block.requests}
                loading={slaData.loading}
                error={slaData.error}
              />
            ))}
          </div>
        )}
        {activeTab === 'csi' && (
          <div className="w-full">
            <AllCsiFeedback />
          </div>
        )}
        {activeTab === 'ek' && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Раздел ЕК — в разработке.</p>
          </div>
        )}
        {activeTab === 'approvals' && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Раздел Согласования — в разработке.</p>
          </div>
        )}
        {activeTab === 'purchase-plan' && (
          <div className="space-y-2 sm:space-y-3">
            {/* Фильтр по году планирования */}
            <div className="bg-white rounded-lg shadow-lg p-2 sm:p-3">
              <div className="flex items-center gap-2">
                <label htmlFor="year-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Год планирования:
                </label>
                <select
                  id="year-filter"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Кнопка "Предыдущий месяц" сверху */}
            {hasPreviousMonth && (
              <button
                onClick={goToPreviousMonth}
                className="w-full py-0.5 px-2 min-h-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Предыдущий месяц</span>
              </button>
            )}

            {/* Сверху: месяц −1 от текущего — данные одним запросом /api/overview/purchase-plan-months */}
            <PurchasePlanMonthBlockView
              title={formatMonth(previousMonth)}
              version={purchasePlanMonthsData.months[0]?.version ?? null}
              positionsMarketCount={purchasePlanMonthsData.months[0]?.positionsMarketCount ?? 0}
              positionsLinkedToRequestCount={purchasePlanMonthsData.months[0]?.positionsLinkedToRequestCount ?? 0}
              positionsExcludedCount={purchasePlanMonthsData.months[0]?.positionsExcludedCount ?? 0}
              requestsPurchaseCreatedInMonthCount={purchasePlanMonthsData.months[0]?.requestsPurchaseCreatedInMonthCount ?? 0}
              requestsPurchasePlannedCount={purchasePlanMonthsData.months[0]?.requestsPurchasePlannedCount ?? 0}
              requestsPurchaseNonPlannedCount={purchasePlanMonthsData.months[0]?.requestsPurchaseNonPlannedCount ?? 0}
              requestsPurchaseUnapprovedCount={purchasePlanMonthsData.months[0]?.requestsPurchaseUnapprovedCount ?? 0}
              requestsPurchaseExcludedCount={purchasePlanMonthsData.months[0]?.requestsPurchaseExcludedCount ?? 0}
              summaryByCfo={purchasePlanMonthsData.months[0]?.summaryByCfo ?? []}
              loading={purchasePlanMonthsData.loading}
              error={purchasePlanMonthsData.error}
            />

            {/* Снизу: текущий месяц */}
            <PurchasePlanMonthBlockView
              title={formatMonth(currentMonth)}
              version={purchasePlanMonthsData.months[1]?.version ?? null}
              positionsMarketCount={purchasePlanMonthsData.months[1]?.positionsMarketCount ?? 0}
              positionsLinkedToRequestCount={purchasePlanMonthsData.months[1]?.positionsLinkedToRequestCount ?? 0}
              positionsExcludedCount={purchasePlanMonthsData.months[1]?.positionsExcludedCount ?? 0}
              requestsPurchaseCreatedInMonthCount={purchasePlanMonthsData.months[1]?.requestsPurchaseCreatedInMonthCount ?? 0}
              requestsPurchasePlannedCount={purchasePlanMonthsData.months[1]?.requestsPurchasePlannedCount ?? 0}
              requestsPurchaseNonPlannedCount={purchasePlanMonthsData.months[1]?.requestsPurchaseNonPlannedCount ?? 0}
              requestsPurchaseUnapprovedCount={purchasePlanMonthsData.months[1]?.requestsPurchaseUnapprovedCount ?? 0}
              requestsPurchaseExcludedCount={purchasePlanMonthsData.months[1]?.requestsPurchaseExcludedCount ?? 0}
              summaryByCfo={purchasePlanMonthsData.months[1]?.summaryByCfo ?? []}
              loading={purchasePlanMonthsData.loading}
              error={purchasePlanMonthsData.error}
            />

            {/* Кнопка "Следующий месяц" снизу */}
            {hasNextMonth && (
              <button
                onClick={goToNextMonth}
                className="w-full py-0.5 px-2 min-h-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded transition-colors flex items-center justify-center gap-1"
              >
                <span>Следующий месяц</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
