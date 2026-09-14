'use client';

import { useEffect, useState } from 'react';
import { hasEkData } from '../utils/ek-dashboard.utils';
import { fetchEkData } from './useEkData';

/**
 * Ближайший к выбранному год, за который есть заявки, — для ссылки «Показать {год} →» в пустом состоянии.
 * Запросы идут только когда за выбранный год данных нет, от ближайших лет к дальним.
 */
export function useEkNearestYear(year: number, availableYears: number[], isEmpty: boolean) {
  const [found, setFound] = useState<{ forYear: number; nearestYear: number } | null>(null);

  useEffect(() => {
    if (!isEmpty) return;
    let cancelled = false;
    const candidates = availableYears
      .filter((y) => y !== year)
      .sort((a, b) => Math.abs(a - year) - Math.abs(b - year) || b - a);

    (async () => {
      for (const candidate of candidates) {
        try {
          const result = await fetchEkData(candidate);
          if (cancelled) return;
          if (hasEkData(result.rows)) {
            setFound({ forYear: year, nearestYear: candidate });
            return;
          }
        } catch {
          // Год недоступен — проверяем следующий
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [year, availableYears, isEmpty]);

  return isEmpty && found?.forYear === year ? found.nearestYear : null;
}
