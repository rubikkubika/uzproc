'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractDocumentsPersonRow {
  preparedByName: string;
  monthlyCounts: number[];
  total: number;
}

export interface ContractDocumentsByPersonMonthResponse {
  year: number;
  rows: ContractDocumentsPersonRow[];
  monthlyTotals: number[];
  total: number;
}

interface State {
  data: ContractDocumentsByPersonMonthResponse | null;
  loading: boolean;
  error: string | null;
}

export function useContractDocumentsByPersonMonth(year: number, enabled: boolean) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  const load = useCallback(() => {
    if (!enabled) return;
    setState({ data: null, loading: true, error: null });
    const params = new URLSearchParams({ year: String(year) });
    fetch(`${getBackendUrl()}/api/overview/contract-documents-by-person-month?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setState({ data: json, loading: false, error: null }))
      .catch(() => setState({ data: null, loading: false, error: 'Ошибка загрузки данных' }));
  }, [year, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
