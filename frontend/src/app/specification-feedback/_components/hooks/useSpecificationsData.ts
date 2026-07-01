import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { SpecificationItem } from '../types/specification-feedback.types';
import {
  DOCUMENT_FORM_SPECIFICATION,
} from '../constants/specification-feedback.constants';
import { isDateInMonth } from '../utils/specification-feedback.utils';

/**
 * Загрузка данных для формы оценки спецификаций.
 * Источник — существующий API контрактов (/api/contracts). Сохранения пока нет.
 */
export function useSpecificationsData() {
  /** Список названий ЦФО (по которым есть контракты). */
  const fetchCfoNames = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/cfos/names?for=contracts`);
      if (!response.ok) throw new Error('Не удалось загрузить список ЦФО');
      return await response.json();
    } catch (err) {
      console.error('Error fetching CFO names:', err);
      return [];
    }
  }, []);

  /**
   * Спецификации для оценки: завершённые (подписанные) спецификации выбранного ЦФО,
   * у которых дата синхронизации попадает в выбранный месяц.
   */
  const fetchSpecifications = useCallback(
    async (cfo: string, year: number, month: number): Promise<SpecificationItem[]> => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '500');
        params.append('year', String(year));
        params.append('documentForm', DOCUMENT_FORM_SPECIFICATION);
        params.append('signedTab', 'true'); // только подписанные, подготовленные договорником
        if (cfo) params.append('cfo', cfo);

        const response = await fetch(`${getBackendUrl()}/api/contracts?${params.toString()}`);
        if (!response.ok) throw new Error(`Ошибка загрузки спецификаций: ${response.status}`);

        const result = await response.json();
        const content: SpecificationItem[] = result?.content ?? [];

        // Отбираем по дате синхронизации в выбранном месяце (signedTab=true уже отфильтровал договорников)
        return content.filter((item) => isDateInMonth(item.synchronizationDate, year, month));
      } catch (err) {
        console.error('Error fetching specifications:', err);
        throw err;
      }
    },
    []
  );

  return { fetchCfoNames, fetchSpecifications };
}
