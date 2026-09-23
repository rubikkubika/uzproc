import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import { DraftSlaDaysByComplexity, DraftSlaRow, DraftSlaTable } from '../types/purchase-plan-items.types';

interface UseDraftSlaProps {
  /** Год драфта; null — таблица не загружается (действующий план или год не выбран) */
  year: number | null;
}

/**
 * Таблица SLA драфта плана закупок на год: срок от даты заявки до нового договора по сложности
 * (SLA закупки + SLA договора). Таблица своя на каждый год; новый год по умолчанию копирует предыдущий.
 */
export function useDraftSla({ year }: UseDraftSlaProps) {
  const [table, setTable] = useState<DraftSlaTable | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const url = useCallback(
    (y: number) => `${getBackendUrl()}/api/purchase-plan-items/draft/sla?year=${y}`,
    []
  );

  useEffect(() => {
    if (year === null) {
      setTable(null);
      return;
    }
    let cancelled = false;
    fetch(url(year))
      .then(response => (response.ok ? response.json() : null))
      .then((result: DraftSlaTable | null) => {
        if (!cancelled) setTable(result);
      })
      .catch(() => {
        if (!cancelled) setTable(null);
      });
    return () => {
      cancelled = true;
    };
  }, [year, url]);

  /** Общий срок по сложности для расчёта даты завершения на клиенте (до ответа сервера) */
  const daysByComplexity = useMemo<DraftSlaDaysByComplexity | null>(() => {
    if (!table) return null;
    return Object.fromEntries(table.rows.map(row => [String(row.complexity), row.totalDays]));
  }, [table]);

  /** Сохраняет таблицу; true — сохранено и даты позиций пересчитаны (таблицу позиций нужно перезагрузить) */
  const saveTable = useCallback(async (rows: DraftSlaRow[]): Promise<boolean> => {
    if (year === null) return false;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch(url(year), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows.map(({ complexity, procurementDays, contractDays }) => ({
          complexity, procurementDays, contractDays,
        }))),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `Ошибка сохранения SLA драфта (HTTP ${response.status})`);
      }
      setTable(result as DraftSlaTable);
      setIsModalOpen(false);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось сохранить SLA драфта');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [year, url]);

  const openModal = useCallback(() => {
    setErrorMessage(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return {
    table,
    daysByComplexity,
    isSaving,
    errorMessage,
    isModalOpen,
    openModal,
    closeModal,
    saveTable,
  };
}
