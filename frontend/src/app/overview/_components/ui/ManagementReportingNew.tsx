'use client';

import { useState, useEffect, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import { useOverviewSavingsData } from '../hooks/useOverviewSavingsData';
import { ManagementReportingNewHeroKpis } from './ManagementReportingNewHeroKpis';
import { ManagementReportingNewSlaChart } from './ManagementReportingNewSlaChart';
import { ManagementReportingNewCsiGrid } from './ManagementReportingNewCsiGrid';
import type { OverviewSlaPercentageByMonth } from '../hooks/useOverviewSlaData';

/* ─── Design tokens ────────────────────────────────────────────────────── */
const T = {
  bg: 'oklch(0.985 0.003 80)',
  text: 'oklch(0.18 0.005 80)',
  muted: 'oklch(0.50 0.005 80)',
  faint: 'oklch(0.72 0.005 80)',
  line: 'oklch(0.92 0.004 80)',
};
const font = `'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
const mono = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`;

/* ─── Types ────────────────────────────────────────────────────────────── */
interface CsiStats {
  count: number;
  avgSpeed: number | null;
  avgQuality: number | null;
  avgSatisfaction: number | null;
  avgUzproc: number | null;
  avgOverall: number | null;
}

export interface ManagementReportingNewProps {
  slaYear: number;
  averageSlaPercentage: number | null;
  slaCompletedByMonth: number[];
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  slaLoading: boolean;
  slaError: string | null;
}

/* ─── TopBar ───────────────────────────────────────────────────────────── */
function TopBar({ year, onExport }: { year: number; onExport?: () => void }) {
  const [period, setPeriod] = useState<'year' | 'quarter' | 'month'>('year');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 40px', borderBottom: `1px solid ${T.line}`, fontFamily: font,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3, color: T.text }}>
          Дашборд закупок
        </div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: mono }}>{year}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(['year', 'quarter', 'month'] as const).map((p, i) => {
          const labels = ['Год', 'Квартал', 'Месяц'];
          const active = period === p;
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 500,
                background: active ? T.text : 'transparent',
                color: active ? T.bg : T.muted,
                border: `1px solid ${active ? T.text : T.line}`,
                borderRadius: 999, cursor: 'pointer', fontFamily: font,
              }}
            >
              {labels[i]}
            </button>
          );
        })}
        <div style={{ width: 1, height: 20, background: T.line, margin: '0 8px' }} />
        <button
          onClick={onExport}
          style={{
            padding: '6px 14px', fontSize: 12, color: T.muted,
            background: 'transparent', border: `1px solid ${T.line}`,
            borderRadius: 999, cursor: 'pointer', fontFamily: font,
          }}
        >
          Экспорт
        </button>
      </div>
    </div>
  );
}

/* ─── SLA section header ───────────────────────────────────────────────── */
function SlaChartSection({
  slaCompletedByMonth,
  slaPercentageByMonth,
  averageSlaPercentage,
  loading,
  error,
}: {
  slaCompletedByMonth: number[];
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  averageSlaPercentage: number | null;
  loading: boolean;
  error: string | null;
}) {
  const totalCompleted = slaCompletedByMonth.reduce((a, b) => a + (b || 0), 0);

  return (
    <div style={{ padding: '32px 40px', borderBottom: `1px solid ${T.line}`, fontFamily: font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <div>
          <div style={{
            fontSize: 11, color: T.muted, letterSpacing: 0.8,
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            SLA по месяцам
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.text }}>
            {loading ? 'Загрузка…' : error ? error : (
              <>
                {totalCompleted} завершённых закупок
                {averageSlaPercentage != null && ` · средний SLA ${Math.round(averageSlaPercentage)}%`}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.muted, alignItems: 'center', fontFamily: mono }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, background: T.text }} />
            Завершённые закупки
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 1, background: T.text }} />
            Уложились в SLA, %
          </div>
        </div>
      </div>
      {!loading && !error && (
        <ManagementReportingNewSlaChart
          countsByMonth={slaCompletedByMonth}
          slaPercentageByMonth={slaPercentageByMonth}
          slaTarget={80}
        />
      )}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
export function ManagementReportingNew({
  slaYear,
  averageSlaPercentage,
  slaCompletedByMonth,
  slaPercentageByMonth,
  slaLoading,
  slaError,
}: ManagementReportingNewProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  /* CSI stats */
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

  /* Savings data */
  const savings = useOverviewSavingsData(currentYear);

  const handleExport = () => window.print();

  return (
    <div style={{ background: '#ffffff', color: T.text, fontFamily: font, minHeight: '100%' }}>
      <TopBar year={slaYear || currentYear} onExport={handleExport} />
      <ManagementReportingNewHeroKpis
        csiStats={csiStats}
        csiLoading={csiLoading}
        savingsData={savings.data}
        savingsLoading={savings.loading}
        averageSlaPercentage={averageSlaPercentage}
        slaCompletedByMonth={slaCompletedByMonth}
        slaPercentageByMonth={slaPercentageByMonth}
        slaLoading={slaLoading}
      />
      <SlaChartSection
        slaCompletedByMonth={slaCompletedByMonth}
        slaPercentageByMonth={slaPercentageByMonth}
        averageSlaPercentage={averageSlaPercentage}
        loading={slaLoading}
        error={slaError}
      />
      <ManagementReportingNewCsiGrid year={currentYear} />
    </div>
  );
}
