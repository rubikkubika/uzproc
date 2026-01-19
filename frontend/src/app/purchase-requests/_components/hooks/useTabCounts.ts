import { useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { TabType } from '../types/purchase-request.types';

interface Filters {
  idPurchaseRequest?: string;
  name?: string;
  costType?: string;
  contractType?: string;
  requiresPurchase?: string;
  budgetAmount?: string;
  budgetAmountOperator?: string;
}

interface UseTabCountsOptions {
  selectedYear: number | null;
  filtersFromHook: Filters;
  localFilters: Filters;
  cfoFilter: Set<string>;
  purchaserFilter: Set<string>;
  filtersLoadedRef: React.RefObject<boolean>;
  tabCounts: Record<TabType, number | null>;
  setTabCounts: React.Dispatch<React.SetStateAction<Record<TabType, number | null>>>;
}

export function useTabCounts({
  selectedYear,
  filtersFromHook,
  localFilters,
  cfoFilter,
  purchaserFilter,
  filtersLoadedRef,
  tabCounts,
  setTabCounts,
}: UseTabCountsOptions) {

  const fetchTabCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedYear !== null) {
        params.append('year', String(selectedYear));
      }
      
      // Применяем другие фильтры (кроме статуса, так как статусы определяются вкладками)
      if (filtersFromHook.idPurchaseRequest && filtersFromHook.idPurchaseRequest.trim() !== '') {
        const idValue = parseInt(filtersFromHook.idPurchaseRequest.trim(), 10);
        if (!isNaN(idValue)) {
          params.append('idPurchaseRequest', String(idValue));
        }
      }
      if (cfoFilter.size > 0) {
        cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }
      if (purchaserFilter.size > 0) {
        purchaserFilter.forEach(p => {
          params.append('purchaser', p);
        });
      }
      if (filtersFromHook.name && filtersFromHook.name.trim() !== '') {
        params.append('name', filtersFromHook.name.trim());
      }
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
      
      const fetchUrl = `${getBackendUrl()}/api/purchase-requests/tab-counts?${params.toString()}`;
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const result = await response.json();
        
        // Отдельный запрос для подсчета скрытых заявок
        const hiddenParams = new URLSearchParams(params);
        hiddenParams.append('excludeFromInWork', 'true');
        hiddenParams.append('size', '1'); // Минимальный размер для подсчета
        hiddenParams.append('page', '0');
        const hiddenFetchUrl = `${getBackendUrl()}/api/purchase-requests?${hiddenParams.toString()}`;
        
        let hiddenCount = 0;
        try {
          const hiddenResponse = await fetch(hiddenFetchUrl);
          if (hiddenResponse.ok) {
            const hiddenResult = await hiddenResponse.json();
            hiddenCount = hiddenResult.totalElements || 0;
          }
        } catch (err) {
          console.error('Error fetching hidden count:', err);
        }
        
        setTabCounts({
          'all': result['all'] || 0,
          'in-work': result['in-work'] || 0,
          'completed': result['completed'] || 0,
          'project-rejected': result['project-rejected'] || 0,
          'hidden': hiddenCount,
        });
      }
    } catch (err) {
      console.error('Error fetching tab counts:', err);
    }
  }, [selectedYear, filtersFromHook, cfoFilter, purchaserFilter, localFilters]);

  // Загружаем количество для всех вкладок
  useEffect(() => {
    if (!filtersLoadedRef.current) {
      return;
    }
    
    fetchTabCounts();
  }, [filtersLoadedRef, fetchTabCounts]);

  return {
    refreshTabCounts: fetchTabCounts,
  };
}
