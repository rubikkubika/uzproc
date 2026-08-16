'use client';

import { useCallback, useMemo, useState } from 'react';

const YEAR_STORAGE_KEY = 'overview_contractSlaYear';
const PREPARER_STORAGE_KEY = 'overview_contractSlaPreparer';
const EXCLUDE_1P_STORAGE_KEY = 'overview_contractSlaExclude1p';
const MONTH_STORAGE_KEY = 'overview_contractSlaMonth';

/**
 * Фильтры дашборда «SLA договоров»: год подписания, договорной специалист и переключатель «без 1P».
 * Значения сохраняются в sessionStorage, как на вкладке SLA закупок.
 */
export function useContractSlaFilters() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [year, setYearState] = useState<number>(() => {
    if (typeof window === 'undefined') return currentYear;
    const saved = sessionStorage.getItem(YEAR_STORAGE_KEY);
    return saved ? Number(saved) : currentYear;
  });

  const [preparedBy, setPreparedByState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(PREPARER_STORAGE_KEY) || null;
  });

  // «без 1P»: по умолчанию включён — документы ЦФО «M - Commerce 1Р» исключены (как в таблице договоров)
  const [exclude1p, setExclude1pState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = sessionStorage.getItem(EXCLUDE_1P_STORAGE_KEY);
    return saved == null ? true : saved === 'true';
  });

  // Месяц, выбранный кликом по диаграмме; null — месяц по умолчанию (текущий, для прошлых лет декабрь)
  const [selectedMonth, setSelectedMonthState] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem(MONTH_STORAGE_KEY);
    return saved ? Number(saved) : null;
  });

  const setSelectedMonth = useCallback((value: number | null) => {
    setSelectedMonthState(value);
    if (typeof window === 'undefined') return;
    if (value != null) sessionStorage.setItem(MONTH_STORAGE_KEY, String(value));
    else sessionStorage.removeItem(MONTH_STORAGE_KEY);
  }, []);

  const setYear = useCallback((value: number) => {
    setYearState(value);
    if (typeof window !== 'undefined') sessionStorage.setItem(YEAR_STORAGE_KEY, String(value));
  }, []);

  const setPreparedBy = useCallback((value: string | null) => {
    setPreparedByState(value);
    if (typeof window === 'undefined') return;
    if (value) sessionStorage.setItem(PREPARER_STORAGE_KEY, value);
    else sessionStorage.removeItem(PREPARER_STORAGE_KEY);
  }, []);

  const setExclude1p = useCallback((value: boolean) => {
    setExclude1pState(value);
    if (typeof window !== 'undefined') sessionStorage.setItem(EXCLUDE_1P_STORAGE_KEY, String(value));
  }, []);

  /** Клик по строке специалиста: повторный клик по выбранному снимает фильтр. */
  const togglePreparedBy = useCallback(
    (value: string) => {
      setPreparedBy(value === (preparedBy ?? '') ? null : value || null);
    },
    [preparedBy, setPreparedBy]
  );

  /** Клик по столбцу месяца на диаграмме: повторный клик по выбранному месяцу снимает выбор. */
  const toggleMonth = useCallback(
    (value: number) => {
      setSelectedMonth(value === selectedMonth ? null : value);
    },
    [selectedMonth, setSelectedMonth]
  );

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) years.push(i);
    return years;
  }, [currentYear]);

  /**
   * Сброс: фильтр по специалисту и выбранный месяц снимаются,
   * «без 1P» возвращается в состояние по умолчанию — включён.
   */
  const resetFilters = useCallback(() => {
    setPreparedBy(null);
    setExclude1p(true);
    setSelectedMonth(null);
  }, [setPreparedBy, setExclude1p, setSelectedMonth]);

  return {
    year,
    setYear,
    availableYears,
    preparedBy,
    setPreparedBy,
    togglePreparedBy,
    exclude1p,
    setExclude1p,
    selectedMonth,
    setSelectedMonth,
    toggleMonth,
    resetFilters,
  };
}
