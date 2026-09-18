/** Форматирование данных недельного отчёта по поставкам для интерфейса центра отправки. */

/** ISO-дата (YYYY-MM-DD) → dd.MM.yyyy. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}

/** Период в виде «dd.MM.yyyy — dd.MM.yyyy». */
export function formatPeriod(from: string, to: string): string {
  return `${formatIsoDate(from)} — ${formatIsoDate(to)}`;
}

/** Сумма в сокращённом виде: тыс. / млн / млрд — как в письме отчёта. */
export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '0';
  const value = Number(amount);
  if (!Number.isFinite(value)) return '0';

  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${short(value / 1_000_000_000)} млрд`;
  if (abs >= 1_000_000) return `${short(value / 1_000_000)} млн`;
  if (abs >= 1_000) return `${short(value / 1_000)} тыс.`;
  return short(value);
}

/** Не больше двух знаков после запятой, без хвостовых нулей. */
function short(value: number): string {
  return value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
