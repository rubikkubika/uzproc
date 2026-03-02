/**
 * Утилиты для расчёта SLA на вкладке Обзор.
 * Используются в SlaStatusBlock и при формировании блока «Требует внимания».
 */

/** Количество рабочих дней (пн–пт) между датами: день назначения не учитывается, считаем со следующего дня по end включительно. */
export function countWorkingDaysBetween(assignmentDate: Date, endDate: Date): number {
  const start = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
  start.setDate(start.getDate() + 1); // со следующего дня после назначения
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  if (start.getTime() > e.getTime()) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= e.getTime()) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Дата назначения + N рабочих дней (плановое завершение). День назначения не считается. */
export function addWorkingDays(assignmentDate: Date, workingDays: number): Date {
  if (workingDays <= 0) {
    const d = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
    d.setDate(d.getDate() + 1);
    return d;
  }
  const start = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
  start.setDate(start.getDate() + 1); // со следующего дня
  let remaining = workingDays;
  const cur = new Date(start);
  while (remaining > 0) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) remaining--;
    if (remaining > 0) cur.setDate(cur.getDate() + 1);
  }
  return cur;
}

/** Плановый срок SLA (дней) по сложности: 1→3, 2→7, 3→15, 4→30 — для отображения. */
export function getPlannedSlaDays(complexity: string | null): string {
  if (complexity == null || complexity.trim() === '') return '—';
  const c = complexity.trim();
  if (c === '1') return '3';
  if (c === '2') return '7';
  if (c === '3') return '15';
  if (c === '4') return '30';
  return '—';
}

/** Плановый срок SLA в днях (число) или null. */
export function getPlannedSlaDaysNumber(complexity: string | null): number | null {
  if (complexity == null || complexity.trim() === '') return null;
  const c = complexity.trim();
  if (c === '1') return 3;
  if (c === '2') return 7;
  if (c === '3') return 15;
  if (c === '4') return 30;
  return null;
}
