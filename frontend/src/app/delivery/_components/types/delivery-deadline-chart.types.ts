/** Один день месяца в распределении поставок по плановой дате */
export interface DeliveryDeadlineDay {
  day: number;
  /** Непоставленные поставки с плановой датой в этот день */
  count: number;
  /** Поставленные поставки с фактической датой поставки в этот день */
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

/** Ячейка ленты месяца, готовая к отображению */
export interface RibbonDayView {
  day: number;
  /** «Пн», «Вт», … */
  weekday: string;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
  isSelected: boolean;
  /** Ожидалось по плану и не поставлено (в прошлом — просрочка) */
  plan: number;
  /** Поставлено по факту */
  fact: number;
}

/** Легенда ленты: итоги месяца */
export interface RibbonLegend {
  overdue: number;
  expected: number;
  delivered: number;
}
