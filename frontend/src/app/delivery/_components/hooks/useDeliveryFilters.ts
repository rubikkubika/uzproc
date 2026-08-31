import { useState, useCallback } from 'react';
import { useDebouncedFiltersSync } from './useDebouncedFiltersSync';
import { useFocusRestore } from './useFocusRestore';

const INITIAL_FILTERS: Record<string, string> = {
  innerId: '',
  contractInnerId: '',
  contractPurchaseRequestId: '',
  supplierName: '',
  status: '',
  currency: '',
  comment: '',
  responsibleName: '',
  reportStatus: '',
  paymentsStatus: '',
};

export type PaymentSchemeFilterValue = '' | 'POSTPAYMENT' | 'PREPAYMENT';
export type ShipmentStatusFilterValue =
  | ''
  /** Спецзначение: статус поставки не заполнен (колонка «Без статуса» в сводке) */
  | 'NONE'
  | 'EXPECTED'
  | 'AWAITING_ADVANCE_PAYMENT'
  | 'DELIVERED'
  | 'OVERDUE';

export const useDeliveryFilters = (setCurrentPage: (page: number) => void) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({ ...INITIAL_FILTERS });
  const [filters, setFilters] = useState<Record<string, string>>({ ...INITIAL_FILTERS });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [paymentSchemeFilter, setPaymentSchemeFilterState] = useState<PaymentSchemeFilterValue>('');
  const [shipmentStatusFilter, setShipmentStatusFilterState] = useState<ShipmentStatusFilterValue>('');
  // Срезы из сводки по ответственным: «Просрочено» и «Поставлено за год».
  // Обычными колонками таблицы не выражаются, поэтому живут отдельными флагами.
  const [overdueFilter, setOverdueFilterState] = useState(false);
  const [deliveredYearFilter, setDeliveredYearFilterState] = useState<number | null>(null);

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

  // «Статус из отчёта» — выпадающий список; применяется сразу (без debounce),
  // поэтому пишем и в localFilters (для value), и в filters (для запроса).
  const setReportStatusFilter = useCallback((value: string) => {
    setLocalFilters(prev => ({ ...prev, reportStatus: value }));
    setFilters(prev => ({ ...prev, reportStatus: value }));
    setCurrentPage(0);
  }, [setCurrentPage]);

  // «Статус оплат» — выпадающий список, применяется сразу (без debounce).
  const setPaymentsStatusFilter = useCallback((value: string) => {
    setLocalFilters(prev => ({ ...prev, paymentsStatus: value }));
    setFilters(prev => ({ ...prev, paymentsStatus: value }));
    setCurrentPage(0);
  }, [setCurrentPage]);

  // «Статус оплаты» (DeliveryStatus) — выпадающий список, применяется сразу.
  const setStatusFilter = useCallback((value: string) => {
    setLocalFilters(prev => ({ ...prev, status: value }));
    setFilters(prev => ({ ...prev, status: value }));
    setCurrentPage(0);
  }, [setCurrentPage]);

  // «Ответственный» — выпадающий список, применяется сразу (без debounce).
  const setResponsibleNameFilter = useCallback((value: string) => {
    setLocalFilters(prev => ({ ...prev, responsibleName: value }));
    setFilters(prev => ({ ...prev, responsibleName: value }));
    setCurrentPage(0);
  }, [setCurrentPage]);

  const handleFilterChange = useCallback((field: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  }, []);

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
    setLocalFilters,
    filters,
    setFilters,
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
    setReportStatusFilter,
    setPaymentsStatusFilter,
    setStatusFilter,
    setResponsibleNameFilter,
  };
};
