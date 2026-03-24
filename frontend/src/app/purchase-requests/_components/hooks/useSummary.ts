import { useState, useEffect } from 'react';
import { fetchInWorkPurchaserSummary, fetchCompletedPurchaserSummary } from '../services/purchaseRequests.api';
import { normalizePurchaserName } from '../utils/normalizePurchaser';
import { parseBudgetAmount } from '../utils/buildQueryParams';
import type { RequestKindTab } from '../types/purchase-request.types';

interface PurchaserSummaryItem {
  purchaser: string;
  ordersCount: number;
  purchasesCount: number;
  ordersBudget: number;
  purchasesBudget: number;
  ordersComplexity: number;
  purchasesComplexity: number;
  savings: number;
  averageRating: number | null;
}

interface UseSummaryParams {
  filtersFromHook: Record<string, string>;
  cfoFilter: Set<string>;
  filtersLoadedRef: React.MutableRefObject<boolean>;
  currentYear: number;
  kindTab: RequestKindTab;
}

/**
 * Хук для работы с summary таблицей.
 * Загружает сводку по закупщикам через эндпоинт in-work-summary (без запроса на 1000 полных записей).
 */
export function useSummary(params: UseSummaryParams) {
  const { filtersFromHook, cfoFilter, filtersLoadedRef, currentYear, kindTab } = params;
  const [purchaserSummary, setPurchaserSummary] = useState<PurchaserSummaryItem[]>([]);
  const [completedPurchaserSummary, setCompletedPurchaserSummary] = useState<PurchaserSummaryItem[]>([]);

  useEffect(() => {
    if (!filtersLoadedRef.current) {
      return;
    }

    const fetchSummaryData = async () => {
      try {
        const params = new URLSearchParams();

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

        if (filtersFromHook.name && filtersFromHook.name.trim() !== '') {
          params.append('name', filtersFromHook.name.trim());
        }

        const budgetOperator = filtersFromHook.budgetAmountOperator || 'gte';
        if (filtersFromHook.budgetAmount && filtersFromHook.budgetAmount.trim() !== '') {
          const budgetValue = parseBudgetAmount(filtersFromHook.budgetAmount);
          if (budgetValue !== null) {
            params.append('budgetAmount', String(budgetValue));
            params.append('budgetAmountOperator', budgetOperator);
          }
        }

        if (filtersFromHook.costType && filtersFromHook.costType.trim() !== '') {
          params.append('costType', filtersFromHook.costType.trim());
        }

        if (filtersFromHook.contractType && filtersFromHook.contractType.trim() !== '') {
          params.append('contractType', filtersFromHook.contractType.trim());
        }

        if (filtersFromHook.isPlanned && filtersFromHook.isPlanned.trim() !== '') {
          const isPlannedValue = filtersFromHook.isPlanned.trim();
          if (isPlannedValue === 'Да') {
            params.append('isPlanned', 'true');
          } else if (isPlannedValue === 'Нет') {
            params.append('isPlanned', 'false');
          }
        }

        if (filtersFromHook.hasLinkedPlanItem && filtersFromHook.hasLinkedPlanItem.trim() !== '') {
          const hasLinkedPlanItemValue = filtersFromHook.hasLinkedPlanItem.trim();
          if (hasLinkedPlanItemValue === 'В плане') {
            params.append('hasLinkedPlanItem', 'true');
          } else if (hasLinkedPlanItemValue === 'Не в плане') {
            params.append('hasLinkedPlanItem', 'false');
          }
        }

        if (filtersFromHook.complexity && filtersFromHook.complexity.trim() !== '') {
          params.append('complexity', filtersFromHook.complexity.trim());
        }

        if (filtersFromHook.requiresPurchase && filtersFromHook.requiresPurchase.trim() !== '') {
          const requiresPurchaseValue = filtersFromHook.requiresPurchase.trim();
          if (requiresPurchaseValue === 'Требуется') {
            params.append('requiresPurchase', 'true');
          } else if (requiresPurchaseValue === 'Заказ') {
            params.append('requiresPurchase', 'false');
          }
        }

        // Сводка должна учитывать текущую верхнюю вкладку: Закупки / Заказы
        if (kindTab === 'purchase') {
          params.set('requiresPurchase', 'true');
        } else if (kindTab === 'order') {
          params.set('requiresPurchase', 'false');
        }

        const completedParams = new URLSearchParams(params.toString());
        completedParams.set('year', String(currentYear));
        const [inWorkResult, completedResult] = await Promise.all([
          fetchInWorkPurchaserSummary(params),
          fetchCompletedPurchaserSummary(completedParams),
        ]);

        const normalizeItem = (item: PurchaserSummaryItem) => ({
          ...item,
          purchaser: item.purchaser ? normalizePurchaserName(item.purchaser) : item.purchaser,
          ordersBudget: Number(item.ordersBudget),
          purchasesBudget: Number(item.purchasesBudget),
          ordersComplexity: Number(item.ordersComplexity || 0),
          purchasesComplexity: Number(item.purchasesComplexity || 0),
          savings: Number(item.savings || 0),
          averageRating: item.averageRating != null ? Number(item.averageRating) : null,
        });

        setPurchaserSummary(inWorkResult.map(normalizeItem));
        setCompletedPurchaserSummary(completedResult.map(normalizeItem));
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setPurchaserSummary([]);
        setCompletedPurchaserSummary([]);
      }
    };

    fetchSummaryData();
  }, [filtersFromHook, cfoFilter, filtersLoadedRef, currentYear, kindTab]);

  return {
    summaryData: [],
    setSummaryData: () => {},
    purchaserSummary,
    completedPurchaserSummary,
  };
}
