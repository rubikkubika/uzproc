'use client';

import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface TimelinesComplexityRow {
  complexity: string;
  requestCount: number;
  avgDaysByStage: Record<string, number>;
}

export interface TimelinesYearRow {
  year: number;
  requestCount: number;
  avgDaysByStage: Record<string, number>;
  byComplexity: TimelinesComplexityRow[];
}

export interface TimelinesData {
  stages: string[];
  rows: TimelinesYearRow[];
}

interface UseOverviewTimelinesDataResult {
  data: TimelinesData | null;
  loading: boolean;
  error: string | null;
}

export function useOverviewTimelinesData(active: boolean, onlySignedContracts: boolean = false): UseOverviewTimelinesDataResult {
  const [data, setData] = useState<TimelinesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (onlySignedContracts) params.append('onlySignedContracts', 'true');
    const qs = params.toString();
    fetch(`${getBackendUrl()}/api/overview/timelines${qs ? `?${qs}` : ''}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: TimelinesData) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки данных');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, onlySignedContracts]);

  return { data, loading, error };
}
