import { ALL_COLUMNS, PURCHASER_CHECKED_COLUMN } from '../constants/purchase-plan-items.constants';

/**
 * «Фамилия Имя, 11.09.2026, 14:30» — кто и когда последний раз нажимал отметку у позиции плана.
 * null, если отметку ещё не нажимали.
 */
export function formatAuditInfo(by: string | null | undefined, at: string | null | undefined): string | null {
  if (!by && !at) return null;
  const date = at
    ? new Date(at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  return [by || 'пользователь не определён', date].filter(Boolean).join(', ');
}

/** Подписи полей истории изменений, которых нет среди колонок таблицы */
const CHANGE_FIELD_LABELS: Record<string, string> = {
  [PURCHASER_CHECKED_COLUMN.key]: PURCHASER_CHECKED_COLUMN.label,
};

/** Подпись поля в истории изменений: название колонки, а если такой колонки нет — ключ поля */
export function getChangeFieldLabel(fieldName: string | null | undefined): string {
  if (!fieldName) return '-';
  return CHANGE_FIELD_LABELS[fieldName] ?? ALL_COLUMNS.find(col => col.key === fieldName)?.label ?? fieldName;
}
