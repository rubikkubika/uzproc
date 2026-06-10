/**
 * Расчёт балла KPI.
 *
 * Базовая градация (экономия, CSI): балл = факт / цель, с потолком maxScorePercent.
 * SLA градация: линейная шкала «цель → 100 баллов», «100% факта → maxScorePercent баллов».
 */

/** Базовый балл: факт/цель, ограниченный потолком. Используется для экономии и CSI. */
export function calcScore(
  actual: number | null,
  target: number,
  maxScorePercent: number,
): number {
  if (actual === null || actual === undefined) return 0;
  if (target <= 0) return 0;
  return Math.min(maxScorePercent, (actual / target) * 100);
}

/**
 * Балл SLA по линейной градации.
 * - factPercent ≤ target  → пропорционально вниз (при факте = цель получается ровно 100).
 * - factPercent > target   → линейно от 100 (при факте = цель) до maxScorePercent (при факте = 100%).
 *
 * При allowBoost=false (maxScorePercent=100) выше цели балл остаётся 100.
 */
export function calcSlaScore(
  factPercent: number | null,
  target: number,
  maxScorePercent: number,
): number {
  if (factPercent === null || factPercent === undefined) return 0;
  if (target <= 0) return 0;

  // Ниже или на уровне цели — пропорционально (цель = 100 баллов).
  if (factPercent <= target) {
    return (factPercent / target) * 100;
  }

  // Цель уже на уровне 100% факта (или выше) — расти некуда.
  if (target >= 100) {
    return maxScorePercent;
  }

  // Выше цели — линейная интерполяция от 100 (при цели) до maxScorePercent (при 100% факта).
  const score = 100 + ((factPercent - target) / (100 - target)) * (maxScorePercent - 100);
  return Math.min(maxScorePercent, score);
}
