/** Дата в формате ДД.ММ.ГГГГ; для пустого значения — тире. */
export function formatDate(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('ru-RU');
}

/** Короткая дата ДД.ММ.ГГ для плотной таблицы; для пустого значения — тире. */
export function formatShortDate(value: string | null | undefined, fallback = '—'): string {
  const full = formatDate(value, '');
  return full ? `${full.slice(0, 6)}${full.slice(8)}` : fallback;
}

/** Сегодняшняя дата в формате YYYY-MM-DD (для input[type=date]). */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Локальная дата в формате YYYY-MM-DD (без сдвига часового пояса, в отличие от toISOString). */
export function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Разбор ISO-даты YYYY-MM-DD как локальной полуночи. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Начало сегодняшнего дня (локальная полночь). */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Разница в целых днях: a − b. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** Максимальная (самая поздняя) из дат; null, если дат нет. */
export function maxDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d) && !Number.isNaN(new Date(d as string).getTime()));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b));
}
