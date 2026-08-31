/** Строка сводки поставок по ответственному */
export interface DeliveryResponsibleSummaryItem {
  /** ФИО ответственного («Фамилия Имя») либо «Не назначен» */
  responsible: string;
  /** Всего поставок у ответственного */
  totalCount: number;
  /** Разбивка по статусу поставки: ключ — название статуса (колонка сводки) */
  countByShipmentStatus: Record<string, number>;
  /** Разбивка по статусу оплаты: ключ — название статуса (колонка сводки) */
  countByPaymentStatus: Record<string, number>;
  /** Ещё не поставлено, а плановая дата поставки уже прошла */
  overdueCount: number;
  /** Поставлено за год: статус «Поставлено» и фактическая дата поставки в этом году */
  deliveredCount: number;
}

/** Ответ API со сводкой по ответственным */
export interface DeliveryResponsibleSummary {
  year: number;
  /** Колонки первой группы — статусы поставки */
  shipmentStatuses: string[];
  /** Колонки второй группы — статусы оплаты */
  paymentStatuses: string[];
  items: DeliveryResponsibleSummaryItem[];
}

/** Подпись колонки для поставок с незаполненным статусом */
export const NO_STATUS_COLUMN = 'Без статуса';

/** Значение фильтра статуса, которое бэкенд понимает как «статус не заполнен» */
export const NO_STATUS_FILTER_VALUE = 'NONE';
