import type { CSSProperties } from 'react';

/** Группы колонок сводки: у каждой свой цвет заливки (RGB без альфы) */
export const SUMMARY_GROUP_RGB = {
  shipment: '37,99,235',
  payment: '124,58,237',
  total: '100,116,139',
  overdue: '234,88,12',
  delivered: '22,163,74',
} as const;

export type SummaryGroup = keyof typeof SUMMARY_GROUP_RGB;

/**
 * Сетка сводки: ответственный, статусы поставки, разделитель, статусы оплаты, разделитель,
 * «Всего» / «Просрочено» / «Поставлено». Количество статусов приходит с бэкенда.
 */
export function summaryGridTemplate(shipmentCount: number, paymentCount: number): string {
  return `180px repeat(${shipmentCount}, minmax(52px, 1fr)) 12px repeat(${paymentCount}, minmax(52px, 1fr)) 12px repeat(3, minmax(64px, 1fr))`;
}

/**
 * Заливка ячейки сводки по «тепловой карте»: чем больше значение относительно максимума
 * в колонке, тем насыщеннее фон — взгляд сразу находит загруженных исполнителей.
 * Нулевые значения не заливаются.
 */
export function heatmapCellStyle(value: number, columnMax: number, group: SummaryGroup): CSSProperties {
  if (value <= 0 || columnMax <= 0) return {};
  const t = value / columnMax;
  const alpha = group === 'total' ? 0.05 + 0.25 * t : 0.08 + 0.55 * t;
  return {
    backgroundColor: `rgba(${SUMMARY_GROUP_RGB[group]},${alpha.toFixed(2)})`,
    color: group !== 'total' && t > 0.6 ? '#ffffff' : '#1e293b',
  };
}
