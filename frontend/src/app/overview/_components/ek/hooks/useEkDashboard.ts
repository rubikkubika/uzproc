'use client';

import { useMemo } from 'react';
import { EK_RISK_THRESHOLDS } from '../constants/ek.constants';
import {
  buildConcentration,
  buildEkRows,
  buildEkTotals,
  buildRiskDistribution,
  formatExchangeRates,
  hasEkData,
  resolveTotalsCurrency,
  sortEkRows,
} from '../utils/ek-dashboard.utils';
import { useEkData } from './useEkData';
import { useEkFilters } from './useEkFilters';
import { useEkNearestYear } from './useEkNearestYear';
import { useEkSort } from './useEkSort';

/** Главный хук дашборда ЕК: год, данные, производные показатели и сортировка */
export function useEkDashboard() {
  const filters = useEkFilters();
  const { data, loading, error, retry } = useEkData(filters.year);
  const { sort, toggleSort } = useEkSort();

  const thresholds = EK_RISK_THRESHOLDS;
  const isEmpty = !loading && !error && data != null && !hasEkData(data.rows);
  const nearestYear = useEkNearestYear(filters.year, filters.availableYears, isEmpty);

  const derived = useMemo(() => {
    if (!data) return null;
    const rows = buildEkRows(data.rows, thresholds);
    return {
      rows,
      sortedRows: sortEkRows(rows, sort),
      totals: buildEkTotals(rows, thresholds),
      riskDistribution: buildRiskDistribution(rows, thresholds),
      concentration: buildConcentration(rows),
      currency: resolveTotalsCurrency(data),
      exchangeRatesTitle: formatExchangeRates(data),
    };
  }, [data, sort, thresholds]);

  return {
    filters,
    data,
    derived,
    loading,
    error,
    retry,
    isEmpty,
    nearestYear,
    thresholds,
    sort,
    toggleSort,
  };
}
