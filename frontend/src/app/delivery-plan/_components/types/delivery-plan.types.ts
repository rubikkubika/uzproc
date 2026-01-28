/** Спецификация для календаря плана поставок (договор с видом документа "Спецификация") */
export interface DeliveryPlanSpecification {
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
  /** Статус: "Проект" | "На согласовании" | "Подписан" | "Не согласован" */
  status: string | null;
}

export type DeliveryPlanViewMode = 'month' | 'week';

export interface SpecificationStatusStyle {
  bg: string;
  text: string;
  short: string;
}
