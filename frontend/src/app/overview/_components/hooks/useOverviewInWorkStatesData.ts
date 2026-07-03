'use client';

import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

/** Состояние договора (поле «Состояние»), вычисляемый статус и количество договоров. */
export interface InWorkStateCount {
  state: string;
  status: string;
  count: number;
}

interface UseOverviewInWorkStatesDataResult {
  data: InWorkStateCount[];
  loading: boolean;
  error: string | null;
}

/**
 * Загружает список состояний договоров из вкладки «В работе» и их количество.
 * Данные грузятся только когда вкладка активна (enabled = true).
 */
export function useOverviewInWorkStatesData(enabled: boolean): UseOverviewInWorkStatesDataResult {
  const [data, setData] = useState<InWorkStateCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${getBackendUrl()}/api/contracts/in-work-state-counts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as InWorkStateCount[];
        if (!cancelled) setData(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, loading, error };
}
