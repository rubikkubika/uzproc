'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchUpcomingDeliveries,
  sendUpcomingDeliveriesTest,
  type UpcomingDeliveriesSendResult,
} from '@/utils/sending-center.api';
import {
  DEFAULT_DAYS_AHEAD,
  DEFAULT_TEST_RECIPIENT,
} from '../constants/delivery-sending.constants';

/**
 * Раздел «Поставки» центра отправки: сводка по предстоящим поставкам
 * и отправка тестового письма о них.
 */
export function useDeliverySending() {
  const [days, setDays] = useState<number>(DEFAULT_DAYS_AHEAD);
  const [recipient, setRecipient] = useState<string>(DEFAULT_TEST_RECIPIENT);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchUpcomingDeliveries(days, controller.signal)
      .then(summary => {
        setCount(summary.count);
        // Получатель по умолчанию задаётся на бэкенде — подставляем, пока адрес не меняли вручную
        setRecipient(prev => (prev === DEFAULT_TEST_RECIPIENT ? summary.defaultRecipient : prev));
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Не удалось загрузить предстоящие поставки');
        setCount(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [days]);

  const send = useCallback(async () => {
    setSending(true);
    setSendMessage(null);
    try {
      const result: UpcomingDeliveriesSendResult = await sendUpcomingDeliveriesTest(recipient, days);
      setSendMessage({
        type: 'success',
        text: `Письмо отправлено на ${result.recipient}. Поставок в письме: ${result.deliveryCount}.`,
      });
    } catch (err) {
      setSendMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отправить письмо',
      });
    } finally {
      setSending(false);
    }
  }, [recipient, days]);

  return {
    days,
    setDays,
    recipient,
    setRecipient,
    count,
    loading,
    sending,
    error,
    sendMessage,
    send,
  };
}
