/** Элемент таблицы плана поставок (спецификация) */
export interface DeliveryPlanItem {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  budgetAmount: number | null;
  currency: string | null;
  plannedDeliveryStartDate: string | null;
  plannedDeliveryEndDate: string | null;
  purchaseRequestId: number | null;
  status: string | null;
  // Дополнительные поля для отображения
  company: string | null;
  category: string | null;
}

/** Фильтры таблицы плана поставок */
export interface DeliveryPlanTableFilters {
  innerId: string;
  name: string;
  title: string;
  cfo: string;
  company: string;
  category: string;
  plannedDeliveryStartDate: string;
  plannedDeliveryEndDate: string;
  purchaseRequestId: string;
}

/** Данные для диаграммы по дням месяца */
export interface DailyChartData {
  day: number; // День месяца (1-31)
  count: number; // Количество поставок в этот день
}

/** Опции фильтра месяца */
export interface MonthOption {
  value: number; // 0-11 (январь-декабрь)
  label: string; // Название месяца
}

/** Данные для распределения поставок по дням */
export interface DailyDistribution {
  [day: number]: DeliveryPlanItem[]; // Группировка по дням месяца
}
