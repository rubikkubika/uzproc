'use client';

import { useCallback } from 'react';
import { useDeliveryTable } from './useDeliveryTable';
import { useDeliveryDeadlineChart } from './useDeliveryDeadlineChart';
import { useDeliveryHorizon } from './useDeliveryHorizon';
import { useDeliveryResponsibleSummary } from './useDeliveryResponsibleSummary';
import { useDeliverySummarySelection } from './useDeliverySummarySelection';
import { useSummaryHeatmap } from './useSummaryHeatmap';
import { usePanelsCollapse } from './usePanelsCollapse';
import { useDeliveryActiveChips } from './useDeliveryActiveChips';
import { useDeliveryColumns } from './useDeliveryColumns';
import { useDeliveryRows } from './useDeliveryRows';
import { useDeliveryModals } from './useDeliveryModals';
import { useDeliveryBackUrl } from './useDeliveryBackUrl';
import { useTour } from '@/app/_components/tour/hooks/useTour';
import { DELIVERY_TOUR_STEPS } from '../constants/delivery-tour.constants';

/** Главный хук раздела «Поставки»: композирует таблицу, сводку, блок «По дням», панели, чипы и модалки. */
export function useDeliveryPage() {
  const table = useDeliveryTable();
  const { filters, selectPlannedDate, clearHorizon } = table;

  const chart = useDeliveryDeadlineChart({
    query: table.query,
    reloadKey: table.reloadKey,
    selectedDate: table.plannedDate,
    onSelectDate: selectPlannedDate,
  });
  const horizon = useDeliveryHorizon(table.query, table.reloadKey);

  // Сводка по ответственным не зависит от фильтров таблицы, в том числе от фильтра дат:
  // колонка «Поставлено» всегда за текущий год и подписана им.
  const summaryYear = table.currentYear;
  const summary = useDeliveryResponsibleSummary(summaryYear);
  const heatmap = useSummaryHeatmap(summary.summary);

  const clearDaySelection = useCallback(() => {
    selectPlannedDate(null);
    clearHorizon();
  }, [selectPlannedDate, clearHorizon]);

  // Клики по ячейкам сводки ставят таблице ровно те фильтры, по которым посчитана ячейка
  const summarySelection = useDeliverySummarySelection({
    setActiveTab: table.setActiveTab,
    showAllDates: table.handleShowAll,
    clearDaySelection,
    summaryYear,
    filters,
  });

  const chips = useDeliveryActiveChips({
    sliceLabel: summarySelection.sliceLabel,
    clearSlice: summarySelection.clearSelection,
    plannedDate: table.plannedDate,
    clearDay: useCallback(() => selectPlannedDate(null), [selectPlannedDate]),
    horizon: table.horizon,
    clearHorizon,
  });

  return {
    table,
    chart,
    horizon,
    summary,
    summaryYear,
    heatmap,
    summarySelection,
    chips,
    panels: usePanelsCollapse(),
    columns: useDeliveryColumns(filters),
    rows: useDeliveryRows(table.allItems, summarySelection.selectedResponsible),
    modals: useDeliveryModals(),
    tour: useTour(DELIVERY_TOUR_STEPS),
    backUrl: useDeliveryBackUrl(),
  };
}
