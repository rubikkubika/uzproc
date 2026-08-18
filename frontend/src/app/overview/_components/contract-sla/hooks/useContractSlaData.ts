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
 * @param month      месяц (1–12) для списков документов; null — месяц по умолчанию (текущий)
 * @param organizations организации заказчика (имена enum CustomerOrganization); пусто — без фильтра
 * @param enabled    вкладка активна
 */
export function useContractSlaData(
  year: number | null,
  preparedBy: string | null,
  exclude1p: boolean,
  month: number | null,
  organizations: Set<string>,
  enabled: boolean
) {
  const [data, setData] = useState<ContractSlaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set нестабилен между рендерами — в зависимости fetchData идёт его сериализованное значение
  const organizationsKey = JSON.stringify(Array.from(organizations).sort());

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
      if (month != null) params.set('month', String(month));
      (JSON.parse(organizationsKey) as string[]).forEach((org) => params.append('organizations', org));
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
  }, [year, preparedBy, exclude1p, month, organizationsKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
