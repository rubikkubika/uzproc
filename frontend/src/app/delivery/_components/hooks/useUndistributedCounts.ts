import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

/** Загружает уникальные значения количества нераспределённых оплат для фильтра столбца «Оплаты». */
export const useUndistributedCounts = () => {
  const [counts, setCounts] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/deliveries/undistributed-counts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as number[];
        if (!cancelled) setCounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Не удалось загрузить количества нераспределённых оплат:', err);
        if (!cancelled) setCounts([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return counts;
};
