import { useState, useCallback } from 'react';
import { useDebouncedFiltersSync } from './useDebouncedFiltersSync';
import { useFocusRestore } from './useFocusRestore';

const INITIAL_FILTERS: Record<string, string> = {
  innerId: '',
  contractInnerId: '',
  supplierName: '',
  status: '',
  currency: '',
  comment: '',
  responsibleName: '',
};

export type PaymentSchemeFilterValue = '' | 'POSTPAYMENT' | 'PREPAYMENT';

export const useDeliveryFilters = (setCurrentPage: (page: number) => void) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({ ...INITIAL_FILTERS });
  const [filters, setFilters] = useState<Record<string, string>>({ ...INITIAL_FILTERS });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [paymentSchemeFilter, setPaymentSchemeFilterState] = useState<PaymentSchemeFilterValue>('');

  const setPaymentSchemeFilter = useCallback((value: PaymentSchemeFilterValue) => {
    setPaymentSchemeFilterState(value);
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
  };
};
