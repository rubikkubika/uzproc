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

export interface KpiSlaByPurchaser {
  purchaser: string;
  totalCompleted: number;
  metSla: number;
  percentage: number | null;
}

export interface KpiSlaData {
  year: number;
  month: number;
  byPurchaser: KpiSlaByPurchaser[];
}

export interface KpiCsiByPurchaser {
  purchaser: string;
  count: number;
  avgRating: number | null;
}

export interface KpiCsiData {
  year: number;
  month: number;
  byPurchaser: KpiCsiByPurchaser[];
}

/** Базовые настройки для KPI-блока: цель, вес и возможность повышения максимального балла до 130%. */
export interface KpiBlockSettings {
  target: number;
  weight: number;
  allowBoost: boolean;
}

export type KpiSavingsSettings = KpiBlockSettings;
export type KpiSlaSettings = KpiBlockSettings;
export type KpiCsiSettings = KpiBlockSettings;

export const DEFAULT_KPI_SAVINGS_SETTINGS: KpiSavingsSettings = {
  target: 5,
  weight: 30,
  allowBoost: true,
};

export const DEFAULT_KPI_SLA_SETTINGS: KpiSlaSettings = {
  target: 80,
  weight: 30,
  allowBoost: true,
};

export const DEFAULT_KPI_CSI_SETTINGS: KpiCsiSettings = {
  target: 4.5,
  weight: 40,
  allowBoost: true,
};

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
