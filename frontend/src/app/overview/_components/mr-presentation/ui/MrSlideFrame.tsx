'use client';

import type { CSSProperties, ReactNode } from 'react';
import { SLIDE_ATTR } from '../utils/mrPresentationStage';
import { CARD_BG, FAINT, FONT_STACK, INK, SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants/mr-presentation.constants';

interface MrSlideFrameProps {
  children: ReactNode;
  /** Фон слайда. */
  background?: string;
  /** Цвет текста по умолчанию. */
  color?: string;
  /** Внутренние отступы слайда. */
  padding?: string;
  /** Подпись в правом нижнем углу («Uzum E-com · УО сентябрь 2026»). */
  footer?: string;
  style?: CSSProperties;
}

/**
 * Каркас слайда 1920×1080. Стили инлайновые: слайд снимается растром через
 * html2canvas, который не понимает современные CSS-функции цвета из Tailwind.
 */
export function MrSlideFrame({
  children,
  background = CARD_BG,
  color = INK,
  padding = '64px 80px 56px',
  footer,
  style,
}: MrSlideFrameProps) {
  return (
    <div
      {...{ [SLIDE_ATTR]: '' }}
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        minWidth: SLIDE_WIDTH,
        minHeight: SLIDE_HEIGHT,
        background,
        color,
        fontFamily: FONT_STACK,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
      {footer && (
        <div style={{ position: 'absolute', right: 80, bottom: 24, fontSize: 18, fontWeight: 500, color: FAINT }}>
          {footer}
        </div>
      )}
    </div>
  );
}
