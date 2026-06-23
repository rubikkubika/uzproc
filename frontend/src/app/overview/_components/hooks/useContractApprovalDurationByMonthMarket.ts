'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractApprovalDurationMarketMonthRow {
  month: number;
  contractDsAvgDays: number | null;
  contractDsCount: number;
  specAvgDays: number | null;
  specCount: number;
}

export interface ContractApprovalDurationByMonthMarketResponse {
  year: number;
  months: ContractApprovalDurationMarketMonthRow[];
}

interface State {
  data: ContractApprovalDurationByMonthMarketResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Данные дашборда «Средний срок согласования по месяцам» ТОЛЬКО по сегменту Маркет,
 * с разбивкой по типу документа: «Договор + ДС» и «Спецификации».
 */
export function useContractApprovalDurationByMonthMarket(year: number, enabled: boolean) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  const load = useCallback(() => {
    if (!enabled) return;
    setState({ data: null, loading: true, error: null });
    const params = new URLSearchParams({ year: String(year) });
    fetch(`${getBackendUrl()}/api/overview/contract-approvals-duration-by-month-market?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setState({ data: json, loading: false, error: null }))
      .catch(() => setState({ data: null, loading: false, error: 'Ошибка загрузки данных' }));
  }, [year, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
