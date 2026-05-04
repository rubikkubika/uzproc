import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractSummaryItem {
  preparedBy: string;
  count: number;
}

export function useContractsSummary() {
  const [summaryData, setSummaryData] = useState<ContractSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getBackendUrl()}/api/contracts/in-work-summary`);
      if (!res.ok) return;
      const data: ContractSummaryItem[] = await res.json();
      setSummaryData(data);
    } catch (err) {
      console.error('Error fetching contracts summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summaryData, loading, refreshSummary: fetchSummary };
}
