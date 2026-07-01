/**
 * Сокращённый формат суммы: млн/млрд (две цифры после запятой, ru-RU).
 * Например: 2 039 065 414.58 → «2,04 млрд», 8 060 000 → «8,06 млн».
 */
export function formatAmountShortRu(value: number | null): string {
  if (value == null) return '0';
  const abs = Math.abs(value);
  const fmt = (v: number) =>
    v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 1_000_000_000) return `${fmt(value / 1_000_000_000)} млрд`;
  if (abs >= 1_000_000) return `${fmt(value / 1_000_000)} млн`;
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}
