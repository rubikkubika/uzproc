import { useCallback, useState } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface DraftGenerationResult {
  year: number;
  contractsSelected: number;
  created: number;
  skipped: number;
}

interface UsePurchasePlanDraftActionsProps {
  /** Год драфта (год планирования) */
  year: number | null;
  /** Перезагрузка данных таблицы после изменения драфта */
  onRefresh: () => void;
}

/**
 * Действия над драфтом плана закупок: формирование позиций из действующих договоров
 * и полная очистка драфта за год.
 */
export function usePurchasePlanDraftActions({ year, onRefresh }: UsePurchasePlanDraftActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [lastResult, setLastResult] = useState<DraftGenerationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildUrl = useCallback((path: string) => {
    const params = new URLSearchParams();
    if (year !== null) {
      params.append('year', String(year));
    }
    const query = params.toString();
    return `${getBackendUrl()}/api/purchase-plan-items${path}${query ? `?${query}` : ''}`;
  }, [year]);

  const generateDraft = useCallback(async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch(buildUrl('/draft/generate'), { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Ошибка формирования драфта (HTTP ${response.status})`);
      }
      const result: DraftGenerationResult = await response.json();
      setLastResult(result);
      onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось сформировать драфт');
    } finally {
      setIsGenerating(false);
    }
  }, [buildUrl, onRefresh]);

  const clearDraft = useCallback(async () => {
    setIsClearing(true);
    setErrorMessage(null);
    try {
      const response = await fetch(buildUrl('/draft'), { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Ошибка очистки драфта (HTTP ${response.status})`);
      }
      setLastResult(null);
      onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось очистить драфт');
    } finally {
      setIsClearing(false);
    }
  }, [buildUrl, onRefresh]);

  return {
    isGenerating,
    isClearing,
    lastResult,
    errorMessage,
    generateDraft,
    clearDraft,
  };
}
