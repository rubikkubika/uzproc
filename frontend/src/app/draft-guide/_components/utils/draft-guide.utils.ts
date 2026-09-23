import type { DraftSlaTable } from '@/app/purchase-plan/_components/types/purchase-plan-items.types';
import type { GuideData } from '../types/draft-guide.types';

/** Сроки по сложности 1–4 одной строкой, напр. «14 / 18 / 26 / 41» */
export function formatSlaTotals(table: DraftSlaTable | null): string | null {
  if (!table || table.rows.length === 0) return null;
  return table.rows.map(row => row.totalDays).join(' / ');
}

/** Пустая инструкция: пока данные не загружены, тексты выводятся со словесными заглушками */
export const EMPTY_GUIDE_DATA: GuideData = {
  year: null,
  prevYear: null,
  sla: null,
  purchasers: [],
  subjects: { bad: null, good: null },
  checked: [],
};

/** Заглушки на случай, когда год не выбран или таблица SLA ещё не загружена */
const FALLBACK = {
  year: 'года планирования',
  prevYear: 'предыдущего года',
  sla: 'по таблице SLA',
} as const;

/**
 * Подставляет в текст значения плейсхолдеров `{year}`, `{prevYear}` и `{sla}`.
 * Неизвестные значения заменяются словесной формулировкой, чтобы фраза оставалась читаемой.
 */
export function fillGuideText(text: string, data: GuideData): string {
  return text
    .replace(/\{year\}/g, data.year !== null ? String(data.year) : FALLBACK.year)
    .replace(/\{prevYear\}/g, data.prevYear !== null ? String(data.prevYear) : FALLBACK.prevYear)
    .replace(/\{sla\}/g, data.sla ?? FALLBACK.sla);
}
