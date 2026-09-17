'use client';

import { useCallback, useEffect, useState } from 'react';
import { EtpSnapshot } from '../types/etp.types';
import { ETP_DATA_URL } from '../constants/etp.constants';

interface UseEtpDataResult {
  snapshot: EtpSnapshot | null;
  loading: boolean;
  error: string | null;
  /** Перечитать снапшот (после обновления с b2biz) */
  reload: () => void;
}

// Загрузка снапшота ЭТП (/etp/data.json отдаёт маршрут app/etp/[...path] из ETP_DATA_DIR)
export function useEtpData(): UseEtpDataResult {
  const [snapshot, setSnapshot] = useState<EtpSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    // loading=true только до первой загрузки: при перезагрузке после обновления старые данные остаются на экране
    fetch(ETP_DATA_URL, { cache: 'no-store' })
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
  }, [reloadKey]);

  return { snapshot, loading, error, reload };
}
