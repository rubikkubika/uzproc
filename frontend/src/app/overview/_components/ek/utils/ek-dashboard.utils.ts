import {
  EK_CONCENTRATION_COLORS,
  EK_CONCENTRATION_REST_COLOR,
  EK_CONCENTRATION_TOP,
} from '../constants/ek.constants';
import type {
  EkApiResponse,
  EkApiRow,
  EkConcentrationSegment,
  EkRiskDistributionItem,
  EkRiskLevel,
  EkRiskThresholds,
  EkRow,
  EkSortKey,
  EkSortState,
  EkTotals,
} from '../types/ek.types';
import { currencySymbol } from './ek-format.utils';

const round2 = (value: number) => Math.round(value * 100) / 100;

export function riskLevel(percent: number, thresholds: EkRiskThresholds): Exclude<EkRiskLevel, 'none'> {
  if (percent >= thresholds.highMin) return 'high';
  if (percent >= thresholds.lowMax) return 'mid';
  return 'low';
}

/** Приводит строку ответа к числам (бэкенд отдаёт BigDecimal, в JSON бывают строки) */
export function parseEkResponse(raw: Record<string, unknown>): EkApiResponse {
  const rawRows = Array.isArray(raw?.rows) ? (raw.rows as Record<string, unknown>[]) : [];
  const rawRates = raw?.exchangeRates && typeof raw.exchangeRates === 'object'
    ? (raw.exchangeRates as Record<string, unknown>)
    : {};
  return {
    yearType: raw?.yearType === 'creation' ? 'creation' : 'assignment',
    amountsInBaseCurrency: Boolean(raw?.amountsInBaseCurrency),
    baseCurrency: raw?.baseCurrency != null ? String(raw.baseCurrency) : null,
    exchangeRates: Object.fromEntries(Object.entries(rawRates).map(([code, rate]) => [code, Number(rate)])),
    rows: rawRows.map((r): EkApiRow => ({
      cfo: String(r?.cfo ?? ''),
      totalAmount: Number(r?.totalAmount ?? 0),
      singleSupplierAmount: Number(r?.singleSupplierAmount ?? 0),
      percentByAmount: Number(r?.percentByAmount ?? 0),
      totalCount: Number(r?.totalCount ?? 0),
      singleSupplierCount: Number(r?.singleSupplierCount ?? 0),
      currency: r?.currency != null ? String(r.currency) : null,
    })),
  };
}

export function buildEkRows(rows: EkApiRow[], thresholds: EkRiskThresholds): EkRow[] {
  return rows.map((row) => {
    const isEmpty = row.totalAmount <= 0;
    return {
      ...row,
      isEmpty,
      percentByCount: row.totalCount > 0 ? round2((row.singleSupplierCount / row.totalCount) * 100) : 0,
      risk: isEmpty ? 'none' : riskLevel(row.percentByAmount, thresholds),
    };
  });
}

export function buildEkTotals(rows: EkRow[], thresholds: EkRiskThresholds): EkTotals {
  const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const singleSupplierAmount = rows.reduce((sum, r) => sum + r.singleSupplierAmount, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.totalCount, 0);
  const singleSupplierCount = rows.reduce((sum, r) => sum + r.singleSupplierCount, 0);
  const percentByAmount = totalAmount > 0 ? round2((singleSupplierAmount / totalAmount) * 100) : 0;
  return {
    totalAmount,
    singleSupplierAmount,
    totalCount,
    singleSupplierCount,
    percentByAmount,
    percentByCount: totalCount > 0 ? round2((singleSupplierCount / totalCount) * 100) : 0,
    risk: totalAmount > 0 ? riskLevel(percentByAmount, thresholds) : 'none',
  };
}

