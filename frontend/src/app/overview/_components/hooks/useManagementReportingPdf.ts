'use client';

import { useCallback, useRef } from 'react';

/**
 * Хук для экспорта управленческой отчётности через window.print() (Print to PDF).
 * Использует CSS @media print для разбиения на страницы.
 */
export function useManagementReportingPdf() {
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const exportPdf = useCallback(() => {
    window.print();
  }, []);

  return { page1Ref, page2Ref, exportPdf };
}
