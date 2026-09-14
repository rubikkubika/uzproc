'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import { EK_API_PATH } from '../constants/ek.constants';
import type { EkApiResponse } from '../types/ek.types';
import { parseEkResponse } from '../utils/ek-dashboard.utils';

/** Загружает сводку ЕК за год; тот же запрос используется для поиска года с данными */
export async function fetchEkData(year: number): Promise<EkApiResponse> {
  const res = await fetch(`${getBackendUrl()}${EK_API_PATH}?year=${year}`);
  if (!res.ok) {
    throw new Error(`Сервер вернул ошибку ${res.status} для GET ${EK_API_PATH}?year=${year}.`);
  }
  return parseEkResponse(await res.json());
}

interface EkDataResult {
  /** Запрос, к которому относится результат: пока ключ не совпал с текущим — идёт загрузка */
  key: string;
  data: EkApiResponse | null;
  error: string | null;
}

/** Данные дашборда ЕК за год (/api/overview/ek) */
export function useEkData(year: number) {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<EkDataResult | null>(null);
  const requestKey = `${year}:${reloadKey}`;

  useEffect(() => {
    let cancelled = false;
    fetchEkData(year)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setResult({ key: requestKey, data: null, error: e instanceof Error ? e.message : 'Ошибка загрузки данных ЕК' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [year, requestKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  const current = result?.key === requestKey ? result : null;

  return { data: current?.data ?? null, loading: current == null, error: current?.error ?? null, retry };
}
