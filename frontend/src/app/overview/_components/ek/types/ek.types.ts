/** Режим года: по году назначения на закупщика или (fallback) по году создания заявки */
export type EkYearType = 'assignment' | 'creation';

/** Строка ответа /api/overview/ek — сводка по одному ЦФО */
export interface EkApiRow {
  /** «(без ЦФО)» для заявок без ЦФО */
  cfo: string;
  totalAmount: number;
  singleSupplierAmount: number;
  /** Доля ЕК по сумме, 2 знака (считает бэкенд) */
  percentByAmount: number;
  totalCount: number;
  singleSupplierCount: number;
  /** Валюта строки; "mixed" — разные валюты без пересчёта */
  currency: string | null;
}

/** Ответ /api/overview/ek */
export interface EkApiResponse {
  yearType: EkYearType;
  amountsInBaseCurrency: boolean;
  baseCurrency: string | null;
  /** Курсы пересчёта к базовой валюте (только при пересчёте) */
  exchangeRates: Record<string, number>;
  rows: EkApiRow[];
}

export type EkRiskLevel = 'low' | 'mid' | 'high' | 'none';

/** Цвета и подпись уровня риска */
export interface EkRiskStyle {
  bar: string;
  text: string;
  bg: string;
  label: string;
}

/** Строка таблицы с производными значениями */
export interface EkRow extends EkApiRow {
  /** Доля ЕК по количеству заявок, % */
  percentByCount: number;
  risk: EkRiskLevel;
  /** Нет заявок (totalAmount = 0) */
  isEmpty: boolean;
}

/** Итоги по всем ЦФО */
export interface EkTotals {
  totalAmount: number;
  singleSupplierAmount: number;
  totalCount: number;
  singleSupplierCount: number;
  percentByAmount: number;
  percentByCount: number;
  risk: EkRiskLevel;
}

/** Число ЦФО на уровне риска */
export interface EkRiskDistributionItem {
  level: Exclude<EkRiskLevel, 'none'>;
  range: string;
  count: number;
}

/** Сегмент структуры суммы ЕК (топ ЦФО + «Остальные») */
export interface EkConcentrationSegment {
  name: string;
  amount: number;
  /** Доля в общей сумме ЕК, % */
  share: number;
  color: string;
}

export type EkSortKey = 'cfo' | 'pct' | 'pctCnt' | 'ekCount' | 'ekAmount';

export interface EkSortState {
  key: EkSortKey;
  /** 1 — по возрастанию, -1 — по убыванию */
  dir: 1 | -1;
}

/** Пороги риска по доле ЕК, % */
export interface EkRiskThresholds {
  /** Ниже — низкий риск */
  lowMax: number;
  /** Не ниже — высокий риск */
  highMin: number;
}
