'use client';

import { useCallback, useState } from 'react';
import type { Delivery } from '../types/delivery.types';

/** Модальные окна раздела: создание поставки и карточка выбранной поставки. */
export function useDeliveryModals() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  return {
    createOpen,
    openCreate: useCallback(() => setCreateOpen(true), []),
    closeCreate: useCallback(() => setCreateOpen(false), []),
    selectedDelivery,
    openDetails: useCallback((delivery: Delivery) => setSelectedDelivery(delivery), []),
    closeDetails: useCallback(() => setSelectedDelivery(null), []),
  };
}
