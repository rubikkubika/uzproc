import { useCallback, useMemo, useState } from 'react';
import { DraftSlaRow, DraftSlaTable } from '../types/purchase-plan-items.types';
import { DRAFT_SLA_MAX_DAYS } from '../constants/purchase-plan-items.constants';

type DraftSlaField = 'procurementDays' | 'contractDays';

/** Значение поля ввода: строка, чтобы можно было временно очистить поле */
interface DraftSlaFormRow {
  complexity: number;
  procurementDays: string;
  contractDays: string;
}

const parseDays = (value: string): number | null => {
  if (value.trim() === '' || !/^\d+$/.test(value.trim())) return null;
  const days = Number(value.trim());
  return days <= DRAFT_SLA_MAX_DAYS ? days : null;
};

/**
 * Редактирование таблицы SLA драфта в модальном окне: локальная копия строк,
 * пересчёт итога по строке и проверка значений (0–365 рабочих дней).
 * Форма монтируется при открытии окна, поэтому каждый раз начинается с сохранённой таблицы.
 */
export function useDraftSlaForm(table: DraftSlaTable | null) {
  const [rows, setRows] = useState<DraftSlaFormRow[]>(() => (table?.rows ?? []).map(row => ({
    complexity: row.complexity,
    procurementDays: String(row.procurementDays),
    contractDays: String(row.contractDays),
  })));

  const updateField = useCallback((complexity: number, field: DraftSlaField, value: string) => {
    setRows(prev => prev.map(row => (row.complexity === complexity ? { ...row, [field]: value } : row)));
  }, []);

  const parsedRows = useMemo(() => rows.map(row => {
    const procurementDays = parseDays(row.procurementDays);
    const contractDays = parseDays(row.contractDays);
    return {
      ...row,
      procurementInvalid: procurementDays === null,
      contractInvalid: contractDays === null,
      totalDays: procurementDays !== null && contractDays !== null ? procurementDays + contractDays : null,
    };
  }), [rows]);

  const isValid = parsedRows.length > 0 && parsedRows.every(row => row.totalDays !== null);

  const isChanged = useMemo(() => {
    if (!table) return false;
    return rows.some(row => {
      const saved = table.rows.find(r => r.complexity === row.complexity);
      return !saved
        || String(saved.procurementDays) !== row.procurementDays.trim()
        || String(saved.contractDays) !== row.contractDays.trim();
    });
  }, [rows, table]);

  /** Строки для сохранения; null, если есть некорректные значения */
  const toSave = useCallback((): DraftSlaRow[] | null => {
    if (!isValid) return null;
    return parsedRows.map(row => ({
      complexity: row.complexity,
      procurementDays: Number(row.procurementDays.trim()),
      contractDays: Number(row.contractDays.trim()),
      totalDays: row.totalDays as number,
    }));
  }, [isValid, parsedRows]);

  return { rows: parsedRows, updateField, isValid, isChanged, toSave };
}
