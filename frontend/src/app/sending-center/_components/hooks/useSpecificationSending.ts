import { useCallback, useEffect, useState } from 'react';
import {
  fetchSpecificationSending,
  sendSpecifications,
  CfoSpecificationSending,
} from '@/utils/sending-center.api';

/**
 * Логика вкладки «Спецификации» Центра отправки:
 * переключение месяцев, загрузка списка ЦФО, отправка писем.
 */
export function useSpecificationSending() {
  // По умолчанию показываем предыдущий месяц от текущего.
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [year, setYear] = useState(prev.getFullYear());
  const [month, setMonth] = useState(prev.getMonth() + 1); // 1..12

  const [rows, setRows] = useState<CfoSpecificationSending[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Статус отправки по ЦФО.
  const [sendingCfo, setSendingCfo] = useState<Record<string, boolean>>({});
  const [sendMessage, setSendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      fetchSpecificationSending(year, month, signal)
        .then((data) => setRows(data))
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          console.error(err);
          setError('Не удалось загрузить список');
          setRows([]);
        })
        .finally(() => setLoading(false));
    },
    [year, month]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const prevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, []);

  const send = useCallback(
    async (cfoName: string) => {
      setSendingCfo((prev) => ({ ...prev, [cfoName]: true }));
      setSendMessage(null);
      try {
        const result = await sendSpecifications(year, month, cfoName);
        setSendMessage({
          type: 'success',
          text: `Отправлено «${cfoName}» на ${result.recipient} (спецификаций: ${result.specificationCount})`,
        });
        load();
      } catch (err) {
        setSendMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Ошибка отправки',
        });
      } finally {
        setSendingCfo((prev) => ({ ...prev, [cfoName]: false }));
      }
    },
    [year, month, load]
  );

  return {
    year,
    month,
    rows,
    loading,
    error,
    sendingCfo,
    sendMessage,
    prevMonth,
    nextMonth,
    send,
    reload: load,
  };
}
