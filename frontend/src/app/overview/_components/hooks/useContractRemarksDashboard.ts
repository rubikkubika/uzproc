'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractRemarksCategoryItem {
  category: string;
  count: number;
}

export interface ContractRemarksDashboardResponse {
  categories: ContractRemarksCategoryItem[];
  totalCount: number;
}

export interface ContractRemarkEntry {
  contractId: number;
  contractInnerId: string | null;
  contractName: string | null;
  preparedByName: string | null;
  executorName: string | null;
  stage: string | null;
  role: string | null;
  commentText: string;
  createdAt: string | null;
}

interface UseDashboardState {
  data: ContractRemarksDashboardResponse | null;
  loading: boolean;
  error: string | null;
}

interface UseCategoryRemarksState {
  data: ContractRemarkEntry[];
  loading: boolean;
  error: string | null;
}

export function useContractRemarksDashboard(dateFrom: string, dateTo: string) {
  const [state, setState] = useState<UseDashboardState>({ data: null, loading: false, error: null });

  const load = useCallback(() => {
    setState({ data: null, loading: true, error: null });
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString();
    fetch(`${getBackendUrl()}/api/overview/contract-remarks-dashboard${qs ? `?${qs}` : ''}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setState({ data: json, loading: false, error: null }))
      .catch(() => setState({ data: null, loading: false, error: 'Ошибка загрузки данных' }));
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export function useContractRemarksByCategory(
  category: string | null,
  dateFrom: string,
  dateTo: string
) {
  const [state, setState] = useState<UseCategoryRemarksState>({ data: [], loading: false, error: null });

  useEffect(() => {
    if (!category) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState({ data: [], loading: true, error: null });
    const params = new URLSearchParams({ category });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    fetch(`${getBackendUrl()}/api/overview/contract-remarks-dashboard/by-category?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setState({ data: Array.isArray(json) ? json : [], loading: false, error: null }))
      .catch(() => setState({ data: [], loading: false, error: 'Ошибка загрузки замечаний' }));
  }, [category, dateFrom, dateTo]);

  return state;
}
