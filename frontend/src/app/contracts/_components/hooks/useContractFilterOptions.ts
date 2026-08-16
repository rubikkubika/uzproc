'use client';

import { useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';

/**
 * Справочники для выпадающих фильтров таблицы договоров:
 * формы документа и ФИО исполнителей, реально представленные в договорах.
 * Загружаются один раз при монтировании.
 */
export function useContractFilterOptions() {
  const [documentForms, setDocumentForms] = useState<string[]>([]);
  const [preparedByOptions, setPreparedByOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async (path: string, apply: (values: string[]) => void) => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/contracts/${path}`);
        if (!res.ok) return;
        const data: (string | null)[] = await res.json();
        if (cancelled) return;
        apply((data || []).filter((v): v is string => v != null && v.trim() !== ''));
      } catch {
        // Справочник не критичен: при ошибке список останется пустым
      }
    };

    load('document-forms', setDocumentForms);
    load('prepared-by-options', setPreparedByOptions);

    return () => { cancelled = true; };
  }, []);

  return { documentForms, preparedByOptions };
}
