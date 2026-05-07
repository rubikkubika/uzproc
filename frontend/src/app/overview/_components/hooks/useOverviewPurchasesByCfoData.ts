'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface PurchasesByCfoItem {
  id: number;
  name: string;
  cfo: string | null;
  status: string | null;
  budgetAmount: number | null;
  purchaseCompletionDate: string | null;
  linkedContractAmount: number | null;
  linkedContractCounterparty: string | null;
}

interface UseOverviewPurchasesByCfoDataOptions {
  cfos: Set<string>;
  years: Set<string>;
  enabled: boolean;
}

export function useOverviewPurchasesByCfoData({ cfos, years, enabled }: UseOverviewPurchasesByCfoDataOptions) {
  const [items, setItems] = useState<PurchasesByCfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      cfos.forEach((c) => params.append('cfo', c));
      years.forEach((y) => params.append('year', y));
      const res = await globalThis.fetch(`${getBackendUrl()}/api/overview/purchases-by-cfo?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PurchasesByCfoItem[] = await res.json();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [enabled, JSON.stringify(Array.from(cfos)), JSON.stringify(Array.from(years))]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refetch: fetch };
}

export function buildPurchasesByCfoExportUrl(cfos: Set<string>, years: Set<string>): string {
  const params = new URLSearchParams();
  cfos.forEach((c) => params.append('cfo', c));
  years.forEach((y) => params.append('year', y));
  return `${getBackendUrl()}/api/overview/purchases-by-cfo/export?${params}`;
}