/** Число ЦФО по уровням риска (ЦФО без заявок не считаются), от высокого к низкому */
export function buildRiskDistribution(rows: EkRow[], thresholds: EkRiskThresholds): EkRiskDistributionItem[] {
  const { lowMax, highMin } = thresholds;
  const count = (level: EkRiskLevel) => rows.filter((r) => r.risk === level).length;
  return [
    { level: 'high', range: `≥ ${highMin} %`, count: count('high') },
    { level: 'mid', range: `${lowMax}–${highMin} %`, count: count('mid') },
    { level: 'low', range: `< ${lowMax} %`, count: count('low') },
  ];
}

/** Топ ЦФО по сумме ЕК и «Остальные (N)» — доли в общей сумме ЕК */
export function buildConcentration(rows: EkRow[]): EkConcentrationSegment[] {
  const withEk = rows.filter((r) => r.singleSupplierAmount > 0).sort((a, b) => b.singleSupplierAmount - a.singleSupplierAmount);
  const totalEk = withEk.reduce((sum, r) => sum + r.singleSupplierAmount, 0);
  if (totalEk <= 0) return [];
  const share = (amount: number) => (amount / totalEk) * 100;
  const segments: EkConcentrationSegment[] = withEk.slice(0, EK_CONCENTRATION_TOP).map((r, i) => ({
    name: r.cfo,
    amount: r.singleSupplierAmount,
    share: share(r.singleSupplierAmount),
    color: EK_CONCENTRATION_COLORS[i],
  }));
  const rest = withEk.slice(EK_CONCENTRATION_TOP);
  const restAmount = rest.reduce((sum, r) => sum + r.singleSupplierAmount, 0);
  if (restAmount > 0) {
    segments.push({
      name: `Остальные (${rest.length})`,
      amount: restAmount,
      share: share(restAmount),
      color: EK_CONCENTRATION_REST_COLOR,
    });
  }
  return segments;
}

const SORT_VALUE: Record<EkSortKey, (row: EkRow) => string | number> = {
  cfo: (r) => r.cfo,
  pct: (r) => r.percentByAmount,
  pctCnt: (r) => r.percentByCount,
  ekCount: (r) => r.singleSupplierCount,
  ekAmount: (r) => r.singleSupplierAmount,
};

/** Сортировка строк; вторичный ключ — имя ЦФО */
export function sortEkRows(rows: EkRow[], sort: EkSortState): EkRow[] {
  const getValue = SORT_VALUE[sort.key];
  return rows.slice().sort((a, b) => {
    const x = getValue(a);
    const y = getValue(b);
    const cmp = typeof x === 'string' ? x.localeCompare(String(y), 'ru') : x - (y as number);
    return cmp * sort.dir || a.cfo.localeCompare(b.cfo, 'ru');
  });
}

/**
 * Знак валюты для сумм: при пересчёте — базовая валюта; без пересчёта — общая валюта строк
 * (null, если валюты разные или неизвестны).
 */
export function resolveTotalsCurrency(data: EkApiResponse): string | null {
  if (data.amountsInBaseCurrency) return currencySymbol(data.baseCurrency);
  const currencies = new Set(data.rows.map((r) => r.currency).filter(Boolean));
  return currencies.size === 1 ? currencySymbol([...currencies][0]) : null;
}

/** Знак валюты строки: при пересчёте — базовая валюта, иначе валюта строки */
export function resolveRowCurrency(row: EkApiRow, data: EkApiResponse): string | null {
  return data.amountsInBaseCurrency ? currencySymbol(data.baseCurrency) : currencySymbol(row.currency);
}

/** Подсказка к бейджу пересчёта: «USD = 11 797,46 сум, EUR = 13 608,37 сум» */
export function formatExchangeRates(data: EkApiResponse): string {
  const base = currencySymbol(data.baseCurrency) ?? data.baseCurrency ?? '';
  return Object.entries(data.exchangeRates)
    .map(([code, rate]) => `${code} = ${rate.toLocaleString('ru-RU')} ${base}`)
    .join(', ');
}

/** Есть ли в ответе заявки */
export function hasEkData(rows: EkApiRow[]): boolean {
  return rows.some((r) => r.totalAmount > 0);
}
