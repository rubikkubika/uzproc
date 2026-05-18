'use client';

import { useState, useCallback, useMemo } from 'react';

export function useKpiMonth() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const goPrev = useCallback(() => {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, []);

  const isCurrentOrFuture = useMemo(() => {
    return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
  }, [year, month, now]);

  return { year, month, goPrev, goNext, isCurrentOrFuture };
}
