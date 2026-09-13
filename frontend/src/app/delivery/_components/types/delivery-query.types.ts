/** Вкладки таблицы поставок (взаимоисключающие, кроме «Все»). */
export type DeliveryTab = 'all' | 'in-work' | 'closed' | 'closed-review';

/** Группа горизонта в блоке «По дням». */
export type HorizonKey = 'over' | 'today' | 'week' | 'later' | 'nodate';

/**
 * Полный набор фильтров запроса списка поставок. Один объект на список, счётчики вкладок,
 * ленту «По дням» и горизонт — все они показывают одни и те же записи.
 */
export interface DeliveryQuery {
  /** Применённые фильтры колонок (текстовые — после debounce, выпадающие — сразу) */
  filters: Record<string, string>;
  year: number | null;
  noDate: boolean;
  paymentScheme: string;
  shipmentStatus: string;
  tab: DeliveryTab | null;
  /** Выбранный на ленте день (ISO) */
  plannedDate: string | null;
  /** Срез «Просрочено» из сводки */
  overdue: boolean;
  /** Срез «Поставлено за год» из сводки */
  deliveredYear: number | null;
  /** Выбранная группа горизонта */
  horizon: HorizonKey | null;
}
