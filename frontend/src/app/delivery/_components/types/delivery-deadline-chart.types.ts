/** Один день месяца в распределении поставок по плановой дате */
export interface DeliveryDeadlineDay {
  day: number;
  count: number;
}

/** Ответ API с распределением поставок по дням месяца */
export interface DeliveryDeadlineHistogram {
  year: number;
  month: number;
  daysInMonth: number;
  total: number;
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
