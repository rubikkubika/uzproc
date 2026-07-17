'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Период дашборда «KPI премии 2»: год + квартал (1–4).
 * По умолчанию — текущий квартал.
 */
export function useKpiQuarter() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);

  const goPrev = useCallback(() => {
    setQuarter((q) => {
      if (q === 1) {
        setYear((y) => y - 1);
        return 4;
      }
      return q - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setQuarter((q) => {
      if (q === 4) {
        setYear((y) => y + 1);
        return 1;
      }
      return q + 1;
    });
  }, []);

  const isCurrentOrFuture = useMemo(() => {
    const nowQuarter = Math.floor(now.getMonth() / 3) + 1;
    return year > now.getFullYear() || (year === now.getFullYear() && quarter >= nowQuarter);
  }, [year, quarter, now]);

  return { year, quarter, goPrev, goNext, isCurrentOrFuture };
}
