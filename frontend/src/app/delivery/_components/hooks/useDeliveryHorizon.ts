'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { DeliveryHorizon } from '../types/delivery-horizon.types';
import type { DeliveryQuery } from '../types/delivery-query.types';
import { buildDeliveryQueryParams } from '../utils/delivery-query.utils';
import { toHorizonCards } from '../utils/delivery-horizon.utils';

/**
 * Горизонт «что горит»: просрочено → сегодня → ближайшие 7 дней → позже → без даты.
 * Считается по фильтрам таблицы без выбранного дня и группы, чтобы карточки не обнулялись собственным выбором,
 * и без вкладки — как и лента, горизонт показывает все поставки.
 */
export function useDeliveryHorizon(query: DeliveryQuery, reloadKey: number) {
  const [horizon, setHorizon] = useState<DeliveryHorizon | null>(null);
  const paramsStr = buildDeliveryQueryParams(query, { includeDaySelection: false, includeTab: false }).toString();

  useEffect(() => {
    let cancelled = false;
    fetch(`${getBackendUrl()}/api/deliveries/horizon?${paramsStr}`)
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
  }, [paramsStr, reloadKey]);

  const cards = useMemo(() => toHorizonCards(horizon, query.horizon), [horizon, query.horizon]);

  return { cards };
}
