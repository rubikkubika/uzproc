'use client';

import { useState, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { PurchaseRequest } from '@/app/purchase-requests/_components/types/purchase-request.types';

export interface TimelinesRequestsSelection {
  year: number;
  complexity: string;
}

export interface TimelinesRequestItem {
  request: PurchaseRequest;
  daysByStage: Record<string, number>;
}

interface UseTimelinesRequestsResult {
  selection: TimelinesRequestsSelection | null;
  items: TimelinesRequestItem[];
  loading: boolean;
  error: string | null;
  select: (year: number, complexity: string) => void;
  close: () => void;
}

export function useTimelinesRequests(onlySignedContracts: boolean = false): UseTimelinesRequestsResult {
  const [selection, setSelection] = useState<TimelinesRequestsSelection | null>(null);
  const [items, setItems] = useState<TimelinesRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = useCallback((year: number, complexity: string) => {
    if (selection && selection.year === year && selection.complexity === complexity) {
      setSelection(null);
      setItems([]);
      return;
    }
    setSelection({ year, complexity });
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ year: String(year), complexity });
    if (onlySignedContracts) params.append('onlySignedContracts', 'true');
    fetch(`${getBackendUrl()}/api/overview/timelines/requests?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TimelinesRequestItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Ошибка загрузки');
        setLoading(false);
      });
  }, [selection, onlySignedContracts]);

  const close = useCallback(() => {
    setSelection(null);
    setItems([]);
  }, []);

  return { selection, items, loading, error, select, close };
}
