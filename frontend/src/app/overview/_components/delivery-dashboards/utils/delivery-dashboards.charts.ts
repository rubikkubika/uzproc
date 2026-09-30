import {
  DELIVERY_CHART_COLORS,
  DELIVERY_MONTH_NAMES,
} from '../constants/delivery-dashboards.constants';
import type {
  DeliveryBarChartData,
  DeliveryDelayBucket,
  DeliveryDelayMonth,
  DeliveryEsfMonth,
  DeliveryPulseMonth,
} from '../types/delivery-dashboards.types';

/** Значение месяца 1–12 из списка (месяцев без данных — 0 / null). */
function byMonth<T extends { month: number }, V>(items: T[], pick: (item: T) => V, empty: V): V[] {
  const map = new Map(items.map((i) => [i.month, i]));
  return DELIVERY_MONTH_NAMES.map((_, i) => {
    const item = map.get(i + 1);
    return item ? pick(item) : empty;
  });
}

/** «Пульс»: поставлено (по месяцу факта) и просрочено на сегодня (по месяцу плановой даты). */
export function pulseMonthBars(months: DeliveryPulseMonth[]): DeliveryBarChartData {
  return {
    labels: DELIVERY_MONTH_NAMES,
    series: [
      { label: 'Поставлено', data: byMonth(months, (m) => m.deliveredCount, 0), color: DELIVERY_CHART_COLORS.delivered },
      { label: 'Просрочено (не поставлено)', data: byMonth(months, (m) => m.overdueCount, 0), color: DELIVERY_CHART_COLORS.overdue },
    ],
  };
}

/** «Пульс»: % поставленных в срок по месяцам (null — нет поставок с известным сроком). */
export function pulseOnTimeLine(months: DeliveryPulseMonth[]): (number | null)[] {
  return byMonth(months, (m) => m.onTimePercentage, null);
}

/** «Дисциплина»: гистограмма задержек — поставленные и ещё не поставленные. */
export function delayBucketBars(buckets: DeliveryDelayBucket[]): DeliveryBarChartData {
  return {
    labels: buckets.map((b) => b.label),
    series: [
      { label: 'Поставлено', data: buckets.map((b) => b.deliveredCount), color: DELIVERY_CHART_COLORS.late },
      { label: 'Не поставлено, просрочка на сегодня', data: buckets.map((b) => b.openOverdueCount), color: DELIVERY_CHART_COLORS.openOverdue },
    ],
  };
}

/** «Дисциплина»: средняя задержка опоздавших по месяцам фактической поставки. */
export function averageDelayBars(months: DeliveryDelayMonth[]): DeliveryBarChartData {
  return {
    labels: DELIVERY_MONTH_NAMES,
    series: [
      { label: 'Средняя задержка, дн.', data: byMonth(months, (m) => m.averageDelayDays ?? 0, 0), color: DELIVERY_CHART_COLORS.late },
    ],
  };
}

/** «Деньги и документы»: поставлено по месяцам — с ЭСФ и без ЭСФ (стопкой). */
export function esfMonthBars(months: DeliveryEsfMonth[]): DeliveryBarChartData {
  return {
    labels: DELIVERY_MONTH_NAMES,
    series: [
      { label: 'С ЭСФ', data: byMonth(months, (m) => m.deliveredCount - m.withoutEsfCount, 0), color: DELIVERY_CHART_COLORS.withEsf, stack: 'esf' },
      { label: 'Без ЭСФ', data: byMonth(months, (m) => m.withoutEsfCount, 0), color: DELIVERY_CHART_COLORS.withoutEsf, stack: 'esf' },
    ],
  };
}
