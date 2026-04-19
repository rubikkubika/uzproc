'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Star } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import { SlaCombinedChart } from './SlaCombinedChart';
import { ManagementReportingFeedbackGrid } from './ManagementReportingFeedbackGrid';
import { ManagementReportingNew } from './ManagementReportingNew';
import { useOverviewSavingsData } from '../hooks/useOverviewSavingsData';
import { useManagementReportingPdf } from '../hooks/useManagementReportingPdf';
import type { OverviewSlaPercentageByMonth } from '../hooks/useOverviewSlaData';

/* ─── Типы CSI ─────────────────────────────────────────────────────────── */

interface CsiStats {
  year: number;
  count: number;
  avgSpeed: number | null;
  avgQuality: number | null;
  avgSatisfaction: number | null;
  avgUzproc: number | null;
  avgOverall: number | null;
}

/* ─── Пропсы ───────────────────────────────────────────────────────────── */

export interface ManagementReportingContentProps {
  slaYear: number;
  averageSlaPercentage: number | null;
  slaCompletedByMonth: number[];
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  slaLoading: boolean;
  slaError: string | null;
  nowYear: number;
  nowMonth: number;
}

/* ─── Утилиты ──────────────────────────────────────────────────────────── */

const USD_TO_UZS_RATE = 12000;

/** Целевой % выполнения SLA в блоке «Управленческая отчётность». */
const MANAGEMENT_REPORTING_SLA_TARGET_PERCENT = 80;

function formatAmount(value: number, currency: 'UZS' | 'USD' = 'UZS'): string {
  const v = currency === 'USD' ? value / USD_TO_UZS_RATE : value;
  const suffix = currency === 'USD' ? ' $' : '';
  if (v === 0) return '0' + suffix;
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' млрд' + suffix;
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн' + suffix;
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + ' тыс' + suffix;
  return v.toFixed(0) + suffix;
}

function formatStat(val: number | null): string {
  return val != null ? val.toFixed(1) : '—';
}

/** Компактная подпись цели справа от заголовка KPI */
function KpiTargetChip({
  children,
  valueClassName = 'text-indigo-900',
  valueBackgroundClassName = 'bg-transparent border-transparent',
}: {
  children: ReactNode;
  valueClassName?: string;
  valueBackgroundClassName?: string;
}) {
  return (
    <div
      className="rounded-lg border border-indigo-300 bg-indigo-100 px-1.5 py-0.5 text-[11px] shrink-0 max-w-[min(100%,13rem)] text-indigo-800 shadow-sm font-semibold"
      role="note"
      aria-label="Целевой показатель"
    >
      <span className="font-semibold uppercase tracking-wide text-slate-700">Цель:</span>{' '}
      <span className={`inline-flex items-center rounded-md px-1 py-[1px] font-semibold border ${valueBackgroundClassName} ${valueClassName}`}>
        {children}
      </span>
    </div>
  );
}

