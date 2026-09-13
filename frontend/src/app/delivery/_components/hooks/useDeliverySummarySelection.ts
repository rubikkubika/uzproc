'use client';

import { useCallback, useMemo } from 'react';
import { NO_STATUS_COLUMN, NO_STATUS_FILTER_VALUE, type SummaryCellRef } from '../types/delivery-summary.types';
import { SHIPMENT_STATUS_OPTIONS, DELIVERY_STATUS_OPTIONS } from '../types/delivery.types';
import type { ShipmentStatusFilterValue } from './useDeliveryFilters';
import type { DeliveryTab } from '../types/delivery-query.types';

/** Набор фильтров, которым описывается один клик по сводке */
interface SummarySelection {
  responsible: string;
  /** Статус поставки: значение enum либо спецзначение «без статуса» */
  shipmentStatus: ShipmentStatusFilterValue;
  /** Статус оплаты: значение enum либо спецзначение «без статуса» */
  paymentStatus: string;
  overdue: boolean;
  deliveredYear: number | null;
}

const EMPTY_SELECTION: SummarySelection = {
  responsible: '',
  shipmentStatus: '',
  paymentStatus: '',
  overdue: false,
  deliveredYear: null,
};

interface Params {
  setActiveTab: (tab: DeliveryTab) => void;
  /** Снимает фильтр по годам («Все»): сводка считается по всем датам, и таблица должна показать то же */
  showAllDates: () => void;
  /** Снимает выбранный день и группу горизонта */
  clearDaySelection: () => void;
  /** Год, за который посчитана колонка «Поставлено» в сводке */
  summaryYear: number;
  filters: {
    localFilters: Record<string, string>;
    shipmentStatusFilter: ShipmentStatusFilterValue;
    overdueFilter: boolean;
    deliveredYearFilter: number | null;
    setResponsibleNameFilter: (value: string) => void;
    setShipmentStatusFilter: (value: ShipmentStatusFilterValue) => void;
    setStatusFilter: (value: string) => void;
    setOverdueFilter: (value: boolean) => void;
    setDeliveredYearFilter: (value: number | null) => void;
  };
}

const labelOf = (options: Array<{ value: string; label: string }>, value: string) => (
  value === NO_STATUS_FILTER_VALUE ? NO_STATUS_COLUMN : options.find((o) => o.value === value)?.label ?? value
);

/**
 * Клики по сводке поставок. Любой клик переводит таблицу на вкладку «Все», снимает фильтр
 * по годам, выбранный день и группу горизонта и ставит ровно тот набор фильтров, по которому
 * посчитано число в ячейке, — в таблице оказывается именно то, что показывает ячейка.
 * Повторный клик по уже применённой ячейке снимает выбор.
 * Прежний выбор всегда сбрасывается целиком, чтобы срезы не накладывались друг на друга.
 */
