import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { PurchaseRequest, TabType } from '../types/purchase-request.types';
import { TAB_STATUSES } from '../constants/status.constants';

interface Filters {
  idPurchaseRequest?: string;
  name?: string;
  costType?: string;
  contractType?: string;
  requiresPurchase?: string;
  budgetAmount?: string;
  budgetAmountOperator?: string;
}

interface UseAvailableStatusesOptions {
  activeTab: TabType;
  selectedYear: number | null;
  filtersFromHook: Filters;
  localFilters: Filters;
  cfoFilter: Set<string>;
  purchaserFilter: Set<string>;
}

export function useAvailableStatuses({
  activeTab,
  selectedYear,
  filtersFromHook,
  localFilters,
  cfoFilter,
  purchaserFilter,
}: UseAvailableStatusesOptions): string[] {
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  useEffect(() => {
    const fetchAvailableStatuses = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '10000'); // Загружаем достаточно данных для получения всех статусов

        // Учитываем год, если выбран
        if (selectedYear !== null) {
          params.append('year', String(selectedYear));
        }

        // Добавляем все фильтры, КРОМЕ фильтра по статусу
        if (filtersFromHook.idPurchaseRequest && filtersFromHook.idPurchaseRequest.trim() !== '') {
          const idValue = parseInt(filtersFromHook.idPurchaseRequest.trim(), 10);
          if (!isNaN(idValue)) {
            params.append('idPurchaseRequest', String(idValue));
          }
        }

        // Фильтр по ЦФО
        if (cfoFilter.size > 0) {
          cfoFilter.forEach(cfo => {
            params.append('cfo', cfo);
          });
        }

        // Фильтр по закупщику
        if (purchaserFilter.size > 0) {
          purchaserFilter.forEach(p => {
            params.append('purchaser', p);
          });
        }

        if (filtersFromHook.name && filtersFromHook.name.trim() !== '') {
          params.append('name', filtersFromHook.name.trim());
        }

        // Фильтр по бюджету
        const budgetOperator = localFilters.budgetAmountOperator || filtersFromHook.budgetAmountOperator;
        const budgetAmount = localFilters.budgetAmount || filtersFromHook.budgetAmount;
        if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
          const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
          if (!isNaN(budgetValue) && budgetValue >= 0) {
            params.append('budgetAmountOperator', budgetOperator.trim());
            params.append('budgetAmount', String(budgetValue));
          }
        }

        if (filtersFromHook.costType && filtersFromHook.costType.trim() !== '') {
          params.append('costType', filtersFromHook.costType.trim());
        }

        if (filtersFromHook.contractType && filtersFromHook.contractType.trim() !== '') {
          params.append('contractType', filtersFromHook.contractType.trim());
        }

        if (filtersFromHook.requiresPurchase && filtersFromHook.requiresPurchase.trim() !== '') {
          const requiresPurchaseValue = filtersFromHook.requiresPurchase.trim();
          if (requiresPurchaseValue === 'Закупка') {
            params.append('requiresPurchase', 'true');
          } else if (requiresPurchaseValue === 'Заказ') {
            params.append('requiresPurchase', 'false');
          }
        }

        // Учитываем текущую вкладку (но НЕ фильтр по статусу)
        if (activeTab === 'hidden') {
          params.append('excludeFromInWork', 'true');
        } else {
          // Для вкладок, кроме 'all', применяем фильтр по статусам вкладки
          if (activeTab !== 'all') {
            TAB_STATUSES[activeTab].forEach(status => {
              params.append('status', status);
            });
          }

          if (activeTab === 'in-work') {
            params.append('excludeFromInWork', 'false');
          }
        }

        const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
        const response = await fetch(fetchUrl);

        if (response.ok) {
          const result = await response.json();
          const items = result.content || [];

          // Извлекаем уникальные статусы из полученных данных
          const statusSet = new Set<string>();
          items.forEach((request: PurchaseRequest) => {
            if (request.status) {
              const statusStr = String(request.status).trim();
              if (statusStr) {
                statusSet.add(statusStr);
              }
            }
          });

          const statusesArray = Array.from(statusSet).sort();
          setAvailableStatuses(statusesArray);
        } else {
          setAvailableStatuses([]);
        }
      } catch (err) {
        console.error('Error fetching available statuses:', err);
        setAvailableStatuses([]);
      }
    };

    fetchAvailableStatuses();
  }, [
    activeTab,
    selectedYear,
    filtersFromHook.idPurchaseRequest,
    filtersFromHook.name,
    filtersFromHook.costType,
    filtersFromHook.contractType,
    filtersFromHook.requiresPurchase,
    localFilters.budgetAmount,
    localFilters.budgetAmountOperator,
    // Преобразуем Set в строку для сравнения в зависимостях
    Array.from(cfoFilter).sort().join(','),
    Array.from(purchaserFilter).sort().join(','),
    // НЕ включаем statusFilter в зависимости, чтобы статусы обновлялись независимо от фильтра по статусу
  ]);

  return availableStatuses;
}
