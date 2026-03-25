/**
 * Рабочие дни: со следующего дня после даты назначения по дату завершения включительно (пн–пт, без праздников из БД).
 */

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWorkingDay(d: Date, holidayKeys?: Set<string>): boolean {
  const w = d.getDay();
  if (w === 0 || w === 6) return false;
  if (holidayKeys && holidayKeys.size > 0 && holidayKeys.has(toLocalDateKey(d))) return false;
  return true;
}

/**
 * Количество рабочих дней между датами: с (assignmentDate + 1 день) по completionDate включительно.
 */
export function countWorkingDays(
  assignmentDate: Date,
  completionDate: Date,
  holidayKeys?: Set<string>
): number {
  const start = new Date(assignmentDate);
  start.setDate(start.getDate() + 1);
  const end = new Date(completionDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (start.getTime() > end.getTime()) return 1; // минимум 1 день, если назначение и завершение в один день
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    if (isWorkingDay(cur, holidayKeys)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Дата, отстоящая на N рабочих дней от даты назначения (со следующего дня после assignment).
 */
export function addWorkingDays(assignmentDate: Date, days: number, holidayKeys?: Set<string>): Date {
  const start = new Date(assignmentDate);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  if (days <= 0) return start;
  const cur = new Date(start);
  let added = 0;
  while (added < days) {
    if (isWorkingDay(cur, holidayKeys)) added++;
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
