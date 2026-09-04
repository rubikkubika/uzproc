'use client';

import { useCallback, useRef, useState } from 'react';
import { loadMrPresentationData } from '../utils/mrPresentationApi';
import { exportPresentationToPdf } from '../utils/mrPresentationPdf';
import { presentationFileName } from '../utils/mrPresentationFormat';
import type { MrExportPhase, MrSlaInput } from '../types/mr-presentation.types';

interface UseMrPresentationExportParams {
  /** Показатели SLA со страницы управленческой отчётности. */
  sla: MrSlaInput;
}

/**
 * Оркестрация выгрузки презентации: загрузка данных → пошаговый offscreen-рендер
 * слайдов → многостраничный PDF 16:9.
 */
export function useMrPresentationExport({ sla }: UseMrPresentationExportParams) {
  const [phase, setPhase] = useState<MrExportPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const slaRef = useRef(sla);
  slaRef.current = sla;

  /** Запуск выгрузки за указанный отчётный период. */
  const start = useCallback(async (periodYear: number, periodMonth: number) => {
    setError(null);
    setProgress(null);
    setPhase('loading');

    let data;
    try {
      data = await loadMrPresentationData({
        periodYear,
        periodMonth,
        dataYear: periodYear,
        sla: slaRef.current,
      });
    } catch {
      setError('Не удалось загрузить данные для презентации');
      setPhase('error');
      return;
    }

    setPhase('building');
    try {
      await exportPresentationToPdf(
        data,
        presentationFileName(periodYear, periodMonth),
        (done, total) => setProgress({ done, total })
      );
      setPhase('idle');
    } catch {
      setError('Не удалось сформировать PDF');
      setPhase('error');
    } finally {
      setProgress(null);
    }
  }, []);

  const busy = phase === 'loading' || phase === 'building';

  return { phase, busy, error, progress, start };
}
