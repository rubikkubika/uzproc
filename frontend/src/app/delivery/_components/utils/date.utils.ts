/** Дата в формате ДД.ММ.ГГГГ; для пустого значения — тире. */
export function formatDate(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('ru-RU');
}

/** Сегодняшняя дата в формате YYYY-MM-DD (для input[type=date]). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Максимальная (самая поздняя) из дат; null, если дат нет. */
export function maxDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d) && !Number.isNaN(new Date(d as string).getTime()));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b));
}
