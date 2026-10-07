'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchManagementReportSending,
  sendManagementReportTest,
  type ManagementReportSendingInfo,
} from '@/utils/sending-center.api';
import { SendingMessage } from '../types/purchase-sending.types';
import { formatFileSize } from '../utils/management-report-sending.utils';

/**
 * Раздел «Управленческая отчётность» центра отправки: сведения о рассылке презентации
 * (период, получатели, расписание) и тестовая отправка на тестовый адрес.
 */
export function useManagementReportSending() {
  const [info, setInfo] = useState<ManagementReportSendingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<SendingMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchManagementReportSending(controller.signal)
      .then(setInfo)
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Не удалось загрузить сведения о рассылке');
        setInfo(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const sendTest = useCallback(async () => {
    setSending(true);
    setSendMessage(null);
    try {
      const result = await sendManagementReportTest();
      setSendMessage({
        type: 'success',
        text: `Тестовое письмо отправлено на ${result.recipient}: «${result.fileName}», `
          + `слайдов: ${result.slideCount}, ${formatFileSize(result.fileSizeBytes)}.`,
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

  return { info, loading, sending, error, sendMessage, sendTest };
}
