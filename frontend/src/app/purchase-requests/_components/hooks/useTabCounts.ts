import { useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { TabType, RequestKindTab } from '../types/purchase-request.types';

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
  cfoFilter: Set<string>;
  purchaserFilter: Set<string>;
  /** Ref для обратной совместимости с хуками, которые проверяют загрузку по ref */
  filtersLoadedRef: React.RefObject<boolean>;
  /** State: true после восстановления фильтров из localStorage (нужен для перезапуска эффекта при возврате с детальной страницы) */
  filtersLoaded: boolean;
  tabCounts: Record<TabType, number | null>;
  setTabCounts: React.Dispatch<React.SetStateAction<Record<TabType, number | null>>>;
  kindTab: RequestKindTab;
}

export function useTabCounts({
  selectedYear,
  filtersFromHook,
  cfoFilter,
  purchaserFilter,
  filtersLoadedRef,
  filtersLoaded,
  tabCounts,
  setTabCounts,
  kindTab,
}: UseTabCountsOptions) {

  const fetchTabCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (selectedYear !== null) {
        params.append('year', String(selectedYear));
      }

      // Применяем фильтр по типу заявки (Закупки/Заказы)
      if (kindTab === 'purchase') {
        params.append('requiresPurchase', 'true');
      } else {
        params.append('requiresPurchase', 'false');
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
      // Удалили старую обработку requiresPurchase из filtersFromHook, так как теперь используем kindTab
      
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
  }, [selectedYear, filtersFromHook, cfoFilter, purchaserFilter, setTabCounts, kindTab]);

  // Загружаем количество для всех вкладок (filtersLoaded — state, чтобы эффект перезапустился после восстановления при возврате с детальной страницы)
  useEffect(() => {
    if (!filtersLoaded) {
      return;
    }
    fetchTabCounts();
  }, [filtersLoaded, fetchTabCounts]);

  return {
    refreshTabCounts: fetchTabCounts,
  };
}
