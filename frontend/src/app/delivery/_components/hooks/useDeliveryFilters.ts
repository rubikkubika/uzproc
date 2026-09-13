import { useState, useCallback } from 'react';
import { useDebouncedFiltersSync } from './useDebouncedFiltersSync';
import { useFocusRestore } from './useFocusRestore';
import { INITIAL_FILTERS } from '../constants/delivery.constants';
import type { DeliveryQuery } from '../types/delivery-query.types';

export type PaymentSchemeFilterValue = '' | 'POSTPAYMENT' | 'PREPAYMENT';
export type ShipmentStatusFilterValue =
  | ''
  /** Спецзначение: статус поставки не заполнен (колонка «Без статуса» в сводке) */
  | 'NONE'
  | 'EXPECTED'
  | 'AWAITING_ADVANCE_PAYMENT'
  | 'DELIVERED'
  | 'OVERDUE';

/**
 * @param initial сохранённое состояние таблицы (возврат со страницы договора или заявки) —
 *                фильтры начинаются с него, а не с пустых значений
 */
export const useDeliveryFilters = (setCurrentPage: (page: number) => void, initial: DeliveryQuery | null = null) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(() => ({ ...INITIAL_FILTERS, ...initial?.filters }));
  const [filters, setFilters] = useState<Record<string, string>>(() => ({ ...INITIAL_FILTERS, ...initial?.filters }));
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [paymentSchemeFilter, setPaymentSchemeFilterState] = useState<PaymentSchemeFilterValue>(
    (initial?.paymentScheme ?? '') as PaymentSchemeFilterValue,
  );
  const [shipmentStatusFilter, setShipmentStatusFilterState] = useState<ShipmentStatusFilterValue>(
    (initial?.shipmentStatus ?? '') as ShipmentStatusFilterValue,
  );
  // Срезы из сводки по ответственным: «Просрочено» и «Поставлено за год».
  // Обычными колонками таблицы не выражаются, поэтому живут отдельными флагами.
  const [overdueFilter, setOverdueFilterState] = useState(initial?.overdue ?? false);
  const [deliveredYearFilter, setDeliveredYearFilterState] = useState<number | null>(initial?.deliveredYear ?? null);

  const setPaymentSchemeFilter = useCallback((value: PaymentSchemeFilterValue) => {
    setPaymentSchemeFilterState(value);
    setCurrentPage(0);
  }, [setCurrentPage]);

  const setShipmentStatusFilter = useCallback((value: ShipmentStatusFilterValue) => {
    setShipmentStatusFilterState(value);
    setCurrentPage(0);
  }, [setCurrentPage]);

  const setOverdueFilter = useCallback((value: boolean) => {
    setOverdueFilterState(value);
    setCurrentPage(0);
  }, [setCurrentPage]);

  const setDeliveredYearFilter = useCallback((value: number | null) => {
    setDeliveredYearFilterState(value);
    setCurrentPage(0);
  }, [setCurrentPage]);

  // Выпадающие фильтры применяются сразу (без debounce),
  // поэтому пишем и в localFilters (для value), и в filters (для запроса).
  const setSelectFilter = useCallback((field: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(0);
  }, [setCurrentPage]);

  const setReportStatusFilter = useCallback((value: string) => setSelectFilter('reportStatus', value), [setSelectFilter]);
  const setPaymentsStatusFilter = useCallback((value: string) => setSelectFilter('paymentsStatus', value), [setSelectFilter]);
  // «Статус оплаты» (DeliveryStatus)
  const setStatusFilter = useCallback((value: string) => setSelectFilter('status', value), [setSelectFilter]);
  const setResponsibleNameFilter = useCallback((value: string) => setSelectFilter('responsibleName', value), [setSelectFilter]);

  /** Диапазон плановой даты (ISO, границы включительно); пустая строка — без границы */
  const setPlannedRange = useCallback((from: string, to: string) => {
    setLocalFilters(prev => ({ ...prev, plannedFrom: from, plannedTo: to }));
    setFilters(prev => ({ ...prev, plannedFrom: from, plannedTo: to }));
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleFilterChange = useCallback((field: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  /** Сбрасывает фильтры колонок и срезы сводки */
  const resetAll = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setLocalFilters({ ...INITIAL_FILTERS });
    setPaymentSchemeFilterState('');
    setShipmentStatusFilterState('');
    setOverdueFilterState(false);
    setDeliveredYearFilterState(null);
    setCurrentPage(0);
  }, [setCurrentPage]);

  useDebouncedFiltersSync({
    localFilters,
    filtersFromHook: filters,
    focusedField,
    setFilters,
    setCurrentPage,
  });

  useFocusRestore({ focusedField, localFilters });

  return {
    localFilters,
    filters,
    focusedField,
    setFocusedField,
    handleFilterChange,
    paymentSchemeFilter,
    setPaymentSchemeFilter,
    shipmentStatusFilter,
    setShipmentStatusFilter,
    overdueFilter,
    setOverdueFilter,
    deliveredYearFilter,
    setDeliveredYearFilter,
    setSelectFilter,
    setReportStatusFilter,
    setPaymentsStatusFilter,
    setStatusFilter,
    setResponsibleNameFilter,
    setPlannedRange,
    resetAll,
  };
};

export type DeliveryFiltersHook = ReturnType<typeof useDeliveryFilters>;
