'use client';

import { useCallback } from 'react';
import { useDeliveryTable } from './useDeliveryTable';
import { useDeliveryDeadlineChart } from './useDeliveryDeadlineChart';
import { useDeliveryHorizon } from './useDeliveryHorizon';
import { useDeliveryActiveChips } from './useDeliveryActiveChips';
import { useDeliveryColumns } from './useDeliveryColumns';
import { useDeliveryRows } from './useDeliveryRows';
import { useDeliveryModals } from './useDeliveryModals';
import { useDeliveryBackUrl } from './useDeliveryBackUrl';
import { useDeliveryComments } from './useDeliveryComments';
import { useTour } from '@/app/_components/tour/hooks/useTour';
import { DELIVERY_TOUR_STEPS } from '../constants/delivery-tour.constants';

/** Главный хук раздела «Поставки»: композирует таблицу, горизонт и ленту месяца, чипы и модалки. */
export function useDeliveryPage() {
  const table = useDeliveryTable();
  const { filters, selectPlannedDate, clearHorizon } = table;

  const chart = useDeliveryDeadlineChart({
    reloadKey: table.reloadKey,
    selectedDate: table.plannedDate,
    onSelectDate: selectPlannedDate,
  });
  const horizon = useDeliveryHorizon(table.horizon, table.reloadKey);

  const chips = useDeliveryActiveChips({
    plannedDate: table.plannedDate,
    clearDay: useCallback(() => selectPlannedDate(null), [selectPlannedDate]),
    horizon: table.horizon,
    clearHorizon,
  });

  const comments = useDeliveryComments(table.setCommentsCount);

  return {
    table,
    chart,
    horizon,
    chips,
    columns: useDeliveryColumns(filters),
    rows: useDeliveryRows(table.allItems),
    modals: useDeliveryModals(),
    comments,
    tour: useTour(DELIVERY_TOUR_STEPS),
    backUrl: useDeliveryBackUrl(),
  };
}
