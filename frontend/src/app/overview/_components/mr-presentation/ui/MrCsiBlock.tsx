'use client';

import { MrFactChip, MrKpiHeader, MrTargetChip } from './MrKpiChips';
import { MrStars } from './MrStars';
import { formatRating } from '../utils/mrPresentationFormat';
import {
  CARD_BG,
  CARD_SHADOW,
  CSI_TARGET_RATING,
  FAINT,
  INK,
  SLIDE_BG,
} from '../constants/mr-presentation.constants';
import type { MrCsiStats } from '../types/mr-presentation.types';

interface MrCsiBlockProps {
  stats: MrCsiStats | null;
}

function MetricRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: SLIDE_BG,
        borderRadius: 14,
        padding: '0 20px',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <MrStars value={value} size={18} />
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, width: 44, textAlign: 'right' }}>{formatRating(value)}</div>
      </div>
    </div>
  );
}

/** Блок «CSI» на слайде основных KPI. */
export function MrCsiBlock({ stats }: MrCsiBlockProps) {
  const rows: { label: string; value: number | null }[] = [
    { label: 'Скорость', value: stats?.avgSpeed ?? null },
    { label: 'Качество', value: stats?.avgQuality ?? null },
    { label: 'Закупщик', value: stats?.avgSatisfaction ?? null },
  ];
  if (stats?.avgUzproc != null) rows.push({ label: 'Узпрок', value: stats.avgUzproc });

  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 24,
        padding: '36px 40px',
        boxSizing: 'border-box',
        boxShadow: CARD_SHADOW,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MrKpiHeader title="CSI">
        <MrTargetChip>{CSI_TARGET_RATING.toFixed(1)}</MrTargetChip>
        {stats?.avgOverall != null && (
          <MrFactChip ok={stats.avgOverall >= CSI_TARGET_RATING}>{formatRating(stats.avgOverall)}</MrFactChip>
        )}
      </MrKpiHeader>

      {!stats ? (
        <div style={{ fontSize: 22, color: FAINT, padding: '40px 0' }}>Нет данных за период</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flex: 1 }}>
          <div
            style={{
              flex: '0 0 200px',
              background: INK,
              color: '#ffffff',
              borderRadius: 18,
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.7)',
                }}
              >
                Средняя
              </div>
              <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.25, marginTop: 4 }}>
                {formatRating(stats.avgOverall)}
              </div>
              <div style={{ marginTop: 12 }}>
                <MrStars value={stats.avgOverall} size={24} />
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.7)',
                }}
              >
                Оценок
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2 }}>{stats.count}</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${rows.length}, 1fr)`, gap: 10 }}>
            {rows.map((row) => (
              <MetricRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
