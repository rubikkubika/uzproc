'use client';

import { useEffect, useRef } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { Delivery } from '../types/delivery.types';
import { DELIVERY_ID_URL_PARAM } from '../constants/delivery.constants';

/**
 * Открывает карточку конкретной поставки по ссылке из письма: `/?tab=delivery&deliveryId=123`.
 * Параметр обрабатывается один раз и убирается из адреса, чтобы карточка
 * не открывалась повторно при обновлении страницы.
 */
export function useDeliveryDeepLink(openDetails: (delivery: Delivery) => void) {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const deliveryId = params.get(DELIVERY_ID_URL_PARAM);
    if (!deliveryId) return;
    handledRef.current = true;

    const clearParam = () => {
      params.delete(DELIVERY_ID_URL_PARAM);
      const query = params.toString();
      const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    };

    fetch(`${getBackendUrl()}/api/deliveries/${encodeURIComponent(deliveryId)}`)
      .then(response => (response.ok ? response.json() : null))
      .then((delivery: Delivery | null) => {
        if (delivery) openDetails(delivery);
      })
      .catch(() => {
        // Ссылка может вести на удалённую поставку — раздел просто открывается без карточки
      })
      .finally(clearParam);
  }, [openDetails]);
}