export function useDeliverySummarySelection({ setActiveTab, showAllDates, clearDaySelection, summaryYear, filters }: Params) {
  const {
    localFilters,
    shipmentStatusFilter,
    overdueFilter,
    deliveredYearFilter,
    setResponsibleNameFilter,
    setShipmentStatusFilter,
    setStatusFilter,
    setOverdueFilter,
    setDeliveredYearFilter,
  } = filters;
  const responsible = localFilters.responsibleName ?? '';
  const paymentStatus = localFilters.status ?? '';

  /** Текущий выбор уже совпадает с этим набором фильтров? */
  const isApplied = useCallback((selection: SummarySelection) => (
    responsible === selection.responsible
    && shipmentStatusFilter === selection.shipmentStatus
    && paymentStatus === selection.paymentStatus
    && overdueFilter === selection.overdue
    && deliveredYearFilter === selection.deliveredYear
  ), [responsible, paymentStatus, shipmentStatusFilter, overdueFilter, deliveredYearFilter]);

  const setSelection = useCallback((next: SummarySelection) => {
    setResponsibleNameFilter(next.responsible);
    setShipmentStatusFilter(next.shipmentStatus);
    setStatusFilter(next.paymentStatus);
    setOverdueFilter(next.overdue);
    setDeliveredYearFilter(next.deliveredYear);
  }, [setResponsibleNameFilter, setShipmentStatusFilter, setStatusFilter, setOverdueFilter, setDeliveredYearFilter]);

  /** Применяет набор фильтров целиком; повторный клик по тому же набору снимает его */
  const apply = useCallback((selection: SummarySelection) => {
    setActiveTab('all');
    // Сводка считается без ограничения по годам, поэтому фильтр дат тоже снимаем —
    // иначе таблица показала бы меньше строк, чем число в ячейке
    showAllDates();
    clearDaySelection();
    setSelection(isApplied(selection) ? EMPTY_SELECTION : selection);
  }, [isApplied, setActiveTab, showAllDates, clearDaySelection, setSelection]);

  const clearSelection = useCallback(() => setSelection(EMPTY_SELECTION), [setSelection]);

  /** ФИО или «Всего»: все поставки ответственного */
  const onResponsibleClick = useCallback((name: string) => {
    apply({ ...EMPTY_SELECTION, responsible: name });
  }, [apply]);

  /** Ячейка статуса поставки («Без статуса» — спецзначение фильтра) */
  const onShipmentStatusClick = useCallback((name: string, statusLabel: string) => {
    const value = statusLabel === NO_STATUS_COLUMN
      ? NO_STATUS_FILTER_VALUE
      : SHIPMENT_STATUS_OPTIONS.find((o) => o.label === statusLabel)?.value;
    if (!value) return;
    apply({ ...EMPTY_SELECTION, responsible: name, shipmentStatus: value as ShipmentStatusFilterValue });
  }, [apply]);

  /** Ячейка статуса оплаты («Без статуса» — спецзначение фильтра) */
  const onPaymentStatusClick = useCallback((name: string, statusLabel: string) => {
    const value = statusLabel === NO_STATUS_COLUMN
      ? NO_STATUS_FILTER_VALUE
      : DELIVERY_STATUS_OPTIONS.find((o) => o.label === statusLabel)?.value;
    if (!value) return;
    apply({ ...EMPTY_SELECTION, responsible: name, paymentStatus: value });
  }, [apply]);

  /** «Просрочено»: не поставлено, плановая дата поставки уже прошла */
  const onOverdueClick = useCallback((name: string) => {
    apply({ ...EMPTY_SELECTION, responsible: name, overdue: true });
  }, [apply]);

  /** «Поставлено за год»: статус «Поставлено» с фактической датой поставки в этом году */
  const onDeliveredClick = useCallback((name: string) => {
    apply({ ...EMPTY_SELECTION, responsible: name, deliveredYear: summaryYear });
  }, [apply, summaryYear]);

  /** Ячейка сводки, соответствующая текущим фильтрам (для обводки), и подпись среза для чипа */
  const { selectedCell, sliceLabel } = useMemo((): { selectedCell: SummaryCellRef | null; sliceLabel: string } => {
    if (!responsible && !overdueFilter && deliveredYearFilter === null) return { selectedCell: null, sliceLabel: '' };
    let cell: SummaryCellRef;
    let column: string;
    if (overdueFilter) {
      cell = { responsible, kind: 'overdue' };
      column = 'Просрочено';
    } else if (deliveredYearFilter !== null) {
      cell = { responsible, kind: 'delivered' };
      column = `Поставлено ${deliveredYearFilter}`;
    } else if (shipmentStatusFilter) {
      column = labelOf(SHIPMENT_STATUS_OPTIONS, shipmentStatusFilter);
      cell = { responsible, kind: 'shipment', status: column };
    } else if (paymentStatus) {
      column = labelOf(DELIVERY_STATUS_OPTIONS, paymentStatus);
      cell = { responsible, kind: 'payment', status: column };
    } else {
      cell = { responsible, kind: 'total' };
      column = '';
    }
    return {
      selectedCell: cell,
      sliceLabel: [responsible, column].filter(Boolean).join(' · '),
    };
  }, [responsible, overdueFilter, deliveredYearFilter, shipmentStatusFilter, paymentStatus]);

  return {
    onResponsibleClick,
    onShipmentStatusClick,
    onPaymentStatusClick,
    onOverdueClick,
    onDeliveredClick,
    clearSelection,
    selectedCell,
    selectedResponsible: responsible,
    sliceLabel,
  };
}

export type DeliverySummarySelectionHook = ReturnType<typeof useDeliverySummarySelection>;
