import { MONTH_FULL } from '../constants/mr-presentation.constants';

/** Название месяца: «июль». */
export function monthName(month: number): string {
  return MONTH_FULL[month - 1] ?? '';
}

/**
 * Предыдущий месяц: отчёт готовят за прошедший месяц, поэтому он подставляется
 * в выбор периода по умолчанию.
 */
export function previousPeriod(year: number, month: number): { year: number; month: number } {
  return month <= 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Имя файла презентации. */
export function presentationFileName(year: number, month: number): string {
  return `УО ${monthName(month)} ${year}.pdf`;
}
