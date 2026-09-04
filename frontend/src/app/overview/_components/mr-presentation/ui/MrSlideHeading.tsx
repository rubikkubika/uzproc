'use client';

import type { ReactNode } from 'react';
import { badgePadding } from '../utils/mrPresentationFormat';
import { BRAND, MUTED, PURPLE_DARK, PURPLE_TINT } from '../constants/mr-presentation.constants';

interface MrSlideHeadingProps {
  /** Заголовок слайда. */
  title: string;
  /** Размер заголовка, px. */
  size?: number;
  /** Чип-уточнение справа от заголовка (например, группа ЦФО). */
  chip?: string;
  /** Подстрока рядом с чипом. */
  sub?: string;
  /** Правый верхний угол: период данных или номер страницы группы. */
  aside?: ReactNode;
}

/** Шапка контентного слайда: акцент-бар + заголовок + чип + правая подпись. */
export function MrSlideHeading({ title, size = 48, chip, sub, aside }: MrSlideHeadingProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0, paddingTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 10, height: 48, borderRadius: 5, background: BRAND, flexShrink: 0 }} />
        <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.02em' }}>{title}</div>
        {chip && (
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: PURPLE_DARK,
              background: PURPLE_TINT,
              borderRadius: 999,
              marginLeft: 8,
              lineHeight: 1,
              ...badgePadding(26, 10, 20),
              whiteSpace: 'nowrap',
            }}
          >
            {chip}
          </div>
        )}
        {sub && <div style={{ fontSize: 22, fontWeight: 500, color: MUTED, whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {aside != null && <div style={{ fontSize: 22, fontWeight: 500, color: MUTED, whiteSpace: 'nowrap' }}>{aside}</div>}
    </div>
  );
}
