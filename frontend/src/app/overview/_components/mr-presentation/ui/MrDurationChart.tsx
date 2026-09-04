'use client';

import { badgeFixedPadding } from '../utils/mrPresentationFormat';
import { CARD_BG, CARD_SHADOW, LINE, MONTH_SHORT, MUTED } from '../constants/mr-presentation.constants';

export interface MrDurationPoint {
  month: number;
  avgDays: number | null;
}

interface MrDurationChartProps {
  title: string;
  /** Подпись справа от заголовка («дней, 2026»). */
  unit: string;
  points: MrDurationPoint[];
  /** Цвет линии и плашек значений. */
  color: string;
}

const WIDTH = 800;
const HEIGHT = 300;
const BASE_Y = 262;
const COL_W = WIDTH / 12;

/** Границы шкалы: данные с запасом 25%, чтобы линия занимала всю высоту. */
function scaleBounds(values: number[]): { lo: number; hi: number } {
  if (values.length === 0) return { lo: 0, hi: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { lo: min - 1, hi: max + 1 };
  const pad = (max - min) * 0.25;
  return { lo: min - pad, hi: max + pad };
}

/** Средний срок согласования по месяцам: линия со значениями в плашках. */
export function MrDurationChart({ title, unit, points, color }: MrDurationChartProps) {
  const byMonth = new Map(points.map((p) => [p.month, p.avgDays]));
  const values = points.map((p) => p.avgDays).filter((v): v is number => v != null);
  const { lo, hi } = scaleBounds(values);

  const dots = MONTH_SHORT.map((_, i) => {
    const value = byMonth.get(i + 1);
    if (value == null) return null;
    const cx = COL_W * i + COL_W / 2;
    const cy = 240 - ((value - lo) / (hi - lo)) * 170;
    return { cx, cy, labelX: cx - 24, labelY: cy - 48, label: value.toFixed(1) };
  }).filter((d): d is NonNullable<typeof d> => d != null);

  const polyline = dots.map((d) => `${d.cx},${d.cy}`).join(' ');

  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 24,
        padding: '28px 32px 20px',
        boxSizing: 'border-box',
        boxShadow: CARD_SHADOW,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 19, color: MUTED }}>{unit}</div>
      </div>

      <div style={{ position: 'relative', width: WIDTH, height: HEIGHT, margin: '10px auto 0' }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} style={{ display: 'block', position: 'absolute', inset: 0 }}>
          <line x1={0} y1={BASE_Y} x2={WIDTH} y2={BASE_Y} stroke={LINE} strokeWidth={2} />
          {dots.length > 1 && (
            <polyline points={polyline} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {dots.map((d) => (
            <circle key={d.cx} cx={d.cx} cy={d.cy} r={6} fill="#ffffff" stroke={color} strokeWidth={4} />
          ))}
        </svg>

        {dots.map((d) => (
          <div
            key={`l-${d.cx}`}
            style={{
              position: 'absolute',
              width: 48,
              height: 28,
              left: d.labelX,
              top: d.labelY,
              background: color,
              color: '#ffffff',
              borderRadius: 7,
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...badgeFixedPadding(18),
            }}
          >
            {d.label}
          </div>
        ))}

        {MONTH_SHORT.map((m, i) => (
          <div
            key={m}
            style={{
              position: 'absolute',
              width: 66,
              left: COL_W * i + COL_W / 2 - 33,
              top: 276,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 500,
              color: MUTED,
              lineHeight: 1,
            }}
          >
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}
