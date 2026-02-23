/**
 * Рабочие дни: со следующего дня после даты назначения по дату завершения включительно (только пн–пт).
 */

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

/**
 * Количество рабочих дней между датами: с (assignmentDate + 1 день) по completionDate включительно.
 */
export function countWorkingDays(assignmentDate: Date, completionDate: Date): number {
  const start = new Date(assignmentDate);
  start.setDate(start.getDate() + 1);
  const end = new Date(completionDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (start.getTime() > end.getTime()) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    if (isWeekday(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Дата, отстоящая на N рабочих дней от даты назначения (со следующего дня после assignment).
 * Возвращает дату завершения: assignment + 1 день + N рабочих дней.
 */
export function addWorkingDays(assignmentDate: Date, days: number): Date {
  const start = new Date(assignmentDate);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  if (days <= 0) return start;
  const cur = new Date(start);
  let added = 0;
  while (added < days) {
    if (isWeekday(cur)) added++;
    if (added < days) cur.setDate(cur.getDate() + 1);
  }
  return cur;
}

/** Формат даты для input type="date": YYYY-MM-DD */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Парсинг YYYY-MM-DD в Date (локальная полночь) */
export function parseDateInputValue(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
