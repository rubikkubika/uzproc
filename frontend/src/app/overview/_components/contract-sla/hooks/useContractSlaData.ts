'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { ContractSlaData } from '../types/contract-sla.types';

/**
 * Данные дашборда «SLA договоров» за год (/api/overview/contract-sla).
 *
 * @param year       год подписания; null — запрос не выполняется
 * @param preparedBy фильтр по договорному специалисту (расчёт на бэкенде)
 * @param exclude1p  «без 1P»: исключить документы ЦФО «M - Commerce 1Р»
 * @param enabled    вкладка активна
 */
export function useContractSlaData(
  year: number | null,
  preparedBy: string | null,
  exclude1p: boolean,
  enabled: boolean
) {
  const [data, setData] = useState<ContractSlaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || year == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (preparedBy != null && preparedBy.trim() !== '') params.set('preparedBy', preparedBy.trim());
      if (exclude1p) params.set('exclude1p', 'true');
      const res = await fetch(`${getBackendUrl()}/api/overview/contract-sla?${params}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных SLA договоров');
      const json = (await res.json()) as ContractSlaData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, preparedBy, exclude1p, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
