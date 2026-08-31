import type { CSSProperties } from 'react';

/**
 * Заливка ячейки сводки по «тепловой карте»: чем больше значение относительно максимума
 * в колонке, тем насыщеннее фон. Тот же приём, что в сводке по договорам —
 * взгляд сразу находит загруженных исполнителей.
 *
 * @param hue тон в OKLCH: свой для каждой группы колонок
 */
export function heatmapCellStyle(value: number, columnMax: number, hue: number): CSSProperties {
  if (value === 0 || columnMax === 0) return {};
  const intensity = 0.12 + 0.88 * (value / columnMax);
  const lightness = (0.96 - intensity * 0.45).toFixed(3);
  const chroma = (0.02 + intensity * 0.13).toFixed(3);
  return {
    backgroundColor: `oklch(${lightness} ${chroma} ${hue})`,
    color: intensity > 0.55 ? '#ffffff' : '#1f2937',
  };
}

/** Тона групп колонок сводки: статус поставки, статус оплаты, просрочка и поставленное за год */
export const SUMMARY_HUE = {
  shipment: 220,
  payment: 285,
  overdue: 25,
  delivered: 155,
} as const;
