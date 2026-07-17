'use client';

import { useEffect, useState } from 'react';
import { EtpSnapshot } from '../types/etp.types';
import { ETP_DATA_URL } from '../constants/etp.constants';

interface UseEtpDataResult {
  snapshot: EtpSnapshot | null;
  loading: boolean;
  error: string | null;
}

// Загрузка статического снапшота ЭТП из public/etp/data.json
export function useEtpData(): UseEtpDataResult {
  const [snapshot, setSnapshot] = useState<EtpSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(ETP_DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: EtpSnapshot) => {
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { snapshot, loading, error };
}
