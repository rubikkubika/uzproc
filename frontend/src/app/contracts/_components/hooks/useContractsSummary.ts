import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractSummaryItem {
  preparedBy: string;
  count: number;
  countByDocumentForm: Record<string, number>;
}

export function useContractsSummary() {
  const [summaryData, setSummaryData] = useState<ContractSummaryItem[]>([]);
  const [documentForms, setDocumentForms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, formsRes] = await Promise.all([
        fetch(`${getBackendUrl()}/api/contracts/in-work-summary`),
        fetch(`${getBackendUrl()}/api/contracts/in-work-document-forms`),
      ]);
      if (summaryRes.ok) {
        const data: ContractSummaryItem[] = await summaryRes.json();
        setSummaryData(data);
      }
      if (formsRes.ok) {
        const forms: string[] = await formsRes.json();
        setDocumentForms(forms);
      }
    } catch (err) {
      console.error('Error fetching contracts summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summaryData, documentForms, loading, refreshSummary: fetchSummary };
}
