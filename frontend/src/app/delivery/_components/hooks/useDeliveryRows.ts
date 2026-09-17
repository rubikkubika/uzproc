'use client';

import { useMemo } from 'react';
import type { Delivery } from '../types/delivery.types';
import { toDeliveryRowView } from '../utils/delivery-row.utils';
import { startOfToday } from '../utils/date.utils';

/** Строки таблицы, подготовленные к отображению: сигнал, цвета статусов, форматированные суммы. */
export function useDeliveryRows(items: Delivery[]) {
  return useMemo(() => {
    const today = startOfToday();
    return items.map((item) => toDeliveryRowView(item, today));
  }, [items]);
}
