import { useMemo } from 'react';
import type { RequestKindTab, PurchaseRequest } from '../types/purchase-request.types';

/**
 * Фильтрует заявки по типу (Закупки/Заказы).
 * kindTab и setKindTab управляются в родителе (PurchaseRequestsTable).
 */
export function useKindTabFilter(allItems: PurchaseRequest[], kindTab: RequestKindTab) {
  const itemsToRender = useMemo(() => {
    if (!allItems || allItems.length === 0) return [];

    return allItems.filter(item => {
      const requiresPurchase = item.requiresPurchase;

      // Обрабатываем различные типы данных: boolean, string, number
      // Приводим к any для сравнения с различными типами
      const value: any = requiresPurchase;

      const isPurchase = requiresPurchase === true ||
                        value === 'true' ||
                        value === 'Да' ||
                        value === 'да' ||
                        value === 1;

      const isOrder = requiresPurchase === false ||
                     requiresPurchase === null ||
                     value === 'false' ||
                     value === 'Нет' ||
                     value === 'нет' ||
                     value === 0 ||
                     value === '';

      if (kindTab === 'purchase') {
        return isPurchase;
      } else {
        return isOrder;
      }
    });
  }, [allItems, kindTab]);

  return {
    itemsToRender,
  };
}
