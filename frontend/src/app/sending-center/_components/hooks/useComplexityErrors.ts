'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchComplexityErrors,
  sendComplexityErrors,
  type ComplexityErrorPreview,
} from '@/utils/sending-center.api';
import { SendingMessage } from '../types/purchase-sending.types';
import { buildSendResultText } from '../utils/complexity-errors.utils';

/** Ключ «отправки всем» в состоянии sendingKey. */
const SEND_ALL_KEY = '__all__';

/**
 * Подраздел «Ошибка сложности» вкладки «Закупки»: закупки текущего года без сложности
 * по закупщикам, ручная отправка уведомлений (одному закупщику или всем).
 */
export function useComplexityErrors() {
  const [preview, setPreview] = useState<ComplexityErrorPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Кому сейчас уходит письмо: ключ закупщика или SEND_ALL_KEY */
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<SendingMessage | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setPreview(await fetchComplexityErrors(signal));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Не удалось загрузить закупки без сложности');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const send = useCallback(async (purchaserKey?: string) => {
    setSendingKey(purchaserKey ?? SEND_ALL_KEY);
    setSendMessage(null);
    try {
      const result = await sendComplexityErrors(purchaserKey);
      setSendMessage({
        type: result.errors.length > 0 || result.sentCount === 0 ? 'error' : 'success',
        text: buildSendResultText(result),
      });
      await load();
    } catch (err) {
      setSendMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отправить уведомления',
      });
    } finally {
      setSendingKey(null);
    }
  }, [load]);

  const sendAll = useCallback(() => {
    const count = preview?.purchasers.filter(p => p.email).length ?? 0;
    if (count === 0) return;
    if (!window.confirm(`Отправить письма ${count} закупщикам?`)) return;
    send();
  }, [preview, send]);

  const toggleExpanded = useCallback((purchaserKey: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(purchaserKey)) next.delete(purchaserKey);
      else next.add(purchaserKey);
      return next;
    });
  }, []);

  const sendableCount = preview?.purchasers.filter(p => p.email).length ?? 0;

  return {
    preview,
    loading,
    error,
    sendMessage,
    sendingKey,
    isSendingAll: sendingKey === SEND_ALL_KEY,
    sendableCount,
    expanded,
    toggleExpanded,
    sendOne: send,
    sendAll,
  };
}
