'use client';

import { useCallback, useRef } from 'react';

/**
 * Хук для экспорта управленческой отчётности через window.print().
 * Разбиение на страницы выполняется через @media print в globals.css.
 */
export function useManagementReportingPdf() {
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const exportPdf = useCallback(() => {
    window.print();
  }, []);

  return { page1Ref, page2Ref, exportPdf };
}
