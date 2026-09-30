/**
 * Константы дэшбордов «Обзор → Дэшборды по поставкам».
 */

/** Ключ sessionStorage: год общий для всех вкладок категории. */
export const DELIVERY_DASHBOARD_YEAR_STORAGE_KEY = 'overview_deliveryDashboardYear';

/** Эндпоинты (относительно getBackendUrl()). */
export const DELIVERY_DASHBOARD_ENDPOINTS = {
  pulse: '/api/overview/delivery-dashboard/pulse',
  discipline: '/api/overview/delivery-dashboard/discipline',
  finance: '/api/overview/delivery-dashboard/finance',
  responsible: '/api/deliveries/responsible-summary',
} as const;

export const DELIVERY_MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

/** Название статуса поставки «Поставлено» (ключ колонки сводки по ответственным). */
export const SHIPMENT_STATUS_DELIVERED_LABEL = 'Поставлено';

/**
 * Пороги подсветки строк «По ответственным».
 * Красная строка: % в срок ниже CRITICAL_ON_TIME_PERCENT или доля просроченных среди непоставленных ≥ CRITICAL_OVERDUE_SHARE.
 * Жёлтая строка: есть хотя бы одна просрочка.
 */
export const RESPONSIBLE_CRITICAL_ON_TIME_PERCENT = 80;
export const RESPONSIBLE_CRITICAL_OVERDUE_SHARE = 25;

/** Цвета серий. */
export const DELIVERY_CHART_COLORS = {
  delivered: 'rgba(34, 197, 94, 0.85)',
  overdue: 'rgba(239, 68, 68, 0.85)',
  openOverdue: 'rgba(249, 115, 22, 0.85)',
  onTimeLine: 'rgba(37, 99, 235, 1)',
  late: 'rgba(245, 158, 11, 0.85)',
  withEsf: 'rgba(148, 163, 184, 0.7)',
  withoutEsf: 'rgba(239, 68, 68, 0.85)',
} as const;

/** Цвета сегментов по статусу оплаты (ключ — имя enum DeliveryStatus, NONE — без статуса). */
export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PROJECT: '#9ca3af',
  ADVANCE_PREPARED: '#fbbf24',
  ADVANCE_PAID: '#86efac',
  NOT_PAID: '#f87171',
  AWAITING_BALANCE_PAYMENT: '#f59e0b',
  PAID: '#16a34a',
  NONE: '#e5e7eb',
};

/** Цвета сегментов по схеме оплаты — в фиксированном порядке сегментов. */
export const PAYMENT_SCHEME_COLORS = [
  '#2563eb', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#ca8a04', '#9ca3af',
];

/** Цвет «прочих» сегментов и сегментов без значения. */
export const DELIVERY_NEUTRAL_COLOR = '#d1d5db';

/** Подпись определения «в срок» — одна для всех вкладок. */
export const ON_TIME_DEFINITION =
  'В срок — фактическая дата поставки не позже дедлайна (если дедлайна нет — плановой даты). Поставки без срока в % не входят.';

/** Подпись о валютах. */
export const CURRENCY_NOTE = 'Суммы показаны по валютам отдельно — разные валюты не складываются.';

/** Подпись окна «ожидается в ближайшие дни» (совпадает с EXPECTED_WINDOW_DAYS на бэкенде). */
export const EXPECTED_WINDOW_DAYS = 7;

/** Фон строки таблицы «По ответственным» по уровню проблемности. */
export const RESPONSIBLE_ROW_CLASS = {
  critical: 'bg-red-50 hover:bg-red-100',
  warning: 'bg-amber-50 hover:bg-amber-100',
  ok: 'hover:bg-gray-50',
} as const;

/** Подпись уровня проблемности (для подсказки и легенды). */
export const RESPONSIBLE_LEVEL_LABELS = {
  critical: `Проблема: в срок < ${RESPONSIBLE_CRITICAL_ON_TIME_PERCENT}% или просрочено ≥ ${RESPONSIBLE_CRITICAL_OVERDUE_SHARE}% непоставленных`,
  warning: 'Есть просрочки',
  ok: 'Без просрочек',
} as const;

/** Классы ячеек таблиц дэшбордов по поставкам. */
export const DELIVERY_TABLE_TH = 'px-2 py-1 text-xs font-medium text-gray-600 border-b border-r border-gray-300 whitespace-nowrap';
export const DELIVERY_TABLE_TD = 'px-2 py-1 text-xs text-gray-900 border-r border-gray-200 tabular-nums';
