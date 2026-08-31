/** Один день месяца в распределении поставок по плановой дате */
export interface DeliveryDeadlineDay {
  day: number;
  /** Непоставленные поставки с плановой датой в этот день — высота столбца */
  count: number;
  /** Поставленные поставки с фактической датой поставки в этот день — галочка над столбцом */
  deliveredCount: number;
}

/** Ответ API с распределением поставок по дням месяца */
export interface DeliveryDeadlineHistogram {
  year: number;
  month: number;
  daysInMonth: number;
  /** Всего непоставленных поставок с плановой датой в этом месяце */
  total: number;
  /** Всего поставленных поставок с фактической датой поставки в этом месяце */
  deliveredTotal: number;
  days: DeliveryDeadlineDay[];
}

/** Параметры хука диаграммы: фильтры таблицы и обратная связь по выбранному дню */
export interface DeliveryDeadlineChartFilters {
  /** Вызывается при выборе/снятии дня: ISO-дата выбранного дня или null */
  onSelectedDateChange: (date: string | null) => void;
  filters: Record<string, string>;
  paymentSchemeFilter: string;
  shipmentStatusFilter: string;
  dateYear: number | null;
  showNoDate: boolean;
  tab: string;
}
