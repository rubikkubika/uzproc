'use client';

import { useMemo, useState } from 'react';
import { EK_YEARS_BACK, EK_YEARS_TOTAL } from '../constants/ek.constants';

/** Фильтры дашборда ЕК: год (назначения на закупщика) */
export function useEkFilters() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const availableYears = useMemo(
    () => Array.from({ length: EK_YEARS_TOTAL }, (_, i) => currentYear - EK_YEARS_BACK + i),
    [currentYear]
  );

  return { year, setYear, availableYears };
}
