export interface KpiSavingsByPurchaser {
  purchaser: string;
  totalSavings: number;
  totalBudget: number;
  count: number;
}

export interface KpiSavingsData {
  year: number;
  month: number;
  byPurchaser: KpiSavingsByPurchaser[];
}

export interface KpiSavingsSettings {
  target: number;
  weight: number;
}

export const DEFAULT_KPI_SAVINGS_SETTINGS: KpiSavingsSettings = {
  target: 5,
  weight: 30,
};

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
