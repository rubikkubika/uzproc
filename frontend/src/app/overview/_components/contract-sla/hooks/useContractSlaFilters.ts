'use client';

import { useCallback, useMemo, useState } from 'react';

const YEAR_STORAGE_KEY = 'overview_contractSlaYear';
const PREPARER_STORAGE_KEY = 'overview_contractSlaPreparer';
const EXCLUDE_1P_STORAGE_KEY = 'overview_contractSlaExclude1p';

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

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) years.push(i);
    return years;
  }, [currentYear]);

  /** Сброс: фильтр по специалисту снимается, «без 1P» возвращается в состояние по умолчанию — включён. */
  const resetFilters = useCallback(() => {
    setPreparedBy(null);
    setExclude1p(true);
  }, [setPreparedBy, setExclude1p]);

  return {
    year,
    setYear,
    availableYears,
    preparedBy,
    setPreparedBy,
    togglePreparedBy,
    exclude1p,
    setExclude1p,
    resetFilters,
  };
}
