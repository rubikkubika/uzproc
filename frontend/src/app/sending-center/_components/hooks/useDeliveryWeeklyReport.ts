'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchDeliveryWeeklyReport,
  sendDeliveryWeeklyReport,
  type DeliveryWeeklyReportPreview,
} from '@/utils/sending-center.api';
import { DEFAULT_WEEKLY_REPORT_RECIPIENT } from '../constants/delivery-sending.constants';
import { SendingRecipient } from '../types/delivery-sending.types';

/**
 * Подраздел «Недельный отчёт» вкладки «Поставки»: предпросмотр отчёта
 * (неделя с прошлой пятницы по четверг и текущий месяц), получатель и отправка письма.
 */
export function useDeliveryWeeklyReport() {
  const [preview, setPreview] = useState<DeliveryWeeklyReportPreview | null>(null);
  const [recipient, setRecipient] = useState<SendingRecipient>(DEFAULT_WEEKLY_REPORT_RECIPIENT);
  /** true — получателя выбрали вручную, значение с бэкенда его больше не перетирает */
  const recipientPickedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchDeliveryWeeklyReport(controller.signal)
      .then(data => {
        setPreview(data);
        // Получатель по умолчанию задаётся на бэкенде — подставляем, пока его не выбрали вручную
        setRecipient(prev => (recipientPickedRef.current ? prev : {
          fullName: data.defaultRecipientFullName || DEFAULT_WEEKLY_REPORT_RECIPIENT.fullName,
          email: data.defaultRecipientEmail || DEFAULT_WEEKLY_REPORT_RECIPIENT.email,
        }));
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Не удалось загрузить недельный отчёт');
        setPreview(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const pickRecipient = useCallback((picked: SendingRecipient) => {
    setRecipient(picked);
    recipientPickedRef.current = true;
    setSendMessage(null);
  }, []);

  const send = useCallback(async () => {
    setSending(true);
    setSendMessage(null);
    try {
      const result = await sendDeliveryWeeklyReport(recipient.email, recipient.fullName);
      setSendMessage({
        type: 'success',
        text: `Отчёт отправлен на ${result.recipient}. Поставлено: ${result.deliveredCount}, `
          + `просрочено: ${result.overdueCount}, без даты ЭСФ: ${result.missingEsfCount}.`,
      });
    } catch (err) {
      setSendMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отправить отчёт',
      });
    } finally {
      setSending(false);
    }
  }, [recipient]);

  return {
    preview,
    recipient,
    pickRecipient,
    loading,
    sending,
    error,
    sendMessage,
    send,
  };
}
