'use client';

import type { ReactNode } from 'react';
import { badgePadding } from '../utils/mrPresentationFormat';
import {
  DANGER_BG,
  DANGER_TEXT,
  PURPLE_DARK,
  PURPLE_TINT,
  SUCCESS_BG,
  SUCCESS_TEXT,
} from '../constants/mr-presentation.constants';

/** Чип целевого значения KPI. */
export function MrTargetChip({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 20,
        fontWeight: 600,
        color: PURPLE_DARK,
        background: PURPLE_TINT,
        borderRadius: 999,
        // line-height строго по кеглю + оптическая поправка вверх: величина
        // выверена замером растра html2canvas (см. badgePadding).
        lineHeight: 1,
        ...badgePadding(20, 8, 16),
        whiteSpace: 'nowrap',
      }}
    >
      Цель: {children}
    </div>
  );
}

/** Чип фактического значения: зелёный при достижении цели, красный при отставании. */
export function MrFactChip({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 20,
        fontWeight: 600,
        color: ok ? SUCCESS_TEXT : DANGER_TEXT,
        background: ok ? SUCCESS_BG : DANGER_BG,
        borderRadius: 999,
        lineHeight: 1,
        ...badgePadding(20, 8, 16),
        whiteSpace: 'nowrap',
      }}
    >
      Факт: {children}
    </div>
  );
}

/** Заголовок блока KPI с чипами цели и факта. */
export function MrKpiHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{title}</div>
      {children}
    </div>
  );
}
