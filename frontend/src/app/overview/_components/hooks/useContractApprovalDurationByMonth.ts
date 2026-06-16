'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractApprovalDurationMonthRow {
  month: number;
  marketAvgDays: number | null;
  marketCount: number;
  tezkorOooAvgDays: number | null;
  tezkorOooCount: number;
  p1AvgDays: number | null;
  p1Count: number;
}

export interface ContractApprovalDurationByMonthResponse {
  year: number;
  months: ContractApprovalDurationMonthRow[];
}

interface State {
  data: ContractApprovalDurationByMonthResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Данные дашборда «Средний срок согласования по месяцам» в разрезе сегментов
 * (Маркет / Тезкор ООО / 1П).
 */
export function useContractApprovalDurationByMonth(year: number, enabled: boolean) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  const load = useCallback(() => {
    if (!enabled) return;
    setState({ data: null, loading: true, error: null });
    const params = new URLSearchParams({ year: String(year) });
    fetch(`${getBackendUrl()}/api/overview/contract-approvals-duration-by-month?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setState({ data: json, loading: false, error: null }))
      .catch(() => setState({ data: null, loading: false, error: 'Ошибка загрузки данных' }));
  }, [year, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
