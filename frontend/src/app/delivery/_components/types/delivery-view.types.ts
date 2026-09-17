import type { Delivery } from './delivery.types';

/** Смысловой цвет: красный — проблема, оранжевый — требует действия, зелёный — готово, синий — в процессе, серый — нет данных */
export type Tone = 'red' | 'orange' | 'green' | 'blue' | 'slate';

/** Сигнал «что делать» со строкой — показывается один, по приоритету */
export type SignalKind = 'overdue' | 'discrepancy' | 'undistributed' | 'no-esf' | 'closed' | 'no-date';

export interface RowSignal {
  kind: SignalKind;
  label: string;
  tone: Tone;
}

export interface ToneLabel {
  label: string;
  tone: Tone;
}

/** Строка таблицы поставок, подготовленная к отображению */
export interface DeliveryRowView {
  delivery: Delivery;
  signal: RowSignal | null;
  /** Плановая дата изменена вручную (≠ дедлайну) */
  plannedManual: boolean;
  shipment: ToneLabel | null;
  /** present — ЭСФ есть; missing — поставлено без ЭСФ; pending — ещё не поставлено */
  esfState: 'present' | 'missing' | 'pending';
  /** Статус ручного отчёта, если он противоречит системе */
  reportDiscrepancy: string | null;
  schemeLabel: string;
  schemeMissing: boolean;
  payments: ToneLabel;
  paymentStatus: ToneLabel | null;
  amountText: string;
  amountFull: string;
  currency: string;
}