function renderStarsSummary(rating: number | null, size: 'sm' | 'lg' = 'sm') {
  if (rating == null) return null;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const px = size === 'lg' ? 'w-5 h-5' : 'w-3 h-3';
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} className={`${px} text-amber-400 fill-amber-400`} />);
    } else if (i === full && hasHalf) {
      stars.push(
        <div key={i} className={`relative ${px}`}>
          <Star className={`${px} text-gray-300`} />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className={`${px} text-amber-400 fill-amber-400`} />
          </div>
        </div>
      );
    } else {
      stars.push(<Star key={i} className={`${px} text-gray-300`} />);
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

/* ─── Компонент ────────────────────────────────────────────────────────── */

export function ManagementReportingContent({
  slaYear,
  averageSlaPercentage,
  slaCompletedByMonth,
  slaPercentageByMonth,
  slaLoading,
  slaError,
  nowYear,
  nowMonth,
}: ManagementReportingContentProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  /* Переключатель дизайна */
  const [useNewDesign, setUseNewDesign] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mr_new_design') === '1';
    }
    return false;
  });

  const toggleDesign = () => {
    setUseNewDesign(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') localStorage.setItem('mr_new_design', next ? '1' : '0');
      return next;
    });
  };

  /* CSI статистика */
  const [csiStats, setCsiStats] = useState<CsiStats | null>(null);
  const [csiLoading, setCsiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCsiLoading(true);
      try {
        const res = await fetch(`${getBackendUrl()}/api/csi-feedback/stats?year=${currentYear}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setCsiStats({
          year: data.year,
          count: data.count ?? 0,
          avgSpeed: data.avgSpeed ?? null,
          avgQuality: data.avgQuality ?? null,
          avgSatisfaction: data.avgSatisfaction ?? null,
          avgUzproc: data.avgUzproc ?? null,
          avgOverall: data.avgOverall ?? null,
        });
      } catch {
        if (!cancelled) setCsiStats(null);
      } finally {
        if (!cancelled) setCsiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentYear]);

  /* Savings данные */
  const savings = useOverviewSavingsData(currentYear);
  const currency: 'USD' = 'USD';

  /* PDF экспорт */
  const { page1Ref, page2Ref } = useManagementReportingPdf();

  if (useNewDesign) {
    return (
      <div style={{ position: 'relative' }}>
        {/* Переключатель в правом верхнем углу */}
        <button
          onClick={toggleDesign}
          style={{
            position: 'absolute', top: 16, right: 40, zIndex: 10,
            padding: '5px 12px', fontSize: 11, fontWeight: 500,
            background: 'oklch(0.18 0.005 80)', color: '#fff',
            border: 'none', borderRadius: 999, cursor: 'pointer',
            fontFamily: `'Inter Tight', 'Inter', system-ui, sans-serif`,
            letterSpacing: 0.2,
          }}
        >
          ← Старый дизайн
        </button>
        <ManagementReportingNew
          slaYear={slaYear}
          averageSlaPercentage={averageSlaPercentage}
          slaCompletedByMonth={slaCompletedByMonth}
          slaPercentageByMonth={slaPercentageByMonth}
          slaLoading={slaLoading}
          slaError={slaError}
        />
      </div>
    );
  }

  return (
    <div id="mr-print-root" className="p-1 flex flex-col gap-1.5">
      {/* Переключатель дизайна */}
      <div className="flex justify-end mb-1">
        <button
          onClick={toggleDesign}
          className="px-3 py-1 text-xs font-medium rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Новый дизайн →
        </button>
      </div>
      {/* ═══ Страница 1 PDF: показатели ═══ */}
      <div ref={page1Ref} className="bg-slate-50 rounded-lg mr-print-page1">
        <div className="mr-page1-layout">
          {/* Верхний ряд: Экономия слева, CSI справа */}
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: '58% 42%', alignItems: 'stretch' }}
          >
            {/* ── Экономия ── */}
            <div className="bg-white rounded border-2 border-gray-300 shadow px-2 py-1.5 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-700 shrink-0">Экономия — {currentYear}</span>
                  <KpiTargetChip
                    valueClassName="text-slate-700"
                    valueBackgroundClassName="bg-transparent border-transparent"
                  >
                    10% от бюджета закупок
                  </KpiTargetChip>
                  {savings.data && !savings.loading && (
                    <span className={`rounded-lg px-1.5 py-0.5 text-[11px] font-semibold shadow-sm border ${
                      savings.data.totalBudget > 0 && (savings.data.totalSavings / savings.data.totalBudget) * 100 >= 10
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-red-100 border-red-300 text-red-800'
                    }`}>
                      ФАКТ: {savings.data.totalBudget > 0 ? ((savings.data.totalSavings / savings.data.totalBudget) * 100).toFixed(1) + '%' : '—'}
                    </span>
                  )}
                </div>
              </div>

              {savings.loading && (
                <div className="text-center text-xs text-gray-500 py-2">Загрузка...</div>
              )}
              {savings.error && (
                <div className="text-center text-xs text-red-500 py-2">{savings.error}</div>
              )}

              {savings.data && !savings.loading && (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Итоговые карточки */}
                  <div className="flex gap-1 mb-1 shrink-0 flex-nowrap items-stretch">
                    <div className="bg-slate-500 rounded-xl shadow px-2 py-1 shrink-0">
                      <div className="text-[10px] text-slate-200 uppercase tracking-wider">Бюджет закупок</div>
                      <div className="text-sm font-bold text-white">{formatAmount(savings.data.totalBudget, currency)}</div>
                      <div className="text-[10px] text-slate-200">{savings.data.totalBudgetCount} закупок</div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm px-1.5 py-1 shrink-0">
                      <div className="text-[10px] text-gray-700 uppercase tracking-wider">% экономии</div>
                      <div className="text-sm font-bold text-gray-900">
                        {savings.data.totalBudget > 0 ? ((savings.data.totalSavings / savings.data.totalBudget) * 100).toFixed(1) + '%' : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Формула экономии */}
                  <div className="mt-1 shrink-0 flex items-stretch gap-1 flex-nowrap">
                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm px-2 py-1 shrink-0">
                      <div className="text-[10px] text-gray-700 uppercase tracking-wider font-semibold">Общая экономия</div>
                      <div className="text-sm font-bold text-gray-900 tabular-nums">{formatAmount(savings.data.totalSavings, currency)}</div>
                      <div className="text-[10px] text-gray-600">{savings.data.totalCount} закупок</div>
                    </div>

                    <div className="flex items-center justify-center px-1 text-sm font-bold text-gray-500 select-none shrink-0" aria-hidden>
                      =
                    </div>

                    <div className="rounded-xl bg-white border border-blue-200/70 shadow-sm px-2 py-1 shrink-0">
                      <div className="text-[10px] text-gray-700 uppercase tracking-wider">От медианы</div>
                      <div className="text-sm font-bold text-gray-900 tabular-nums">{formatAmount(savings.data.savingsFromMedian, currency)}</div>
                      <div className="text-[10px] text-gray-600">{savings.data.fromMedianCount} закупок</div>
                    </div>

                    <div className="flex items-center justify-center px-1 text-sm font-bold text-gray-500 select-none shrink-0" aria-hidden>
                      +
                    </div>

                    <div className="rounded-xl bg-white border border-green-200/70 shadow-sm px-2 py-1 shrink-0">
                      <div className="text-[10px] text-gray-700 uppercase tracking-wider">От сущ. договора</div>
                      <div className="text-sm font-bold text-gray-900 tabular-nums">{formatAmount(savings.data.savingsFromExistingContract, currency)}</div>
                      <div className="text-[10px] text-gray-600">{savings.data.fromExistingContractCount} закупок</div>
                    </div>

                    <div className="flex items-center justify-center px-1 text-sm font-bold text-gray-500 select-none shrink-0" aria-hidden>
                      +
                    </div>

                    <div className="rounded-xl bg-white border border-gray-200 shadow-sm px-2 py-1 shrink-0">
                      <div className="text-[10px] text-gray-700 uppercase tracking-wider">Комбинированный</div>
                      <div className="text-sm font-bold text-gray-900 tabular-nums">{formatAmount(savings.data.savingsUntyped, currency)}</div>
                      <div className="text-[10px] text-gray-600">{savings.data.untypedCount} закупок</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── CSI (оценки) ── */}
            <div className="bg-white rounded border-2 border-gray-300 shadow px-2 py-1.5">
              <div className="flex items-center gap-1 mb-1 min-w-0">
                <span className="text-xs font-semibold text-gray-700 shrink-0">CSI — {currentYear}</span>
                <KpiTargetChip
                  valueClassName="text-slate-700"
                  valueBackgroundClassName="bg-transparent border-transparent"
                >
                  <span className="inline-flex items-center gap-1">
                    <span className="tabular-nums">4</span>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden />
                  </span>
                </KpiTargetChip>
                {!csiLoading && csiStats && (
                  <span className={`rounded-lg px-1.5 py-0.5 text-[11px] font-semibold shadow-sm border ${
                    csiStats.avgOverall != null && csiStats.avgOverall >= 4
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-red-100 border-red-300 text-red-800'
                  }`}>
                    ФАКТ: <span className="inline-flex items-center gap-0.5">{csiStats.avgOverall != null ? formatStat(csiStats.avgOverall) : '—'}<Star className="w-3 h-3 text-amber-500 fill-amber-500" /></span>
                  </span>
                )}
              </div>
              {csiLoading ? (
                <p className="text-xs text-gray-500">Загрузка…</p>
              ) : csiStats ? (
                <div className="p-1.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm">
                  <div className="flex flex-wrap items-stretch gap-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/80 border border-amber-200/60 shrink-0">
                      <span className="text-xs font-medium text-gray-600">Оценок:</span>
                      <span className="text-base font-bold text-gray-900 tabular-nums">{csiStats.count}</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/80 border border-amber-200/60 shrink-0">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-600">Средняя</span>
                        <div className="flex items-center gap-1">
                          {renderStarsSummary(csiStats.avgOverall, 'lg')}
                          <span className="text-base font-bold text-gray-900 tabular-nums">
                            {formatStat(csiStats.avgOverall)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <div className="flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded-lg bg-white/80 border border-amber-200/60 min-w-[120px]">
                        <span className="text-[10px] font-medium text-gray-700 shrink-0">Скорость</span>
                        <div className="flex items-center gap-1">
                          {renderStarsSummary(csiStats.avgSpeed, 'sm')}
                          <span className="text-[10px] text-gray-600 tabular-nums w-6">{formatStat(csiStats.avgSpeed)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded-lg bg-white/80 border border-amber-200/60 min-w-[120px]">
                        <span className="text-[10px] font-medium text-gray-700 shrink-0">Качество</span>
                        <div className="flex items-center gap-1">
                          {renderStarsSummary(csiStats.avgQuality, 'sm')}
                          <span className="text-[10px] text-gray-600 tabular-nums w-6">{formatStat(csiStats.avgQuality)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded-lg bg-white/80 border border-amber-200/60 min-w-[120px]">
                        <span className="text-[10px] font-medium text-gray-700 shrink-0">Закупщик</span>
                        <div className="flex items-center gap-1">
                          {renderStarsSummary(csiStats.avgSatisfaction, 'sm')}
                          <span className="text-[10px] text-gray-600 tabular-nums w-6">{formatStat(csiStats.avgSatisfaction)}</span>
                        </div>
                      </div>
                      {csiStats.avgUzproc != null && (
                        <div className="flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded-lg bg-white/80 border border-amber-200/60 min-w-[120px]">
                          <span className="text-[10px] font-medium text-gray-700 shrink-0">Узпрок</span>
                          <div className="flex items-center gap-1">
                            {renderStarsSummary(csiStats.avgUzproc, 'sm')}
                            <span className="text-[10px] text-gray-600 tabular-nums w-6">{formatStat(csiStats.avgUzproc)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Нет данных</p>
              )}
            </div>
          </div>

          {/* Нижний ряд: SLA под экономией и оценками */}
          <div className="bg-white rounded border-2 border-gray-300 shadow px-2 py-1.5 mt-1.5">
            <div className="flex items-center gap-1 mb-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-semibold text-gray-700 shrink-0">SLA — {slaYear}</span>
                <KpiTargetChip
                  valueClassName="text-slate-700"
                  valueBackgroundClassName="bg-transparent border-transparent"
                >
                  {MANAGEMENT_REPORTING_SLA_TARGET_PERCENT}%
                </KpiTargetChip>
                {!slaLoading && averageSlaPercentage != null && (
                  <span className={`rounded-lg px-1.5 py-0.5 text-[11px] font-semibold shadow-sm border ${
                    averageSlaPercentage >= MANAGEMENT_REPORTING_SLA_TARGET_PERCENT
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-red-100 border-red-300 text-red-800'
                  }`}>
                    ФАКТ: {Math.round(averageSlaPercentage)}%
                  </span>
                )}
                {slaLoading ? (
                  <span className="text-xs text-gray-400">Загрузка…</span>
                ) : slaError ? (
                  <span className="text-xs text-red-500">{slaError}</span>
                ) : null}
              </div>
            </div>
            <div className="min-w-0 h-[190px] flex overflow-hidden" style={{ position: 'relative' }}>
              <SlaCombinedChart
                year={slaYear}
                countsByMonth={slaCompletedByMonth}
                currentYear={nowYear}
                currentMonth={nowMonth}
                slaPercentageByMonth={slaPercentageByMonth}
                loading={slaLoading}
                error={slaError}
                averageSlaPercentage={averageSlaPercentage}
                hideForecast
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Страница 2 PDF: сетка оценок ═══ */}
      <div ref={page2Ref} className="bg-white rounded-lg border-2 border-gray-300 p-2 mr-print-page2">
        <div className="text-xs font-semibold text-gray-700 mb-1.5">
          Последние оценки CSI — {currentYear}
        </div>
        <ManagementReportingFeedbackGrid year={currentYear} />
      </div>
    </div>
  );
}
