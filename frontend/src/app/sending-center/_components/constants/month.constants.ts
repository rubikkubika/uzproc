/** Названия месяцев на русском (индекс 1..12). */
export const MONTHS_RU = [
  '',
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_RU[month] ?? ''} ${year}`;
}
