import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection, TabType } from '../types/contracts.types';

export const useContractsData = () => {
  const fetchYears = useCallback(async (): Promise<number[]> => {
    try {
      const fetchUrl = `${getBackendUrl()}/api/contracts/years`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error('Не удалось загрузить список годов');
      }
      const years = await response.json();
      return years;
    } catch (err) {
      console.error('Error fetching years:', err);
      return [];
    }
  }, []);

  const fetchData = useCallback(async (
    page: number,
    size: number,
    year: number | null = null,
    sortField: SortField = null,
    sortDirection: SortDirection = null,
    filters: Record<string, string> = {},
    cfoFilter: Set<string> = new Set(),
    activeTab: TabType = 'all',
    isTypicalFormFilter: string = '',
    organizationFilter: string = '',
    preparedByFilter: string = ''
  ): Promise<PageResponse | null> => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));

      if (year !== null) {
        params.append('year', String(year));
      }

      if (sortField && sortDirection) {
        params.append('sortBy', sortField);
        params.append('sortDir', sortDirection);
      }

      // Добавляем параметры фильтрации
      if (filters.innerId && filters.innerId.trim() !== '') {
        params.append('innerId', filters.innerId.trim());
      }

      // Фильтр по ЦФО - передаем все выбранные значения на бэкенд
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }

      if (filters.name && filters.name.trim() !== '') {
        params.append('name', filters.name.trim());
      }
      if (filters.documentForm && filters.documentForm.trim() !== '') {
        params.append('documentForm', filters.documentForm.trim());
      }
      if (filters.costType && filters.costType.trim() !== '') {
        params.append('costType', filters.costType.trim());
      }
      if (filters.contractType && filters.contractType.trim() !== '') {
        params.append('contractType', filters.contractType.trim());
      }
      if (filters.paymentTerms && filters.paymentTerms.trim() !== '') {
        params.append('paymentTerms', filters.paymentTerms.trim());
      }
      if (filters.purchaseRequestInnerId && filters.purchaseRequestInnerId.trim() !== '') {
        params.append('purchaseRequestInnerId', filters.purchaseRequestInnerId.trim());
      }

      if (isTypicalFormFilter === 'true') {
        params.append('isTypicalForm', 'true');
      } else if (isTypicalFormFilter === 'false') {
        params.append('isTypicalForm', 'false');
      }

      if (organizationFilter && organizationFilter.trim() !== '') {
        params.append('customerOrganization', organizationFilter.trim());
      }

      if (preparedByFilter && preparedByFilter.trim() !== '') {
        params.append('preparedByName', preparedByFilter.trim());
      }

      // Вкладка "В работе": подготовил = договорник, без Подписан и Не согласован, без скрытых
      if (activeTab === 'in-work') {
        params.append('inWorkTab', 'true');
      }
      // Вкладка "Не согласованы": статус Не согласован и подготовил = договорник
      if (activeTab === 'not-coordinated') {
        params.append('notCoordinatedTab', 'true');
      }
      // Вкладка "Подписаны": статус Подписан и подготовил = договорник
      if (activeTab === 'signed') {
        params.append('signedTab', 'true');
      }
      // Вкладка "Скрытые": только договоры с excludeFromInWork = true
      if (activeTab === 'hidden') {
        params.append('hiddenTab', 'true');
      }

      const fetchUrl = `${getBackendUrl()}/api/contracts?${params.toString()}`;
      console.log('Fetching contracts from:', fetchUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}. ${errorText}`);
      }
      const result = await response.json();
      console.log('Contracts response:', result);
      return result;
    } catch (err) {
      console.error('Error fetching contracts:', err);
      throw err;
    }
  }, []);

  return {
    fetchData,
    fetchYears,
  };
};
