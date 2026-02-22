import { useState, useEffect } from 'react';
import { fetchStatusGroupsByRequiresPurchase } from '../services/purchaseRequests.api';
import type { RequestKindTab } from '../types/purchase-request.types';

/**
 * Загружает группы статусов только для текущего типа заявки (Закупки/Заказы).
 * Используется фильтром «Группа статуса», чтобы в «Закупках» не показывать группы из заказов и наоборот.
 */
export function useStatusGroupsByKind(kindTab: RequestKindTab) {
  const [statusGroups, setStatusGroups] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const requiresPurchase = kindTab === 'purchase';
    fetchStatusGroupsByRequiresPurchase(requiresPurchase)
      .then((list) => {
        if (!cancelled) {
          setStatusGroups(list || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusGroups([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kindTab]);

  return statusGroups;
}
