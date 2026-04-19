'use client';

import type { OverviewSlaPercentageByMonth } from '../hooks/useOverviewSlaData';

const T = {
  bg: 'oklch(0.985 0.003 80)',
  text: 'oklch(0.18 0.005 80)',
  muted: 'oklch(0.50 0.005 80)',
  faint: 'oklch(0.72 0.005 80)',
  line: 'oklch(0.92 0.004 80)',
  accent: 'oklch(0.72 0.15 65)',
};

const mono = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`;
const font = `'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface Props {
  countsByMonth: number[];
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  slaTarget?: number;
}

export function ManagementReportingNewSlaChart({
  countsByMonth,
  slaPercentageByMonth,
  slaTarget = 80,
}: Props) {
  const w = 1000;
  const h = 260;
  const padL = 40;
  const padR = 20;
  const padT = 44;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const colW = innerW / 12;

  // Vertical split: top 38% for SLA line, bottom 62% for bars, 18px gap between
  const slaH = innerH * 0.38;
  const barsH = innerH - slaH - 18;
  const barsBottom = padT + innerH;

  const maxCount = Math.max(...countsByMonth.map(c => c || 0), 1);

  // SLA lookup by month number (1–12)
  const slaByMonth = new Map(slaPercentageByMonth.map(m => [m.month, m]));

  // SLA Y scale: 70–100% range mapped to top band
  const slaYFor = (pct: number) =>
    padT + slaH - ((pct - 70) / 30) * (slaH - 20) - 4;

  const slaPoints = MONTHS.map((_, i) => {
    const m = slaByMonth.get(i + 1);
    if (!m || m.percentage === null || m.totalCompleted === 0) return null;
    return { x: padL + i * colW + colW / 2, y: slaYFor(m.percentage), pct: Math.round(m.percentage) };
  }).filter(Boolean) as { x: number; y: number; pct: number }[];

  const targetY = slaYFor(slaTarget);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* Bar axis ticks */}
      {[0, 0.5, 1].map(t => (
        <g key={t}>
          <line
            x1={padL} x2={w - padR}
            y1={barsBottom - barsH * t} y2={barsBottom - barsH * t}
            stroke={T.line} strokeWidth={0.5}
          />
          <text
            x={padL - 8} y={barsBottom - barsH * t + 3}
            fontSize={9} fill={T.faint} textAnchor="end" fontFamily={mono}
          >
            {Math.round(maxCount * t)}
          </text>
        </g>
      ))}

      {/* Bars */}
      {MONTHS.map((label, i) => {
        const count = countsByMonth[i] || 0;
        const bh = (count / maxCount) * barsH;
        const x = padL + i * colW + colW * 0.28;
        const bw = colW * 0.44;
        return (
          <g key={label}>
            {count > 0 && (
              <>
                <rect x={x} y={barsBottom - bh} width={bw} height={bh} fill={T.accent} opacity={0.9} />
                <text
                  x={x + bw / 2} y={barsBottom - bh + 14}
                  fontSize={11} fill="#fff" textAnchor="middle"
                  fontFamily={mono} fontWeight={600}
                >
                  {count}
                </text>
              </>
            )}
            <text
              x={x + bw / 2} y={h - 6} fontSize={11}
              fill={count > 0 ? T.text : T.faint}
              textAnchor="middle" fontFamily={font}
              fontWeight={count > 0 ? 500 : 400}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Target dashed line */}
      <line
        x1={padL} x2={w - padR}
        y1={targetY} y2={targetY}
        stroke={T.line} strokeDasharray="3 3" strokeWidth={1}
      />
      <text x={w - padR} y={targetY - 4} fontSize={9} fill={T.faint} textAnchor="end" fontFamily={mono}>
        цель {slaTarget}%
      </text>

      {/* SLA polyline */}
      {slaPoints.length > 1 && (
        <polyline
          points={slaPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke={T.text} strokeWidth={1.5}
        />
      )}

      {/* SLA dots + label badges */}
      {slaPoints.map((p, i) => {
        const lw = 38;
        const lh = 18;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={T.text} />
            <g transform={`translate(${p.x - lw / 2}, ${p.y - lh - 6})`}>
              <rect width={lw} height={lh} rx={2} fill={T.text} />
              <text
                x={lw / 2} y={12} fontSize={10} fill="#fff"
                textAnchor="middle" fontFamily={mono} fontWeight={600}
              >
                {p.pct}%
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
