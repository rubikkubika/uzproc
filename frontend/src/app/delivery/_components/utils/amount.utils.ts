/**
 * Форматирование сумм для модуля поставок.
 * Крупные суммы сокращаются до «млрд» / «млн» (до 2 знаков после запятой);
 * суммы меньше миллиона показываются полностью.
 */
export function formatAmountShort(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null) return '—';
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);

  let out: string;
  if (abs >= 1_000_000_000) {
    out = `${(n / 1_000_000_000).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} млрд`;
  } else if (abs >= 1_000_000) {
    out = `${(n / 1_000_000).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} млн`;
  } else {
    out = n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return currency ? `${out} ${currency}` : out;
}

/** Полная сумма (2 знака, разделители разрядов) — для подсказок (title). */
export function formatAmountFull(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null) return '—';
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const out = n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${out} ${currency}` : out;
}
