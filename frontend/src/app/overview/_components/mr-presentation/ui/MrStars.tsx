'use client';

import { LINE, STAR } from '../constants/mr-presentation.constants';

const STAR_PATH = 'M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.4l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95L12 2.5z';

/** Одиночная звезда — строительный блок ряда. */
function StarIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}

interface MrStarsProps {
  /** Оценка 0–5. */
  value: number | null | undefined;
  /** Размер звезды, px. */
  size?: number;
  /** Расстояние между звёздами, px. */
  gap?: number;
}

/**
 * Ряд из пяти звёзд с дробной заливкой: серая подложка, поверх — золотая
 * часть, обрезанная по ширине `value / 5`.
 */
export function MrStars({ value, size = 20, gap = 2 }: MrStarsProps) {
  const rating = Math.max(0, Math.min(5, value ?? 0));
  const rowWidth = size * 5 + gap * 4;
  const fillWidth = (rating / 5) * rowWidth;

  const row = (color: string) => (
    <div style={{ display: 'flex', gap, lineHeight: 0 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarIcon key={i} size={size} color={color} />
      ))}
    </div>
  );

  return (
    <div style={{ position: 'relative', width: rowWidth, height: size, flexShrink: 0 }}>
      {row(LINE)}
      <div style={{ position: 'absolute', left: 0, top: 0, width: fillWidth, height: size, overflow: 'hidden' }}>
        {row(STAR)}
      </div>
    </div>
  );
}
