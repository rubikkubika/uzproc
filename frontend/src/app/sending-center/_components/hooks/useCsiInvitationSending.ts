'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchCsiInvitation,
  sendCsiInvitationTest,
  type CsiInvitationPreview,
} from '@/utils/sending-center.api';
import { SendingMessage } from '../types/purchase-sending.types';

/**
 * Подраздел «Оценка закупки» вкладки «Закупки»: пример письма инициатору (CSI)
 * и тестовая отправка на тестовый адрес.
 */
export function useCsiInvitationSending() {
  const [preview, setPreview] = useState<CsiInvitationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<SendingMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCsiInvitation(controller.signal)
      .then(setPreview)
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Не удалось загрузить письмо «Оценка закупки»');
        setPreview(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const sendTest = useCallback(async () => {
    setSending(true);
    setSendMessage(null);
    try {
      const result = await sendCsiInvitationTest();
      setSendMessage({
        type: 'success',
        text: `Тестовое письмо отправлено на ${result.recipient}: заявка № ${result.requestNumber}, `
          + `подписанных договоров: ${result.contractCount}.`,
      });
    } catch (err) {
      setSendMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отправить тестовое письмо',
      });
    } finally {
      setSending(false);
    }
  }, []);

  return { preview, loading, sending, error, sendMessage, sendTest };
}
