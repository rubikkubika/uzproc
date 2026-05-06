import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface ContractSummaryItem {
  preparedBy: string;
  count: number;
  countByDocumentForm: Record<string, number>;
}

export function useContractsSummary() {
  const currentYear = new Date().getFullYear();

  const [summaryData, setSummaryData] = useState<ContractSummaryItem[]>([]);
  const [documentForms, setDocumentForms] = useState<string[]>([]);
  const [signedSummaryData, setSignedSummaryData] = useState<ContractSummaryItem[]>([]);
  const [signedDocumentForms, setSignedDocumentForms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, formsRes, signedSummaryRes, signedFormsRes] = await Promise.all([
        fetch(`${getBackendUrl()}/api/contracts/in-work-summary`),
        fetch(`${getBackendUrl()}/api/contracts/in-work-document-forms`),
        fetch(`${getBackendUrl()}/api/contracts/signed-summary?year=${currentYear}`),
        fetch(`${getBackendUrl()}/api/contracts/signed-document-forms?year=${currentYear}`),
      ]);
      if (summaryRes.ok) setSummaryData(await summaryRes.json());
      if (formsRes.ok) setDocumentForms(await formsRes.json());
      if (signedSummaryRes.ok) setSignedSummaryData(await signedSummaryRes.json());
      if (signedFormsRes.ok) setSignedDocumentForms(await signedFormsRes.json());
    } catch (err) {
      console.error('Error fetching contracts summary:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summaryData,
    documentForms,
    signedSummaryData,
    signedDocumentForms,
    currentYear,
    loading,
    refreshSummary: fetchSummary,
  };
}
