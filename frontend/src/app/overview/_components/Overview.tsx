'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useOverview } from './hooks/useOverview';
import { useOverviewSlaData } from './hooks/useOverviewSlaData';
import type {
  OverviewSlaBlock,
  OverviewSlaRequestRow,
  OverviewSlaPercentageByPurchaser,
} from './hooks/useOverviewSlaData';
import { addWorkingDays, countWorkingDaysBetween, getPlannedSlaDaysNumber } from './utils/overviewSlaUtils';
import { useOverviewPurchasePlanMonthsData } from './hooks/useOverviewPurchasePlanMonthsData';
import { purchaserDisplayName } from '@/utils/purchaser';
import { OverviewTabs } from './ui/OverviewTabs';
import { usePurchasePlanMonths } from './hooks/usePurchasePlanMonths';
import { PurchasePlanDashboardG } from './ui/PurchasePlanDashboardG';
import { SlaStatusBlock } from './ui/SlaStatusBlock';
import { SlaCombinedChart } from './ui/SlaCombinedChart';
import { SlaAverageBlock } from './ui/SlaAverageBlock';
import { SlaByPurchaserTable } from './ui/SlaByPurchaserTable';
import AllCsiFeedback from './ui/AllCsiFeedback';
import { EkTabContent } from './ui/EkTabContent';
import { ApprovalsTabContent } from './ui/ApprovalsTabContent';
import { useOverviewTimelinesData } from './hooks/useOverviewTimelinesData';
import { TimelinesTabContent } from './ui/TimelinesTabContent';
import { SavingsTabContent } from './ui/SavingsTabContent';
import { ManagementReportingContent } from './ui/ManagementReportingContent';
import { ContractRemarksDashboardContent } from './ui/ContractRemarksDashboardContent';
import { useHolidayDateKeys } from '@/hooks/useHolidayDateKeys';

/**
 * Главный компонент страницы обзор
 * Интегрирует все вкладки и их содержимое
 */
