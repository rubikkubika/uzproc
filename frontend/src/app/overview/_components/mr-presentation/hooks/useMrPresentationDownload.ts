'use client';

import { useCallback, useState } from 'react';
import { fetchPresentation } from '../utils/mrPresentationApi';
import { presentationFileName } from '../utils/mrPresentationFormat';

/** Выгрузка презентации управленческой отчётности: запрос PDF у бэкенда и сохранение файла. */
export function useMrPresentationDownload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (periodYear: number, periodMonth: number) => {
    setBusy(true);
    setError(null);
    try {
      const blob = await fetchPresentation(periodYear, periodMonth);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = presentationFileName(periodYear, periodMonth);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сформировать презентацию');
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, start };
}
