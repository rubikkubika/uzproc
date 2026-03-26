import { useState, useEffect } from 'react';
import { fetchInWorkPurchaserSummary, fetchCompletedPurchaserSummary } from '../services/purchaseRequests.api';
import { normalizePurchaserName } from '../utils/normalizePurchaser';
import type { RequestKindTab } from '../types/purchase-request.types';
import type { PurchaserSummaryItem } from '../types/purchase-requests-summary.types';

interface UseSummaryParams {
  currentYear: number;
  kindTab: RequestKindTab;
}

/**
 * Хук для работы с summary таблицей.
 * Загружает сводку по закупщикам без учёта фильтров основной таблицы.
 * Данные зависят только от выбранного года и вкладки (Закупки/Заказы).
 */
export function useSummary(params: UseSummaryParams) {
  const { currentYear, kindTab } = params;
  const [purchaserSummary, setPurchaserSummary] = useState<PurchaserSummaryItem[]>([]);
  const [completedPurchaserSummary, setCompletedPurchaserSummary] = useState<PurchaserSummaryItem[]>([]);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const params = new URLSearchParams();

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
          averageSlaDays: item.averageSlaDays != null ? Number(item.averageSlaDays) : null,
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
  }, [currentYear, kindTab]);

  return {
    summaryData: [],
    setSummaryData: () => {},
    purchaserSummary,
    completedPurchaserSummary,
  };
}