export default function Overview() {
  const { activeTopTab, setActiveTopTab, activeDashboardCategory, setActiveDashboardCategory, activeTab, setActiveTab } = useOverview();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [slaYear, setSlaYearState] = useState<number>(() => {
    if (typeof window === 'undefined') return currentYear;
    const saved = sessionStorage.getItem('overview_slaYear');
    return saved ? Number(saved) : currentYear;
  });
  const setSlaYear = (year: number) => {
    setSlaYearState(year);
    if (typeof window !== 'undefined') sessionStorage.setItem('overview_slaYear', String(year));
  };
  const [slaPurchaserFilter, setSlaPurchaserFilterState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('overview_slaPurchaser') || null;
  });
  const setSlaPurchaserFilter = (v: string | null) => {
    setSlaPurchaserFilterState(v);
    if (typeof window !== 'undefined') {
      if (v) sessionStorage.setItem('overview_slaPurchaser', v);
      else sessionStorage.removeItem('overview_slaPurchaser');
    }
  };
  const slaAvailableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) years.push(i);
    return years;
  }, [currentYear]);
  const overviewHolidayFrom = `${slaYear - 2}-01-01`;
  const overviewHolidayTo = `${slaYear + 5}-12-31`;
  const overviewHolidayKeys = useHolidayDateKeys(overviewHolidayFrom, overviewHolidayTo);
  const {
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

  const slaEnabled = activeTab === 'sla' || activeTopTab === 'management-reporting';
  const slaData = useOverviewSlaData(
    slaEnabled ? slaYear : null,
    activeTab === 'sla' ? slaPurchaserFilter : null
  );
  /** Список всех закупщиков для таблицы: при отсутствии фильтра берём из ответа; при фильтре показываем последний сохранённый полный список (как на вкладке CSI). */
  const slaAllPurchasersRef = useRef<OverviewSlaPercentageByPurchaser[]>([]);
  const slaFullListLoadedRef = useRef(false);
  useEffect(() => {
    const list = slaData.data?.slaPercentageByPurchaser ?? [];
    if (slaPurchaserFilter == null || slaPurchaserFilter.trim() === '') {
      if (list.length > 0) {
        slaAllPurchasersRef.current = list;
        slaFullListLoadedRef.current = true;
      }
    }
  }, [slaData.data?.slaPercentageByPurchaser, slaPurchaserFilter]);

  // При возврате на страницу с фильтром — ref пуст, загружаем полный список без фильтра
  useEffect(() => {
    if (
      slaPurchaserFilter != null &&
      slaPurchaserFilter.trim() !== '' &&
      slaAllPurchasersRef.current.length === 0 &&
      !slaFullListLoadedRef.current &&
      slaEnabled &&
      slaYear != null
    ) {
      const loadFullList = async () => {
        try {
          const { getBackendUrl } = await import('@/utils/api');
          const params = new URLSearchParams({ year: String(slaYear) });
          const res = await fetch(`${getBackendUrl()}/api/overview/sla?${params}`);
          if (res.ok) {
            const json = await res.json();
            const list = json.slaPercentageByPurchaser ?? [];
            if (list.length > 0) {
              slaAllPurchasersRef.current = list;
              slaFullListLoadedRef.current = true;
              // Триггерим ререндер
              setSlaPurchaserFilter(slaPurchaserFilter);
            }
          }
        } catch {
          // ignore
        }
      };
      loadFullList();
    }
  }, [slaPurchaserFilter, slaEnabled, slaYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const slaByPurchaserTableRows =
    slaPurchaserFilter != null && slaPurchaserFilter.trim() !== ''
      ? slaAllPurchasersRef.current
      : slaData.data?.slaPercentageByPurchaser ?? [];

  /** Заявки «Требует внимания»: из группы «Заявка у закупщика», у которых минус в дельте либо осталось менее 30% от планового SLA. Плановый срок: из заявки (plannedSlaDays) или по сложности. */
  const requiresAttentionRequests = useMemo((): OverviewSlaRequestRow[] => {
    const blocks = slaData.data?.statusBlocks ?? [];
    const atBuyerBlock = blocks.find((b) => b.statusGroup === 'Заявка у закупщика');
    const requests = atBuyerBlock?.requests ?? [];
    const now = new Date();
    return requests.filter((row) => {
      const assignmentIso = row.approvalAssignmentDate;
      if (!assignmentIso) return false;
      const planned = row.plannedSlaDays ?? getPlannedSlaDaysNumber(row.complexity);
      const start = new Date(assignmentIso);
      if (isNaN(start.getTime())) return false;
      const end = row.purchaseCompletionDate ? new Date(row.purchaseCompletionDate) : now;
      if (isNaN(end.getTime())) return false;
      const factual = countWorkingDaysBetween(start, end, overviewHolidayKeys);
      const delta = planned != null ? planned - factual : null;
      const remainingPercent =
        planned != null && planned > 0 ? ((planned - factual) / planned) * 100 : 100;
      return (delta != null && delta < 0) || (planned != null && planned > 0 && remainingPercent < 30);
    });
  }, [slaData.data?.statusBlocks, overviewHolidayKeys]);

  /** Закупки завершённые по месяцам завершения в выбранном году (из slaPercentageByMonth с бэкенда). */
  const slaCompletedByMonth = useMemo((): number[] => {
    const counts = new Array(12).fill(0);
    const list = slaData.data?.slaPercentageByMonth ?? [];
    for (const m of list) {
      if (m.month >= 1 && m.month <= 12) counts[m.month - 1] = m.totalCompleted;
    }
    return counts;
  }, [slaData.data?.slaPercentageByMonth]);

  /** Текущие год и месяц (для разделения факт/прогноз на диаграмме). */
  const nowYear = useMemo(() => new Date().getFullYear(), []);
  const nowMonth = useMemo(() => new Date().getMonth() + 1, []);

  /** Прогноз по месяцам: заявки «Заявка у закупщика», дата назначения + плановый срок → месяц. Если плановый месяц < текущего — в текущий. */
  const slaForecastByMonth = useMemo((): number[] => {
    const counts = new Array(12).fill(0);
    const blocks = slaData.data?.statusBlocks ?? [];
    const atBuyerBlock = blocks.find((b) => b.statusGroup === 'Заявка у закупщика');
    const requests = atBuyerBlock?.requests ?? [];
    for (const row of requests) {
      const assignmentIso = row.approvalAssignmentDate;
      if (!assignmentIso) continue;
      const start = new Date(assignmentIso);
      if (isNaN(start.getTime())) continue;
      const plannedDays = row.plannedSlaDays ?? getPlannedSlaDaysNumber(row.complexity) ?? 30;
      const plannedEnd = addWorkingDays(start, plannedDays, overviewHolidayKeys);
      const plannedYear = plannedEnd.getFullYear();
      const plannedMonth = plannedEnd.getMonth() + 1;
      if (plannedYear !== slaYear) continue;
      let targetMonth: number;
      if (slaYear === nowYear && plannedMonth < nowMonth) {
        targetMonth = nowMonth;
      } else {
        targetMonth = plannedMonth;
      }
      if (targetMonth >= 1 && targetMonth <= 12) counts[targetMonth - 1] += 1;
    }
    return counts;
  }, [slaData.data?.statusBlocks, slaYear, nowYear, nowMonth, overviewHolidayKeys]);

  /** Прогнозный % SLA по месяцам: для каждого месяца — заявки, чьё плановое завершение в этом месяце; «требует внимания» = не выполнение. */
  const slaForecastSlaByMonth = useMemo((): { percentage: (number | null)[]; met: number[]; total: number[] } => {
    const percentage: (number | null)[] = new Array(12).fill(null);
    const met: number[] = new Array(12).fill(0);
    const total: number[] = new Array(12).fill(0);
    const attentionIds = new Set(requiresAttentionRequests.map((r) => r.id));
    const blocks = slaData.data?.statusBlocks ?? [];
    const atBuyerBlock = blocks.find((b) => b.statusGroup === 'Заявка у закупщика');
    const requests = atBuyerBlock?.requests ?? [];
    for (const row of requests) {
      const assignmentIso = row.approvalAssignmentDate;
      if (!assignmentIso) continue;
      const start = new Date(assignmentIso);
      if (isNaN(start.getTime())) continue;
      const plannedDays = row.plannedSlaDays ?? getPlannedSlaDaysNumber(row.complexity) ?? 30;
      const plannedEnd = addWorkingDays(start, plannedDays, overviewHolidayKeys);
      const plannedYear = plannedEnd.getFullYear();
      const plannedMonth = plannedEnd.getMonth() + 1;
      if (plannedYear !== slaYear) continue;
      let targetMonth: number;
      if (slaYear === nowYear && plannedMonth < nowMonth) {
        targetMonth = nowMonth;
      } else {
        targetMonth = plannedMonth;
      }
      if (targetMonth >= 1 && targetMonth <= 12) {
        const i = targetMonth - 1;
        total[i] += 1;
        if (!attentionIds.has(row.id)) met[i] += 1;
      }
    }
    for (let i = 0; i < 12; i++) {
      percentage[i] = total[i] > 0 ? (met[i] / total[i]) * 100 : null;
    }
    return { percentage, met, total };
  }, [slaData.data?.statusBlocks, slaYear, nowYear, nowMonth, requiresAttentionRequests, overviewHolidayKeys]);

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

  /** Средний % СЛА с учётом прогноза: факт (завершённые) + заявки у закупщика с плановым завершением в году; «требует внимания» считаем не выполненными. */
  const averageSlaWithForecast = useMemo((): number | null => {
    const list = slaData.data?.slaPercentageByMonth ?? [];
    let totalCompleted = 0;
    let metSla = 0;
    for (const m of list) {
      totalCompleted += m.totalCompleted;
      metSla += m.metSla;
    }
    const attentionIds = new Set(requiresAttentionRequests.map((r) => r.id));
    const blocks = slaData.data?.statusBlocks ?? [];
    const atBuyerBlock = blocks.find((b) => b.statusGroup === 'Заявка у закупщика');
    const requests = atBuyerBlock?.requests ?? [];
    let forecastTotal = 0;
    let forecastMet = 0;
    for (const row of requests) {
      const assignmentIso = row.approvalAssignmentDate;
      if (!assignmentIso) continue;
      const start = new Date(assignmentIso);
      if (isNaN(start.getTime())) continue;
      const plannedDays = row.plannedSlaDays ?? getPlannedSlaDaysNumber(row.complexity) ?? 30;
      const plannedEnd = addWorkingDays(start, plannedDays, overviewHolidayKeys);
      if (plannedEnd.getFullYear() !== slaYear) continue;
      forecastTotal += 1;
      if (!attentionIds.has(row.id)) forecastMet += 1;
    }
    const totalWithForecast = totalCompleted + forecastTotal;
    if (totalWithForecast === 0) return null;
    return ((metSla + forecastMet) / totalWithForecast) * 100;
  }, [slaData.data?.slaPercentageByMonth, slaData.data?.statusBlocks, requiresAttentionRequests, slaYear, overviewHolidayKeys]);

  const [timelinesOnlySigned, setTimelinesOnlySignedState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('overview_timelinesOnlySigned') === 'true';
  });
  const setTimelinesOnlySigned = (v: boolean | ((prev: boolean) => boolean)) => {
    setTimelinesOnlySignedState((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      if (typeof window !== 'undefined') sessionStorage.setItem('overview_timelinesOnlySigned', String(next));
      return next;
    });
  };
  const timelinesData = useOverviewTimelinesData(activeTab === 'timelines', timelinesOnlySigned);

  const purchasePlanMonthsParam = useMemo(
    () =>
      activeTab === 'purchase-plan'
        ? [currentMonth.getMonth() + 1]
        : [],
    [activeTab, currentMonth]
  );
  const purchasePlanMonthsData = useOverviewPurchasePlanMonthsData(
    selectedYear,
    purchasePlanMonthsParam,
    activeTab === 'purchase-plan'
  );

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-0">
      <OverviewTabs
        activeTopTab={activeTopTab}
        onTopTabChange={setActiveTopTab}
        activeDashboardCategory={activeDashboardCategory}
        onDashboardCategoryChange={setActiveDashboardCategory}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportPdf={handleExportPdf}
      />
      
      <div className="w-full flex-1 min-h-0 flex flex-col">
        {activeTopTab === 'management-reporting' && (
          <ManagementReportingContent
            slaYear={slaYear}
            averageSlaPercentage={averageSlaPercentage}
            slaCompletedByMonth={slaCompletedByMonth}
            slaPercentageByMonth={slaData.data?.slaPercentageByMonth ?? []}
            slaLoading={slaData.loading}
            slaError={slaData.error}
            nowYear={nowYear}
            nowMonth={nowMonth}
          />
        )}
        {activeTopTab === 'dashboards' && activeTab === 'sla' && (
          <div className="space-y-0.5 sm:space-y-1">
            <div className="bg-white rounded shadow px-1.5 py-1 sm:px-2 sm:py-1">
              <div className="flex flex-wrap items-center gap-1.5">
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
                <button
                  type="button"
                  onClick={() => setSlaPurchaserFilter(null)}
                  className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors"
                >
                  Сбросить фильтры
                </button>
                {slaPurchaserFilter != null && slaPurchaserFilter.trim() !== '' && (
                  <span className="text-xs text-gray-500">
                    Фильтр по закупщику: {purchaserDisplayName(slaPurchaserFilter) || slaPurchaserFilter}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2 w-full min-w-0 items-stretch">
              <SlaAverageBlock
                year={slaYear}
                averagePercentage={averageSlaPercentage}
                averageWithForecast={averageSlaWithForecast}
                loading={slaData.loading}
                error={slaData.error}
              />
              <SlaByPurchaserTable
                year={slaYear}
                rows={slaByPurchaserTableRows}
                loading={slaData.loading}
                error={slaData.error}
                selectedPurchaser={slaPurchaserFilter}
                onPurchaserClick={(purchaser) =>
                  setSlaPurchaserFilter(
                    purchaser === (slaPurchaserFilter ?? '') ? null : purchaser || null
                  )
                }
              />
              <div className="flex-1 min-w-0 h-[200px] flex" style={{ position: 'relative' }}>
                <SlaCombinedChart
                  year={slaYear}
                  countsByMonth={slaCompletedByMonth}
                  forecastByMonth={slaForecastByMonth}
                  forecastSlaPercentageByMonth={slaForecastSlaByMonth.percentage}
                  forecastSlaMetByMonth={slaForecastSlaByMonth.met}
                  forecastSlaTotalByMonth={slaForecastSlaByMonth.total}
                  currentYear={nowYear}
                  currentMonth={nowMonth}
                  slaPercentageByMonth={slaData.data?.slaPercentageByMonth ?? []}
                  loading={slaData.loading}
                  error={slaData.error}
                  averageSlaPercentage={averageSlaPercentage}
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
                holidayKeys={overviewHolidayKeys}
              />
            ))}
          </div>
        )}
        {activeTopTab === 'dashboards' && activeTab === 'csi' && (
          <div className="w-full flex-1 min-h-0 flex flex-col">
            <AllCsiFeedback />
          </div>
        )}
        {activeTopTab === 'dashboards' && activeTab === 'ek' && (
          <div className="w-full">
            <EkTabContent />
          </div>
        )}
        {activeTopTab === 'dashboards' && activeTab === 'approvals' && (
          <div className="w-full">
            <ApprovalsTabContent />
          </div>
        )}
        {activeTopTab === 'dashboards' && activeTab === 'timelines' && (
          <div className="w-full">
            <TimelinesTabContent
              data={timelinesData.data}
              loading={timelinesData.loading}
              error={timelinesData.error}
              onlySignedContracts={timelinesOnlySigned}
              onToggleOnlySigned={() => setTimelinesOnlySigned((v) => !v)}
            />
          </div>
        )}
        {activeTopTab === 'dashboards' && activeTab === 'purchase-plan' && (
          <PurchasePlanDashboardG
            data={purchasePlanMonthsData.months[0] ?? null}
            loading={purchasePlanMonthsData.loading}
            error={purchasePlanMonthsData.error}
            monthLabel={formatMonth(currentMonth)}
            currentMonth={currentMonth.getMonth() + 1}
            selectedYear={selectedYear}
            availableYears={availableYears}
            hasPrevious={hasPreviousMonth}
            hasNext={hasNextMonth}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
            onYearChange={handleYearChange}
            enabled={activeTab === 'purchase-plan'}
          />
        )}
        {activeTopTab === 'dashboards' && activeTab === 'savings' && (
          <div className="w-full">
            <SavingsTabContent />
          </div>
        )}
        {activeTopTab === 'dashboards' && activeTab === 'contract-remarks' && (
          <div className="w-full">
            <ContractRemarksDashboardContent />
          </div>
        )}
      </div>
    </div>
  );
}
