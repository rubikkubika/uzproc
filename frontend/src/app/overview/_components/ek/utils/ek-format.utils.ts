const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Узкий неразрывный пробел перед знаком процента */
const NNBSP = '\u202F';

/** Короткая сумма: «68,6 млрд», «911,0 млн», «850 тыс» */
export function formatAmountShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${nf1.format(value / 1e9)} млрд`;
  if (abs >= 1e6) return `${nf1.format(value / 1e6)} млн`;
  if (abs >= 1e3) return `${nf0.format(value / 1e3)} тыс`;
  return nf0.format(value);
}

/** Знак валюты для полной суммы; null — валюта неизвестна или разные валюты */
export function currencySymbol(currency: string | null | undefined): string | null {
  if (!currency || currency === 'mixed') return null;
  const code = currency.trim().toUpperCase();
  if (code === 'RUB' || code === 'RUR' || code === '₽') return '₽';
  return code;
}

/** Полная сумма: «23 654 800 000 ₽» */
export function formatAmountFull(value: number, currency: string | null): string {
  const amount = nf0.format(Math.round(value));
  return currency ? `${amount} ${currency}` : amount;
}

/** Процент с одной десятичной: «34,5 %» */
export function formatPercent(value: number): string {
  return `${nf1.format(value)}${NNBSP}%`;
}

/** Процент с двумя десятичными: «34,50 %» (подсказки) */
export function formatPercentPrecise(value: number): string {
  return `${nf2.format(value)}${NNBSP}%`;
}

export function formatCount(value: number): string {
  return nf0.format(value);
}
