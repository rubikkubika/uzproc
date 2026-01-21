import { useState, useEffect, useMemo } from 'react';
import type { RequestKindTab, PurchaseRequest } from '../types/purchase-request.types';

export function useKindTabFilter(allItems: PurchaseRequest[]) {
  // Состояние для верхней вкладки (Закупки/Заказы)
  const [kindTab, setKindTab] = useState<RequestKindTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('purchaseRequestsKindTab');
      return (saved === 'purchase' || saved === 'order') ? saved : 'purchase';
    }
    return 'purchase';
  });

  // Сохранение выбранной вкладки в localStorage
  useEffect(() => {
    localStorage.setItem('purchaseRequestsKindTab', kindTab);
  }, [kindTab]);

  // Фильтрация по типу заявки (Закупки/Заказы)
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
    kindTab,
    setKindTab,
    itemsToRender,
  };
}
