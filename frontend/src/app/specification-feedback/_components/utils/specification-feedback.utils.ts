import { RATING_LABELS } from '../constants/specification-feedback.constants';
import { RatingLabel } from '../types/specification-feedback.types';

/** Форматирование суммы с валютой (как в форме CSI). */
export function formatCurrency(amount: number | null, currency: string | null): string {
  if (!amount) return '-';
  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency || 'UZS'}`;
}

/** Форматирование даты в формат ДД.ММ.ГГГГ. */
export function formatDate(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Метка рейтинга по значению (цвет + подпись). */
export function getRatingMeta(rating: number): RatingLabel | null {
  if (rating === 0) return null;
  for (const entry of RATING_LABELS) {
    if (rating >= entry.min && rating <= entry.max) return entry;
  }
  return null;
}

/** Проверяет, что дата попадает в указанный месяц и год (month 1-based). */
export function isDateInMonth(date: string | null, year: number, month: number): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}
