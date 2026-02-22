import { useState, useEffect } from 'react';
import { getBackendUrl, fetchDeduped } from '@/utils/api';
import type { PurchaseRequest, TabType } from '../types/purchase-request.types';
import { TAB_STATUS_GROUPS, FETCH_LIMITS } from '../constants/status.constants';

interface Filters {
  idPurchaseRequest?: string;
  name?: string;
  costType?: string;
  contractType?: string;
  complexity?: string;
  requiresPurchase?: string;
  budgetAmount?: string;
  budgetAmountOperator?: string;
}

interface UseAvailableStatusGroupsOptions {
  activeTab: TabType;
  selectedYear: number | null;
  selectedMonth: number | null;
  filtersFromHook: Filters;
  cfoFilter: Set<string>;
  purchaserFilter: Set<string>;
}

export function useAvailableStatuses({
  activeTab,
  selectedYear,
  selectedMonth,
  filtersFromHook,
  cfoFilter,
  purchaserFilter,
}: UseAvailableStatusGroupsOptions): string[] {
  const [availableStatusGroups, setAvailableStatusGroups] = useState<string[]>([]);

  useEffect(() => {
    const fetchAvailableStatusGroups = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', String(FETCH_LIMITS.AVAILABLE_STATUSES_PAGE_SIZE));

        // Фильтр по дате назначения на закупщика (год и месяц)
        if (selectedYear !== null) {
          params.append('approvalAssignmentYear', String(selectedYear));
        }
        if (selectedMonth !== null && selectedMonth >= 1 && selectedMonth <= 12) {
          params.append('approvalAssignmentMonth', String(selectedMonth));
        }

        // Добавляем все фильтры, КРОМЕ фильтра по группе статуса
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

        // Фильтр по бюджету (используем только filtersFromHook, который обновляется после debounce)
        const budgetOperator = filtersFromHook.budgetAmountOperator || 'gte';
        const budgetAmount = filtersFromHook.budgetAmount;
        if (budgetAmount && budgetAmount.trim() !== '') {
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

        if (filtersFromHook.complexity && filtersFromHook.complexity.trim() !== '') {
          params.append('complexity', filtersFromHook.complexity.trim());
        }

        if (filtersFromHook.requiresPurchase && filtersFromHook.requiresPurchase.trim() !== '') {
          const requiresPurchaseValue = filtersFromHook.requiresPurchase.trim();
          if (requiresPurchaseValue === 'Закупка') {
            params.append('requiresPurchase', 'true');
          } else if (requiresPurchaseValue === 'Заказ') {
            params.append('requiresPurchase', 'false');
          }
        }

        // Учитываем текущую вкладку (но НЕ фильтр по группе статуса)
        if (activeTab === 'hidden') {
          params.append('excludeFromInWork', 'true');
        } else {
          // Для вкладок, кроме 'all', применяем фильтр по группам статусов вкладки
          if (activeTab !== 'all') {
            TAB_STATUS_GROUPS[activeTab].forEach(statusGroup => {
              params.append('statusGroup', statusGroup);
            });
          }

          if (activeTab === 'in-work') {
            params.append('excludeFromInWork', 'false');
          }
        }

        const fetchUrl = `${getBackendUrl()}/api/purchase-requests?${params.toString()}`;
        const response = await fetchDeduped(fetchUrl);

        if (response.ok) {
          const result = await response.json();
          const items = result.content || [];

          // Извлекаем уникальные группы статусов из полученных данных
          const statusGroupSet = new Set<string>();
          items.forEach((request: PurchaseRequest) => {
            if (request.statusGroup) {
              const statusGroupStr = String(request.statusGroup).trim();
              if (statusGroupStr) {
                statusGroupSet.add(statusGroupStr);
              }
            }
          });

          const statusGroupsArray = Array.from(statusGroupSet).sort();
          setAvailableStatusGroups(statusGroupsArray);
        } else {
          setAvailableStatusGroups([]);
        }
      } catch (err) {
        console.error('Error fetching available status groups:', err);
        setAvailableStatusGroups([]);
      }
    };

    fetchAvailableStatusGroups();
  }, [
    activeTab,
    selectedYear,
    selectedMonth,
    filtersFromHook.idPurchaseRequest,
    filtersFromHook.name,
    filtersFromHook.costType,
    filtersFromHook.contractType,
    filtersFromHook.requiresPurchase,
    filtersFromHook.budgetAmount,
    filtersFromHook.budgetAmountOperator,
    // Преобразуем Set в строку для сравнения в зависимостях
    Array.from(cfoFilter).sort().join(','),
    Array.from(purchaserFilter).sort().join(','),
    // НЕ включаем statusFilter в зависимости, чтобы группы статусов обновлялись независимо от фильтра по группе статуса
  ]);

  return availableStatusGroups;
}
