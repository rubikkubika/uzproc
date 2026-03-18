'use client';

import { useState, useEffect, useMemo } from 'react';
import { Star } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import { SlaCombinedChart } from './SlaCombinedChart';
import { SavingsByCfoChart } from './SavingsByCfoChart';
import { useOverviewSavingsData } from '../hooks/useOverviewSavingsData';
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

  /* CSI данные */
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
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const savings = useOverviewSavingsData(currentYear);

  return (
    <div className="p-1">
      <div className="flex gap-1.5 relative">
        {/* ── Левая колонка: Экономия (привязана к высоте правой) ── */}
        <div className="absolute top-0 bottom-0 left-0 bg-white rounded shadow px-2 py-1.5 flex flex-col overflow-hidden" style={{ width: 'calc(50% - 3px)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-700">Экономия — {currentYear}</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCurrency('UZS')}
                className={`px-1.5 py-0.5 text-xs border rounded transition-colors ${
                  currency === 'UZS'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                UZS
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-1.5 py-0.5 text-xs border rounded transition-colors ${
                  currency === 'USD'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                USD
              </button>
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
              <div className="flex flex-wrap gap-1 mb-1 shrink-0">
                <div className="bg-slate-500 rounded-xl shadow px-2 py-1.5 min-w-[120px]">
                  <div className="text-[10px] text-slate-200 uppercase tracking-wider">Бюджет закупок</div>
                  <div className="text-sm font-bold text-white">{formatAmount(savings.data.totalBudget, currency)}</div>
                  <div className="text-[10px] text-slate-200">{savings.data.totalBudgetCount} закупок</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm px-2 py-1.5 min-w-[120px]">
                  <div className="text-[10px] text-gray-700 uppercase tracking-wider">% экономии</div>
                  <div className="text-sm font-bold text-gray-900">
                    {savings.data.totalBudget > 0 ? ((savings.data.totalSavings / savings.data.totalBudget) * 100).toFixed(1) + '%' : '—'}
                  </div>
                  <div className="text-[10px] text-gray-600">от бюджета</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm px-2 py-1.5 min-w-[120px]">
                  <div className="text-[10px] text-gray-700 uppercase tracking-wider font-semibold">Общая экономия</div>
                  <div className="text-sm font-bold text-gray-900">{formatAmount(savings.data.totalSavings, currency)}</div>
                  <div className="text-[10px] text-gray-600">{savings.data.totalCount} закупок</div>
                </div>
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-1 flex gap-1 flex-nowrap min-w-0">
                  <div className="bg-white rounded shadow px-1.5 py-1.5 flex-1 min-w-0 border-l-2 border-blue-400">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">От медианы</div>
                    <div className="text-sm font-bold text-blue-600 truncate">{formatAmount(savings.data.savingsFromMedian, currency)}</div>
                    <div className="text-[10px] text-gray-400 truncate">{savings.data.fromMedianCount} закупок</div>
                  </div>
                  <div className="flex items-center text-gray-600 text-lg font-bold shrink-0">+</div>
                  <div className="bg-white rounded shadow px-1.5 py-1.5 flex-1 min-w-0 border-l-2 border-green-400">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">От сущ. договора</div>
                    <div className="text-sm font-bold text-green-600 truncate">{formatAmount(savings.data.savingsFromExistingContract, currency)}</div>
                    <div className="text-[10px] text-gray-400 truncate">{savings.data.fromExistingContractCount} закупок</div>
                  </div>
                  <div className="flex items-center text-gray-600 text-lg font-bold shrink-0">+</div>
                  <div className="bg-white rounded shadow px-1.5 py-1.5 flex-1 min-w-0 border-l-2 border-gray-400">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">Без типа</div>
                    <div className="text-sm font-bold text-gray-600 truncate">{formatAmount(savings.data.savingsUntyped, currency)}</div>
                    <div className="text-[10px] text-gray-400 truncate">{savings.data.untypedCount} закупок</div>
                  </div>
                </div>
              </div>

              {/* Диаграмма по ЦФО */}
              <div className="flex-1 min-h-0">
                <SavingsByCfoChart data={savings.data.byCfo} year={currentYear} currency={currency} />
              </div>
            </div>
          )}
        </div>

        {/* ── Правая колонка: SLA сверху, CSI снизу (задаёт высоту контейнера) ── */}
        <div className="min-w-0 flex flex-col gap-1.5" style={{ marginLeft: 'calc(50% + 3px)', width: 'calc(50% - 3px)' }}>
          {/* SLA */}
          <div className="bg-white rounded shadow px-2 py-1.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-700">SLA — {slaYear}</span>
              {slaLoading ? (
                <span className="text-xs text-gray-400">Загрузка…</span>
              ) : slaError ? (
                <span className="text-xs text-red-500">{slaError}</span>
              ) : (
                <span className="text-sm font-bold text-gray-900">
                  {averageSlaPercentage != null ? `${Math.round(averageSlaPercentage)}%` : '—'}
                </span>
              )}
            </div>
            <div className="min-w-0 h-[180px] flex overflow-hidden" style={{ position: 'relative' }}>
              <SlaCombinedChart
                year={slaYear}
                countsByMonth={slaCompletedByMonth}
                currentYear={nowYear}
                currentMonth={nowMonth}
                slaPercentageByMonth={slaPercentageByMonth}
                loading={slaLoading}
                error={slaError}
                hideForecast
              />
            </div>
          </div>

          {/* CSI */}
          <div className="bg-white rounded shadow px-2 py-1.5">
            <div className="text-xs font-semibold text-gray-700 mb-1">CSI — {currentYear}</div>
            {csiLoading ? (
              <p className="text-xs text-gray-500">Загрузка…</p>
            ) : csiStats ? (
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm">
                <div className="flex flex-wrap items-stretch gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/80 border border-amber-200/60 shrink-0">
                    <span className="text-xs font-medium text-gray-600">Оценок за год:</span>
                    <span className="text-base font-bold text-gray-900 tabular-nums">{csiStats.count}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-amber-200/60 shrink-0">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-600 mb-0">Средняя оценка</span>
                      <div className="flex items-center gap-1.5">
                        {renderStarsSummary(csiStats.avgOverall, 'lg')}
                        <span className="text-lg font-bold text-gray-900 tabular-nums">
                          {formatStat(csiStats.avgOverall)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/80 border border-amber-200/60 min-w-[130px]">
                      <span className="text-xs font-medium text-gray-700 shrink-0">Скорость</span>
                      <div className="flex items-center gap-1.5">
                        {renderStarsSummary(csiStats.avgSpeed, 'sm')}
                        <span className="text-xs text-gray-600 tabular-nums w-7">{formatStat(csiStats.avgSpeed)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/80 border border-amber-200/60 min-w-[130px]">
                      <span className="text-xs font-medium text-gray-700 shrink-0">Качество</span>
                      <div className="flex items-center gap-1.5">
                        {renderStarsSummary(csiStats.avgQuality, 'sm')}
                        <span className="text-xs text-gray-600 tabular-nums w-7">{formatStat(csiStats.avgQuality)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/80 border border-amber-200/60 min-w-[130px]">
                      <span className="text-xs font-medium text-gray-700 shrink-0">Закупщик</span>
                      <div className="flex items-center gap-1.5">
                        {renderStarsSummary(csiStats.avgSatisfaction, 'sm')}
                        <span className="text-xs text-gray-600 tabular-nums w-7">{formatStat(csiStats.avgSatisfaction)}</span>
                      </div>
                    </div>
                    {csiStats.avgUzproc != null && (
                      <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/80 border border-amber-200/60 min-w-[130px]">
                        <span className="text-xs font-medium text-gray-700 shrink-0">Узпрок</span>
                        <div className="flex items-center gap-1.5">
                          {renderStarsSummary(csiStats.avgUzproc, 'sm')}
                          <span className="text-xs text-gray-600 tabular-nums w-7">{formatStat(csiStats.avgUzproc)}</span>
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
      </div>
    </div>
  );
}
