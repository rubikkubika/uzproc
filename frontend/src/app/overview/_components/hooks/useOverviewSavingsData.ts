'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface SavingsMonthData {
  month: number;
  totalSavings: number;
  savingsFromMedian: number;
  savingsFromExistingContract: number;
  savingsUntyped: number;
  count: number;
}

export interface SavingsByCfoData {
  cfo: string;
  totalSavings: number;
  savingsFromMedian: number;
  savingsFromExistingContract: number;
  savingsUntyped: number;
  count: number;
}

export interface SavingsByPurchaserData {
  purchaser: string;
  totalSavings: number;
  savingsFromMedian: number;
  savingsFromExistingContract: number;
  savingsUntyped: number;
  count: number;
}

export interface SavingsPurchaseDetail {
  idPurchaseRequest: number | null;
  cfo: string | null;
  purchaser: string | null;
  name: string | null;
  purchaseCreationDate: string | null;
  budgetAmount: number | null;
  savings: number | null;
  savingsType: string | null;
  status: string | null;
  complexity: string | null;
}

export interface SavingsData {
  year: number;
  totalBudget: number;
  totalBudgetCount: number;
  totalSavings: number;
  savingsFromMedian: number;
  savingsFromExistingContract: number;
  savingsUntyped: number;
  totalCount: number;
  fromMedianCount: number;
  fromExistingContractCount: number;
  untypedCount: number;
  byMonth: SavingsMonthData[];
  byCfo: SavingsByCfoData[];
  byPurchaser: SavingsByPurchaserData[];
}

export function useOverviewSavingsData(year: number | null) {
  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/overview/savings?year=${y}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных экономии');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (year != null) {
      fetchData(year);
    }
  }, [year, fetchData]);

  return { data, loading, error };
}
