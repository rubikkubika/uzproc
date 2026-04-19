'use client';

import type { ReactNode } from 'react';
import type { SavingsData } from '../hooks/useOverviewSavingsData';
import type { OverviewSlaPercentageByMonth } from '../hooks/useOverviewSlaData';

/* ─── Design tokens ────────────────────────────────────────────────────── */
const T = {
  bg: 'oklch(0.985 0.003 80)',
  text: 'oklch(0.18 0.005 80)',
  muted: 'oklch(0.50 0.005 80)',
  faint: 'oklch(0.72 0.005 80)',
  line: 'oklch(0.92 0.004 80)',
  accent: 'oklch(0.72 0.15 65)',
  success: 'oklch(0.68 0.13 150)',
  warn: 'oklch(0.72 0.16 50)',
  danger: 'oklch(0.65 0.20 25)',
};
const font = `'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
const mono = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`;

const USD_RATE = 12000;

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function fmtUsd(value: number): string {
  const v = value / USD_RATE;
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн $';
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + ' тыс $';
  return v.toFixed(0) + ' $';
}

function fmtStat(v: number | null) {
  return v != null ? v.toFixed(1) : '—';
}

/* ─── TargetFactRow ────────────────────────────────────────────────────── */
function TargetFactRow({ target, fact, above }: { target: string; fact: string; above: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 12, fontFamily: mono, fontSize: 11 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 8px 3px 6px',
        background: T.bg, border: `1px solid ${T.line}`, borderRadius: 4,
      }}>
        <span style={{ fontSize: 9, color: T.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>цель</span>
        <span style={{ color: T.text, fontWeight: 600 }}>{target}</span>
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 8px 3px 6px',
        background: above ? 'oklch(0.96 0.05 150)' : 'oklch(0.96 0.05 30)',
        border: `1px solid ${above ? 'oklch(0.88 0.08 150)' : 'oklch(0.88 0.08 30)'}`,
        borderRadius: 4,
      }}>
        <span style={{
          fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase',
          color: above ? 'oklch(0.45 0.12 150)' : 'oklch(0.45 0.15 30)',
        }}>факт</span>
        <span style={{ color: above ? 'oklch(0.35 0.12 150)' : 'oklch(0.35 0.15 30)', fontWeight: 700 }}>{fact}</span>
        <span style={{ fontSize: 10, color: above ? T.success : T.danger }}>{above ? '↑' : '↓'}</span>
      </div>
    </div>
  );
}

/* ─── KPIBlock ─────────────────────────────────────────────────────────── */
interface KpiBlockProps {
  label: string;
  value: string;
  unit: string;
  target: string;
  fact: string;
  above: boolean;
  accentColor?: boolean;
  children?: ReactNode;
  topRight?: ReactNode;
}

