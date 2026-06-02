'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractApprovalsDashboardRow {
  segment: string;
  documentForm: string;
  typicalForm: boolean | null;
  count: number;
  avgDurationDays: number | null;
}

export interface ContractApprovalsDashboardResponse {
  year: number;
  rows: ContractApprovalsDashboardRow[];
  totalCount: number;
  totalAvgDurationDays: number | null;
  availablePreparedBy: string[];
}

interface State {
  data: ContractApprovalsDashboardResponse | null;
  loading: boolean;
  error: string | null;
}

export function useContractApprovalsDashboard(year: number, preparedBy: string | null, enabled: boolean) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  const load = useCallback(() => {
    if (!enabled) return;
    setState({ data: null, loading: true, error: null });
    const params = new URLSearchParams({ year: String(year) });
    if (preparedBy && preparedBy.trim() !== '') params.set('preparedBy', preparedBy.trim());
    fetch(`${getBackendUrl()}/api/overview/contract-approvals-dashboard?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setState({ data: json, loading: false, error: null }))
      .catch(() => setState({ data: null, loading: false, error: 'Ошибка загрузки данных' }));
  }, [year, preparedBy, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
