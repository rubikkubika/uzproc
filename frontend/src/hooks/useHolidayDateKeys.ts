'use client';

import { useEffect, useState } from 'react';
import { fetchHolidays } from '@/utils/holidays.api';

/**
 * Ключи дат YYYY-MM-DD для расчёта рабочих дней на клиенте (синхронно с таблицей holidays на бэкенде).
 */
export function useHolidayDateKeys(from: string, to: string): Set<string> {
  const [keys, setKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetchHolidays(from, to, controller.signal)
      .then((rows) => {
        setKeys(new Set(rows.map((r) => r.calendarDate)));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setKeys(new Set());
        }
      });
    return () => controller.abort();
  }, [from, to]);

  return keys;
}
