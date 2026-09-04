'use client';

import { badgeFixedPadding } from '../utils/mrPresentationFormat';
import { INK, LINE, MONTH_SHORT, MUTED, PURPLE_MID } from '../constants/mr-presentation.constants';

interface MrSlaChartProps {
  /** Завершённые закупки по месяцам (индекс 0 — январь). */
  countsByMonth: number[];
  /** Процент уложившихся в SLA по месяцам (индекс 0 — январь; null — нет данных). */
  percentByMonth: (number | null)[];
}

const WIDTH = 1760;
const HEIGHT = 270;
/** Базовая линия столбцов. */
const BASE_Y = 236;
/** Высота самого высокого столбца. */
const MAX_BAR_H = 110;
const COL_W = WIDTH / 12;
const BAR_W = 96;

/** Позиция точки линии SLA: шкала 80–100% укладывается в 60px над y=100. */
function percentToY(percent: number): number {
  const y = 100 - ((percent - 80) / 20) * 60;
  return Math.max(28, Math.min(200, y));
}

/**
 * График SLA: столбцы завершённых закупок и линия процента уложившихся в срок.
 * Рисуется вручную в SVG — так слайд снимается растром без ожидания Chart.js
 * и точно повторяет макет.
 */
export function MrSlaChart({ countsByMonth, percentByMonth }: MrSlaChartProps) {
  const counts = countsByMonth.length === 12 ? countsByMonth : Array(12).fill(0);
  const maxCount = Math.max(...counts, 1);

  const bars = counts.map((count, i) => {
    const cx = COL_W * i + COL_W / 2;
    const h = count > 0 ? Math.max(6, (count / maxCount) * MAX_BAR_H) : 0;
    return { month: MONTH_SHORT[i], count, x: cx - BAR_W / 2, y: BASE_Y - h, h, cx, labelY: BASE_Y - h - 30 };
  });

  const points = counts
    .map((count, i) => {
      const percent = percentByMonth[i];
      if (count === 0 || percent == null) return null;
      const cx = COL_W * i + COL_W / 2;
      const cy = percentToY(percent);
      return { cx, cy, labelX: cx - 33, labelY: cy - 50, label: `${Math.round(percent)}%` };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const polyline = points.map((p) => `${p.cx},${p.cy}`).join(' ');

  return (
    <div style={{ position: 'relative', width: WIDTH, height: HEIGHT, marginTop: 28 }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} style={{ display: 'block', position: 'absolute', inset: 0 }}>
        {bars.map((b) =>
          b.h > 0 ? <rect key={b.month} x={b.x} y={b.y} width={BAR_W} height={b.h} rx={8} fill={PURPLE_MID} /> : null
        )}
        <line x1={0} y1={BASE_Y} x2={WIDTH} y2={BASE_Y} stroke={LINE} strokeWidth={2} />
        {points.length > 1 && (
          <polyline points={polyline} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {points.map((p) => (
          <circle key={p.cx} cx={p.cx} cy={p.cy} r={7} fill="#ffffff" stroke={INK} strokeWidth={4} />
        ))}
      </svg>

      {bars.map((b) =>
        b.count > 0 ? (
          <div
            key={`n-${b.month}`}
            style={{
              position: 'absolute',
              width: BAR_W,
              left: b.x,
              top: b.labelY,
              textAlign: 'center',
              fontSize: 22,
              fontWeight: 700,
              color: INK,
              lineHeight: 1,
            }}
          >
            {b.count}
          </div>
        ) : null
      )}

      {bars.map((b) => (
        <div
          key={`m-${b.month}`}
          style={{
            position: 'absolute',
            width: BAR_W,
            left: b.x,
            top: 246,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 500,
            color: MUTED,
            lineHeight: 1,
          }}
        >
          {b.month}
        </div>
      ))}

      {points.map((p) => (
        <div
          key={`p-${p.cx}`}
          style={{
            position: 'absolute',
            width: 66,
            height: 30,
            left: p.labelX,
            top: p.labelY,
            background: INK,
            color: '#ffffff',
            borderRadius: 8,
            fontSize: 19,
            fontWeight: 700,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...badgeFixedPadding(19),
          }}
        >
          {p.label}
        </div>
      ))}
    </div>
  );
}