function KpiBlock({ label, value, unit, target, fact, above, accentColor, children, topRight }: KpiBlockProps) {
  return (
    <div style={{ flex: 1, padding: '32px 40px', position: 'relative', fontFamily: font }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: T.muted,
        letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{
          fontSize: 56, fontWeight: 500, letterSpacing: -2.4, lineHeight: 1,
          color: accentColor ? T.accent : T.text, fontFamily: font,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 16, color: T.muted, fontWeight: 400 }}>{unit}</div>
      </div>
      <TargetFactRow target={target} fact={fact} above={above} />
      {topRight && (
        <div style={{ position: 'absolute', top: 36, right: 40 }}>
          {topRight}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Types ────────────────────────────────────────────────────────────── */
interface CsiStats {
  count: number;
  avgSpeed: number | null;
  avgQuality: number | null;
  avgSatisfaction: number | null;
  avgUzproc: number | null;
  avgOverall: number | null;
}

export interface ManagementReportingNewHeroKpisProps {
  csiStats: CsiStats | null;
  csiLoading: boolean;
  savingsData: SavingsData | null;
  savingsLoading: boolean;
  averageSlaPercentage: number | null;
  slaCompletedByMonth: number[];
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  slaLoading: boolean;
}

/* ─── CSI block ────────────────────────────────────────────────────────── */
function CsiBlockContent({ stats }: { stats: CsiStats }) {
  const metrics = [
    { label: 'Скорость', value: stats.avgSpeed },
    { label: 'Качество', value: stats.avgQuality },
    { label: 'Закупщик', value: stats.avgSatisfaction },
    { label: 'Узпрок', value: stats.avgUzproc },
  ].filter(m => m.value != null) as { label: string; value: number }[];

  return (
    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {metrics.map(m => (
        <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 3, background: T.line, borderRadius: 2, position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: 0, width: `${(m.value / 5) * 100}%`,
              background: T.accent, borderRadius: 2,
            }} />
          </div>
          <div style={{ fontSize: 11, color: T.muted, minWidth: 70, fontFamily: font }}>{m.label}</div>
          <div style={{ fontSize: 11, color: T.text, fontFamily: mono, fontWeight: 500, minWidth: 24, textAlign: 'right' }}>
            {m.value.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Economy block ────────────────────────────────────────────────────── */
function EconomyBlockContent({ data }: { data: SavingsData }) {
  const breakdown = [
    { label: 'от медианы', value: data.savingsFromMedian },
    { label: 'от сущ. договора', value: data.savingsFromExistingContract },
    { label: 'комб.', value: data.savingsUntyped },
  ];
  return (
    <>
      <div style={{ marginTop: 24, display: 'flex', gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Бюджет закупок</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.text, fontFamily: font, fontVariantNumeric: 'tabular-nums' }}>
            {fmtUsd(data.totalBudget)}{' '}
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>({data.totalBudgetCount} зак.)</span>
          </div>
        </div>
        <div style={{ width: 1, background: T.line }} />
        <div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Общая экономия</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.text, fontFamily: font, fontVariantNumeric: 'tabular-nums' }}>
            {fmtUsd(data.totalSavings)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 4, alignItems: 'baseline', fontSize: 10, color: T.faint, fontFamily: mono, flexWrap: 'wrap' }}>
        {breakdown.map((b, i) => (
          <span key={b.label}>
            {i > 0 && <span style={{ margin: '0 2px' }}>+</span>}
            <span>{fmtUsd(b.value)} {b.label}</span>
          </span>
        ))}
      </div>
    </>
  );
}

/* ─── SLA block ────────────────────────────────────────────────────────── */
function SlaBlockContent({ completedByMonth, percentageByMonth }: {
  completedByMonth: number[];
  percentageByMonth: OverviewSlaPercentageByMonth[];
}) {
  const total = completedByMonth.reduce((a, b) => a + (b || 0), 0);
  const metSla = percentageByMonth.reduce((a, m) => a + m.metSla, 0);

  return (
    <div style={{ marginTop: 24, display: 'flex', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Завершено закупок</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: T.text, fontFamily: font, fontVariantNumeric: 'tabular-nums' }}>
          {total}
        </div>
      </div>
      <div style={{ width: 1, background: T.line }} />
      <div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Уложились в срок</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: T.text, fontFamily: font, fontVariantNumeric: 'tabular-nums' }}>
          {metSla} <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>закупок</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main HeroKPIs component ──────────────────────────────────────────── */
export function ManagementReportingNewHeroKpis({
  csiStats,
  csiLoading,
  savingsData,
  savingsLoading,
  averageSlaPercentage,
  slaCompletedByMonth,
  slaPercentageByMonth,
  slaLoading,
}: ManagementReportingNewHeroKpisProps) {
  const economyPct = savingsData && savingsData.totalBudget > 0
    ? (savingsData.totalSavings / savingsData.totalBudget) * 100
    : null;

  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, fontFamily: font }}>
      {/* CSI */}
      <KpiBlock
        label="CSI — Качество"
        value={csiLoading ? '…' : fmtStat(csiStats?.avgOverall ?? null)}
        unit="/ 5.0"
        target="4.0"
        fact={csiLoading ? '…' : fmtStat(csiStats?.avgOverall ?? null)}
        above={(csiStats?.avgOverall ?? 0) >= 4}
        accentColor
        topRight={
          <div style={{ fontSize: 11, color: T.faint, fontFamily: mono }}>
            {csiStats?.count ?? 0} оценок
          </div>
        }
      >
        {csiStats && <CsiBlockContent stats={csiStats} />}
      </KpiBlock>

      <div style={{ width: 1, background: T.line }} />

      {/* Economy */}
      <KpiBlock
        label="Экономия"
        value={savingsLoading ? '…' : economyPct != null ? economyPct.toFixed(1) : '—'}
        unit="%"
        target="10%"
        fact={economyPct != null ? `${economyPct.toFixed(1)}%` : '—'}
        above={(economyPct ?? 0) >= 10}
      >
        {savingsData && !savingsLoading && <EconomyBlockContent data={savingsData} />}
      </KpiBlock>

      <div style={{ width: 1, background: T.line }} />

      {/* SLA */}
      <KpiBlock
        label="SLA — Сроки"
        value={slaLoading ? '…' : averageSlaPercentage != null ? Math.round(averageSlaPercentage).toString() : '—'}
        unit="%"
        target="80%"
        fact={averageSlaPercentage != null ? `${Math.round(averageSlaPercentage)}%` : '—'}
        above={(averageSlaPercentage ?? 0) >= 80}
      >
        {!slaLoading && (
          <SlaBlockContent
            completedByMonth={slaCompletedByMonth}
            percentageByMonth={slaPercentageByMonth}
          />
        )}
      </KpiBlock>
    </div>
  );
}
