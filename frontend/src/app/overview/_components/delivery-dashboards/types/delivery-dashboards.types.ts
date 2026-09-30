/**
 * Типы дэшбордов «Обзор → Дэшборды по поставкам».
 * Соответствуют DTO бэкенда в com.uzproc.backend.dto.delivery.dashboard
 * и DeliveryResponsibleSummaryDto (GET /api/deliveries/responsible-summary).
 */

/** Сумма в одной валюте. Суммы разных валют не складываются. */
export interface DeliveryCurrencyAmount {
  currency: string;
  amount: number;
}

export interface DeliveryPulseMonth {
  month: number;
  deliveredCount: number;
  onTimeCount: number;
  measurableCount: number;
  onTimePercentage: number | null;
  overdueCount: number;
}

export interface DeliveryPulseData {
  year: number;
  today: string;
  deliveredCount: number;
  deliveredAmounts: DeliveryCurrencyAmount[];
  overdueCount: number;
  overdueAmounts: DeliveryCurrencyAmount[];
  deliveredWithoutEsfCount: number;
  expectedNext7Count: number;
  expectedNext7Amounts: DeliveryCurrencyAmount[];
  closedCount: number;
  onTimeCount: number;
  measurableCount: number;
  onTimePercentage: number | null;
  months: DeliveryPulseMonth[];
}

export interface DeliveryDelayBucket {
  key: string;
  label: string;
  deliveredCount: number;
  openOverdueCount: number;
}

export interface DeliveryDelayMonth {
  month: number;
  measurableCount: number;
  lateCount: number;
  averageDelayDays: number | null;
}

export interface DeliverySupplierOverdue {
  supplier: string;
  lateDeliveredCount: number;
  openOverdueCount: number;
  totalCount: number;
  averageDelayDays: number | null;
  maxDelayDays: number;
}

export interface DeliveryDisciplineData {
  year: number;
  measurableCount: number;
  unmeasurableCount: number;
  lateCount: number;
  averageDelayDays: number | null;
  buckets: DeliveryDelayBucket[];
  months: DeliveryDelayMonth[];
  topSuppliers: DeliverySupplierOverdue[];
}

export interface DeliveryBreakdownItem {
  key: string;
  label: string;
  count: number;
  amounts: DeliveryCurrencyAmount[];
}

export interface DeliveryEsfMonth {
  month: number;
  deliveredCount: number;
  withoutEsfCount: number;
}

export interface DeliveryFinanceData {
  year: number;
  totalCount: number;
  byPaymentStatus: DeliveryBreakdownItem[];
  byPaymentScheme: DeliveryBreakdownItem[];
  esfByMonth: DeliveryEsfMonth[];
  deliveredWithoutEsfCount: number;
  undistributedPaymentsCount: number;
  deliveriesWithUndistributedCount: number;
}

export interface DeliveryResponsibleSummaryItem {
  responsible: string;
  totalCount: number;
  countByShipmentStatus: Record<string, number>;
  countByPaymentStatus: Record<string, number>;
  overdueCount: number;
  deliveredCount: number;
  measurableCount: number;
  onTimeCount: number;
}

export interface DeliveryResponsibleSummary {
  year: number;
  shipmentStatuses: string[];
  paymentStatuses: string[];
  items: DeliveryResponsibleSummaryItem[];
}

/** Уровень проблемности строки ответственного. */
export type DeliveryResponsibleProblemLevel = 'critical' | 'warning' | 'ok';

/** Строка таблицы «По ответственным» с рассчитанными показателями. */
export interface DeliveryResponsibleRow extends DeliveryResponsibleSummaryItem {
  /** Не поставлено (всего минус «Поставлено» по статусу) — база доли просрочки. */
  openCount: number;
  /** % в срок за год; null — нет поставленных с известным сроком. */
  onTimePercentage: number | null;
  /** Доля просроченных среди непоставленных, %; null — непоставленных нет. */
  overdueShare: number | null;
  problemLevel: DeliveryResponsibleProblemLevel;
}

/** Состояние загрузки данных дэшборда. */
export interface DeliveryDashboardFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Сегмент кольцевой диаграммы с цветом. */
export interface DeliveryDonutSegment extends DeliveryBreakdownItem {
  color: string;
}

/** Серия столбчатой диаграммы. */
export interface DeliveryBarSeries {
  label: string;
  data: number[];
  color: string;
  /** Одинаковый stack — столбцы складываются в стопку. */
  stack?: string;
}

/** Готовые данные столбчатой диаграммы. */
export interface DeliveryBarChartData {
  labels: string[];
  series: DeliveryBarSeries[];
}

/** Пропсы содержимого вкладки дэшборда по поставкам. */
export interface DeliveryDashboardContentProps {
  /** Вкладка активна — данные загружаются только тогда. */
  enabled: boolean;
}

/** Итоги таблицы «По ответственным». */
export interface DeliveryResponsibleTotals {
  totalCount: number;
  overdueCount: number;
  deliveredCount: number;
  measurableCount: number;
  onTimeCount: number;
  critical: number;
  /** Итог по каждому статусу поставки (ключ — название статуса). */
  byShipmentStatus: Record<string, number>;
}
