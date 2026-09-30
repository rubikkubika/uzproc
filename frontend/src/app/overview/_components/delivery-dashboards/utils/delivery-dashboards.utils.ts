import type {
  DeliveryBreakdownItem,
  DeliveryCurrencyAmount,
  DeliveryDonutSegment,
  DeliveryResponsibleProblemLevel,
  DeliveryResponsibleRow,
  DeliveryResponsibleSummaryItem,
} from '../types/delivery-dashboards.types';
import {
  DELIVERY_NEUTRAL_COLOR,
  RESPONSIBLE_CRITICAL_ON_TIME_PERCENT,
  RESPONSIBLE_CRITICAL_OVERDUE_SHARE,
  SHIPMENT_STATUS_DELIVERED_LABEL,
} from '../constants/delivery-dashboards.constants';

/** Сумма с разделителями разрядов, без копеек. */
export function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString('ru-RU');
}

/** Суммы по валютам одной строкой: «1 200 000 UZS · 3 500 USD»; «—» если сумм нет. */
export function formatAmountsInline(amounts: DeliveryCurrencyAmount[]): string {
  if (amounts.length === 0) return '—';
  return amounts.map((a) => `${formatAmount(a.amount)} ${a.currency}`).join(' · ');
}

/** Процент без дробной части; «—» если не рассчитан. */
export function formatPercent(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value)}%`;
}

/** Дни с одним знаком после запятой; «—» если не рассчитано. */
export function formatDays(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} дн.`;
}

/** Процент от целого; null при нулевом знаменателе. */
export function percentOf(part: number, total: number): number | null {
  return total > 0 ? (part * 100) / total : null;
}

/** Уровень проблемности ответственного по порогам из констант. */
export function responsibleProblemLevel(
  onTimePercentage: number | null,
  overdueShare: number | null,
  overdueCount: number
): DeliveryResponsibleProblemLevel {
  if (onTimePercentage != null && onTimePercentage < RESPONSIBLE_CRITICAL_ON_TIME_PERCENT) return 'critical';
  if (overdueShare != null && overdueShare >= RESPONSIBLE_CRITICAL_OVERDUE_SHARE) return 'critical';
  if (overdueCount > 0) return 'warning';
  return 'ok';
}

const PROBLEM_ORDER: Record<DeliveryResponsibleProblemLevel, number> = { critical: 0, warning: 1, ok: 2 };

/** Строки сводки с расчётными показателями; проблемные — сверху, затем по числу просрочек и поставок. */
export function buildResponsibleRows(items: DeliveryResponsibleSummaryItem[]): DeliveryResponsibleRow[] {
  return items
    .map((item) => {
      const deliveredByStatus = item.countByShipmentStatus[SHIPMENT_STATUS_DELIVERED_LABEL] ?? 0;
      const openCount = item.totalCount - deliveredByStatus;
      const onTimePercentage = percentOf(item.onTimeCount ?? 0, item.measurableCount ?? 0);
      const overdueShare = percentOf(item.overdueCount, openCount);
      return {
        ...item,
        openCount,
        onTimePercentage,
        overdueShare,
        problemLevel: responsibleProblemLevel(onTimePercentage, overdueShare, item.overdueCount),
      };
    })
    .sort(
      (a, b) =>
        PROBLEM_ORDER[a.problemLevel] - PROBLEM_ORDER[b.problemLevel] ||
        b.overdueCount - a.overdueCount ||
        b.totalCount - a.totalCount ||
        a.responsible.localeCompare(b.responsible)
    );
}

/** Сегменты кольца: цвет по ключу из карты, иначе из палитры по порядку, «Прочие» и пустые — нейтральные. */
export function toDonutSegments(
  items: DeliveryBreakdownItem[],
  colorByKey?: Record<string, string>,
  palette?: string[]
): DeliveryDonutSegment[] {
  return items.map((item, index) => ({
    ...item,
    color:
      colorByKey?.[item.key] ??
      (item.key === 'OTHER' ? DELIVERY_NEUTRAL_COLOR : palette?.[index % palette.length] ?? DELIVERY_NEUTRAL_COLOR),
  }));
}
