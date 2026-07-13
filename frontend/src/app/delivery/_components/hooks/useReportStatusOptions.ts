import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

/** Загружает уникальные значения «Статуса из отчёта» для выпадающего фильтра. */
export const useReportStatusOptions = () => {
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/deliveries/report-statuses`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as string[];
        if (!cancelled) setOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Не удалось загрузить статусы отчёта:', err);
        if (!cancelled) setOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return options;
};
