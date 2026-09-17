'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { DeliveryHorizon } from '../types/delivery-horizon.types';
import type { HorizonKey } from '../types/delivery-query.types';
import { toHorizonCards } from '../utils/delivery-horizon.utils';

/**
 * Горизонт «что горит»: просрочено → сегодня → ближайшие 7 дней → позже → без даты.
 * Считается по всем поставкам: фильтры таблицы, вкладка, выбранный день и группа на карточки не влияют.
 * selectedHorizon нужен только для подсветки выбранной карточки.
 */
export function useDeliveryHorizon(selectedHorizon: HorizonKey | null, reloadKey: number) {
  const [horizon, setHorizon] = useState<DeliveryHorizon | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getBackendUrl()}/api/deliveries/horizon`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DeliveryHorizon>;
      })
      .then(data => { if (!cancelled) setHorizon(data); })
      .catch(err => {
        console.error('Не удалось загрузить горизонт поставок:', err);
        if (!cancelled) setHorizon(null);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const cards = useMemo(() => toHorizonCards(horizon, selectedHorizon), [horizon, selectedHorizon]);

  return { cards };
}
