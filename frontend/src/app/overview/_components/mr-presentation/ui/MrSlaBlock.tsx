'use client';

import { MrFactChip, MrKpiHeader, MrTargetChip } from './MrKpiChips';
import { MrSlaChart } from './MrSlaChart';
import { badgePadding, formatPercent } from '../utils/mrPresentationFormat';
import {
  CARD_BG,
  CARD_SHADOW,
  INK,
  MUTED,
  PURPLE_MID,
  SLA_TARGET_PERCENT,
  SLIDE_BG,
} from '../constants/mr-presentation.constants';
import type { MrSlaInput } from '../types/mr-presentation.types';

interface MrSlaBlockProps {
  sla: MrSlaInput;
}

/** Блок «SLA» на слайде основных KPI. */
export function MrSlaBlock({ sla }: MrSlaBlockProps) {
  const percentByMonth = Array.from({ length: 12 }, (_, i) => {
    const item = sla.percentageByMonth.find((m) => m.month === i + 1);
    return item?.percentage != null ? item.percentage : null;
  });

  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 24,
        padding: '32px 40px 24px',
        boxSizing: 'border-box',
        boxShadow: CARD_SHADOW,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <MrKpiHeader title="SLA">
          <MrTargetChip>{SLA_TARGET_PERCENT}%</MrTargetChip>
          {sla.averagePercentage != null && (
            <MrFactChip ok={sla.averagePercentage >= SLA_TARGET_PERCENT}>
              {formatPercent(sla.averagePercentage)}
            </MrFactChip>
          )}
        </MrKpiHeader>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 19, color: MUTED, fontWeight: 500, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: PURPLE_MID }} />
            Завершённые закупки
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 4, borderRadius: 2, background: INK }} />
            Уложились в SLA, %
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1, color: INK, background: SLIDE_BG, borderRadius: 999, ...badgePadding(19, 8, 16) }}>
            Средний SLA: {formatPercent(sla.averagePercentage)}
          </div>
        </div>
      </div>

      <MrSlaChart countsByMonth={sla.completedByMonth} percentByMonth={percentByMonth} />
    </div>
  );
}
