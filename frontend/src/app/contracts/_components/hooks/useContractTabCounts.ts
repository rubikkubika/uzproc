import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { TabType } from '../types/contracts.types';

interface UseContractTabCountsOptions {
  selectedYear: number | null;
  filters: Record<string, string>;
  cfoFilter: Set<string>;
  organizationFilter: string;
}

async function fetchCount(params: URLSearchParams, extra?: Record<string, string>): Promise<number> {
  const p = new URLSearchParams(params);
  p.set('page', '0');
  p.set('size', '1');
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  }
  try {
    const res = await fetch(`${getBackendUrl()}/api/contracts?${p.toString()}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.totalElements ?? 0;
  } catch {
    return 0;
  }
}

export function useContractTabCounts({
  selectedYear,
  filters,
  cfoFilter,
  organizationFilter,
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

    const [inWorkCount, notCoordinatedCount, signedCount, allCount, hiddenCount] = await Promise.all([
      fetchCount(params, { inWorkTab: 'true' }),
      fetchCount(params, { notCoordinatedTab: 'true' }),
      fetchCount(params, { signedTab: 'true' }),
      fetchCount(params),
      fetchCount(params, { hiddenTab: 'true' }),
    ]);

    setTabCounts({
      'in-work': inWorkCount,
      'not-coordinated': notCoordinatedCount,
      'signed': signedCount,
      'all': allCount,
      'hidden': hiddenCount,
    });
  }, [selectedYear, filters, cfoFilter, organizationFilter]);

  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts]);

  return { tabCounts, refreshTabCounts: fetchTabCounts };
}
