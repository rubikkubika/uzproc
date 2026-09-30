'use client';

import { useCallback, useMemo, useState } from 'react';
import { DELIVERY_DASHBOARD_YEAR_STORAGE_KEY } from '../constants/delivery-dashboards.constants';

/**
 * Год дэшбордов по поставкам. Общий для всех вкладок категории: хранится в sessionStorage,
 * поэтому при переключении вкладок выбранный год сохраняется.
 */
export function useDeliveryDashboardYear() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [year, setYearState] = useState<number>(() => {
    if (typeof window === 'undefined') return currentYear;
    const saved = sessionStorage.getItem(DELIVERY_DASHBOARD_YEAR_STORAGE_KEY);
    return saved ? Number(saved) : currentYear;
  });

  const setYear = useCallback((value: number) => {
    setYearState(value);
    if (typeof window !== 'undefined') sessionStorage.setItem(DELIVERY_DASHBOARD_YEAR_STORAGE_KEY, String(value));
  }, []);

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 3; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  return { year, setYear, availableYears };
}
