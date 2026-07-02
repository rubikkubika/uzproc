import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { TabType } from '../types/contracts.types';

interface UseContractTabCountsOptions {
  selectedYear: number | null;
  filters: Record<string, string>;
  cfoFilter: Set<string>;
  organizationFilter: string;
  preparedByFilter: string;
  segmentFilter: string;
  isTypicalFormFilter: string;
  statusFilter: string;
}

export function useContractTabCounts({
  selectedYear,
  filters,
  cfoFilter,
  organizationFilter,
  preparedByFilter,
  segmentFilter,
  isTypicalFormFilter,
  statusFilter,
}: UseContractTabCountsOptions) {
  const [tabCounts, setTabCounts] = useState<Record<TabType, number | null>>({
    'in-work': null,
    'not-coordinated': null,
    'signed': null,
    'all': null,
    'hidden': null,
  });

  const fetchTabCounts = useCallback(async () => {
    const params = new URLSearchParams();

    if (selectedYear !== null) {
      params.append('year', String(selectedYear));
    }
    if (cfoFilter.size > 0) {
      cfoFilter.forEach(cfo => params.append('cfo', cfo));
    }
    if (filters.innerId?.trim()) params.append('innerId', filters.innerId.trim());
    if (filters.name?.trim()) params.append('name', filters.name.trim());
    if (filters.documentForm?.trim()) params.append('documentForm', filters.documentForm.trim());
    if (filters.costType?.trim()) params.append('costType', filters.costType.trim());
    if (filters.contractType?.trim()) params.append('contractType', filters.contractType.trim());
    if (filters.paymentTerms?.trim()) params.append('paymentTerms', filters.paymentTerms.trim());
    if (filters.purchaseRequestInnerId?.trim()) params.append('purchaseRequestInnerId', filters.purchaseRequestInnerId.trim());
    if (organizationFilter && organizationFilter.trim() !== '') params.append('customerOrganization', organizationFilter.trim());
    if (preparedByFilter && preparedByFilter.trim() !== '') params.append('preparedByName', preparedByFilter.trim());
    if (segmentFilter && segmentFilter.trim() !== '') params.append('segment', segmentFilter.trim());
    if (isTypicalFormFilter === 'true') params.append('isTypicalForm', 'true');
    else if (isTypicalFormFilter === 'false') params.append('isTypicalForm', 'false');
    if (statusFilter && statusFilter.trim() !== '') params.append('status', statusFilter.trim());

    // Один запрос вместо 5×/contracts?size=1 (без обогащения дат на бэкенде)
    try {
      const res = await fetch(`${getBackendUrl()}/api/contracts/tab-counts?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setTabCounts({
        'in-work': data['in-work'] ?? 0,
        'not-coordinated': data['not-coordinated'] ?? 0,
        'signed': data['signed'] ?? 0,
        'all': data['all'] ?? 0,
        'hidden': data['hidden'] ?? 0,
      });
    } catch {
      // оставляем предыдущие значения при ошибке
    }
  }, [selectedYear, filters, cfoFilter, organizationFilter, preparedByFilter, segmentFilter, isTypicalFormFilter, statusFilter]);

  useEffect(() => {
    // fetchTabCounts асинхронный: setState вызывается после await (не синхронный каскад ререндеров)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTabCounts();
  }, [fetchTabCounts]);

  return { tabCounts, refreshTabCounts: fetchTabCounts };
}
