import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';

export type SummarySegment = 'market' | 'tezkor-ooo' | '1p';

export interface ContractSummaryItem {
  preparedBy: string;
  count: number;
  countByDocumentForm: Record<string, number>;
}

export interface SegmentData {
  summaryData: ContractSummaryItem[];
  documentForms: string[];
  signedSummaryData: ContractSummaryItem[];
  signedDocumentForms: string[];
}

const EMPTY_SEGMENT: SegmentData = {
  summaryData: [],
  documentForms: [],
  signedSummaryData: [],
  signedDocumentForms: [],
};

const SEGMENTS: SummarySegment[] = ['market', 'tezkor-ooo', '1p'];

export function useContractsSummary() {
  const currentYear = new Date().getFullYear();

  const [segmentsData, setSegmentsData] = useState<Record<SummarySegment, SegmentData>>({
    market: { ...EMPTY_SEGMENT },
    'tezkor-ooo': { ...EMPTY_SEGMENT },
    '1p': { ...EMPTY_SEGMENT },
  });
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const results = await Promise.all(
        SEGMENTS.map(async (seg) => {
          const [summaryRes, formsRes, signedSummaryRes, signedFormsRes] = await Promise.all([
            fetch(`${getBackendUrl()}/api/contracts/in-work-summary?segment=${seg}`),
            fetch(`${getBackendUrl()}/api/contracts/in-work-document-forms?segment=${seg}`),
            fetch(`${getBackendUrl()}/api/contracts/signed-summary?year=${currentYear}&segment=${seg}`),
            fetch(`${getBackendUrl()}/api/contracts/signed-document-forms?year=${currentYear}&segment=${seg}`),
          ]);
          return {
            seg,
            summaryData: summaryRes.ok ? await summaryRes.json() : [],
            documentForms: formsRes.ok ? await formsRes.json() : [],
            signedSummaryData: signedSummaryRes.ok ? await signedSummaryRes.json() : [],
            signedDocumentForms: signedFormsRes.ok ? await signedFormsRes.json() : [],
          };
        })
      );

      setSegmentsData({
        market: { ...EMPTY_SEGMENT },
        'tezkor-ooo': { ...EMPTY_SEGMENT },
        '1p': { ...EMPTY_SEGMENT },
        ...Object.fromEntries(results.map(r => [r.seg, {
          summaryData: r.summaryData,
          documentForms: r.documentForms,
          signedSummaryData: r.signedSummaryData,
          signedDocumentForms: r.signedDocumentForms,
        }])),
      });
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
    segmentsData,
    currentYear,
    loading,
    refreshSummary: fetchSummary,
  };
}
