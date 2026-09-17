'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EtpSyncStartResponse, EtpSyncStatus } from '../types/etp-sync.types';
import { ETP_SYNC_POLL_INTERVAL_MS, ETP_SYNC_URL } from '../constants/etp.constants';

interface UseEtpSyncResult {
  status: EtpSyncStatus | null;
  isRunning: boolean;
  /** Ошибка запроса к API (не путать с ошибкой самой синхронизации в status.error) */
  requestError: string | null;
  start: () => Promise<void>;
}

/**
 * Обновление данных ЭТП с b2biz.uz: запуск и опрос прогресса.
 * Работает только для администратора; при открытии раздела подхватывает уже идущее
 * обновление (например, запущенное деплоем). По завершении вызывает onFinished.
 */
export function useEtpSync(enabled: boolean, onFinished: () => void): UseEtpSyncResult {
  const [status, setStatus] = useState<EtpSyncStatus | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const isRunning = status?.state === 'running';

  const fetchStatus = useCallback(async (): Promise<EtpSyncStatus | null> => {
    try {
      const res = await fetch(ETP_SYNC_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as EtpSyncStatus;
      setStatus(data);
      setRequestError(null);
      return data;
    } catch (e) {
      setRequestError(`Не удалось получить статус обновления: ${(e as Error).message}`);
      return null;
    }
  }, []);

  // Статус при открытии раздела
  useEffect(() => {
    if (enabled) fetchStatus();
  }, [enabled, fetchStatus]);

  // Опрос, пока идёт обновление; по завершении — перечитать снапшот
  useEffect(() => {
    if (!enabled || !isRunning) return;
    const timer = setInterval(async () => {
      const next = await fetchStatus();
      if (next && next.state !== 'running') onFinishedRef.current();
    }, ETP_SYNC_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, isRunning, fetchStatus]);

  const start = useCallback(async () => {
    setRequestError(null);
    try {
      const res = await fetch(ETP_SYNC_URL, { method: 'POST' });
      const data = (await res.json()) as EtpSyncStartResponse;
      if (data.status) setStatus(data.status);
      // 409 — обновление уже идёт: просто показываем его прогресс
      if (!res.ok && res.status !== 409) {
        setRequestError(data.error || `Не удалось запустить обновление: HTTP ${res.status}`);
      }
    } catch (e) {
      setRequestError(`Не удалось запустить обновление: ${(e as Error).message}`);
    }
  }, []);

  return { status, isRunning, requestError, start };
}
