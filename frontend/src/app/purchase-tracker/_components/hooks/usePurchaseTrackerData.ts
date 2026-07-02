import { useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { Procurement } from '../types/purchase-tracker.types';

interface UsePurchaseTrackerDataResult {
  items: Procurement[];
  loading: boolean;
  error: string | null;
}

/** Задержка перед запросом на сервер (мс) */
const DEBOUNCE_MS = 400;

/**
 * Загружает закупки для трекера из публичного API `GET /api/procurements?q=`.
 * Запрос уходит с debounce; пустой запрос не обращается к серверу (страница публичная).
 */
export function usePurchaseTrackerData(query: string): UsePurchaseTrackerDataResult {
  const [items, setItems] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();

    // Всё изменение состояния — в колбэке таймера (async), чтобы не вызывать
    // каскадные ререндеры синхронно в теле эффекта.
    const timer = setTimeout(() => {
      if (!q) {
        setItems([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      fetch(`${getBackendUrl()}/api/procurements?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<Procurement[]>;
        })
        .then((data) => {
          setItems(data);
          setError(null);
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setItems([]);
          setError('Не удалось загрузить данные. Попробуйте позже.');
        })
        .finally(() => setLoading(false));
    }, q ? DEBOUNCE_MS : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { items, loading, error };
}
