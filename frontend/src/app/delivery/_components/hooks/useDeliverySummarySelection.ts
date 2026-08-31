'use client';

import { useCallback } from 'react';
import { NO_STATUS_COLUMN, NO_STATUS_FILTER_VALUE } from '../types/delivery-summary.types';
import { SHIPMENT_STATUS_OPTIONS, DELIVERY_STATUS_OPTIONS } from '../types/delivery.types';
import type { ShipmentStatusFilterValue } from './useDeliveryFilters';
import type { DeliveryTab } from '../ui/DeliveryTableTabs';

/** Набор фильтров, которым описывается один клик по сводке */
interface SummarySelection {
  responsible: string;
  /** Статус поставки: значение enum либо спецзначение «без статуса» */
  shipmentStatus: ShipmentStatusFilterValue;
  /** Статус оплаты: название статуса либо спецзначение «без статуса» */
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

/**
 * Клики по сводке поставок. Любой клик переводит таблицу на вкладку «Все», снимает фильтр
 * по годам и ставит ровно тот набор фильтров, по которому посчитано число в ячейке, —
 * в таблице оказывается именно то, что показывает ячейка.
 * Сводка тоже считается по всем поставкам, без учёта вкладок и фильтра дат.
 * Повторный клик по уже применённой ячейке снимает выбор.
 * Прежний выбор всегда сбрасывается целиком, чтобы срезы не накладывались друг на друга.
 */
export function useDeliverySummarySelection({ setActiveTab, showAllDates, summaryYear, filters }: Params) {
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

  /** Текущий выбор уже совпадает с этим набором фильтров? */
  const isApplied = useCallback((selection: SummarySelection) => (
    (localFilters.responsibleName ?? '') === selection.responsible
    && shipmentStatusFilter === selection.shipmentStatus
    && (localFilters.status ?? '') === selection.paymentStatus
    && overdueFilter === selection.overdue
    && deliveredYearFilter === selection.deliveredYear
  ), [localFilters.responsibleName, localFilters.status, shipmentStatusFilter, overdueFilter, deliveredYearFilter]);

  /** Применяет набор фильтров целиком; повторный клик по тому же набору снимает его */
  const apply = useCallback((selection: SummarySelection) => {
    const next = isApplied(selection) ? EMPTY_SELECTION : selection;
    setActiveTab('all');
    // Сводка считается без ограничения по годам, поэтому фильтр дат тоже снимаем —
    // иначе таблица показала бы меньше строк, чем число в ячейке
    showAllDates();
    setResponsibleNameFilter(next.responsible);
    setShipmentStatusFilter(next.shipmentStatus);
    setStatusFilter(next.paymentStatus);
    setOverdueFilter(next.overdue);
    setDeliveredYearFilter(next.deliveredYear);
  }, [isApplied, setActiveTab, showAllDates, setResponsibleNameFilter, setShipmentStatusFilter, setStatusFilter, setOverdueFilter, setDeliveredYearFilter]);

  /** ФИО или «Всего»: все поставки ответственного */
  const onResponsibleClick = useCallback((responsible: string) => {
    apply({ ...EMPTY_SELECTION, responsible });
  }, [apply]);

  /** Ячейка статуса поставки («Без статуса» — спецзначение фильтра) */
  const onShipmentStatusClick = useCallback((responsible: string, statusLabel: string) => {
    const value = statusLabel === NO_STATUS_COLUMN
      ? NO_STATUS_FILTER_VALUE
      : SHIPMENT_STATUS_OPTIONS.find((o) => o.label === statusLabel)?.value;
    if (!value) return;
    apply({ ...EMPTY_SELECTION, responsible, shipmentStatus: value as ShipmentStatusFilterValue });
  }, [apply]);

  /** Ячейка статуса оплаты («Без статуса» — спецзначение фильтра) */
  const onPaymentStatusClick = useCallback((responsible: string, statusLabel: string) => {
    const value = statusLabel === NO_STATUS_COLUMN
      ? NO_STATUS_FILTER_VALUE
      : DELIVERY_STATUS_OPTIONS.find((o) => o.label === statusLabel)?.value;
    if (!value) return;
    apply({ ...EMPTY_SELECTION, responsible, paymentStatus: value });
  }, [apply]);

  /** «Просрочено»: не поставлено, плановая дата поставки уже прошла */
  const onOverdueClick = useCallback((responsible: string) => {
    apply({ ...EMPTY_SELECTION, responsible, overdue: true });
  }, [apply]);

  /** «Поставлено за год»: статус «Поставлено» с фактической датой поставки в этом году */
  const onDeliveredClick = useCallback((responsible: string) => {
    apply({ ...EMPTY_SELECTION, responsible, deliveredYear: summaryYear });
  }, [apply, summaryYear]);

  return {
    onResponsibleClick,
    onShipmentStatusClick,
    onPaymentStatusClick,
    onOverdueClick,
    onDeliveredClick,
  };
}
