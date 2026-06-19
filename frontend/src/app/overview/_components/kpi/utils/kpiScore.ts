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
 * Балл с линейным бустом выше цели.
 * - actual ≤ target  → пропорционально вниз (при факте = цель получается ровно 100).
 * - actual > target  → линейно от 100 (при факте = цель) до maxScorePercent (при факте = maxValue).
 *
 * maxValue — значение факта, при котором достигается потолок maxScorePercent
 * (для SLA это 100%, для CSI — максимальная оценка 5.0).
 * При allowBoost=false (maxScorePercent=100) выше цели балл остаётся 100.
 */
export function calcBoostedScore(
  actual: number | null,
  target: number,
  maxScorePercent: number,
  maxValue: number,
): number {
  if (actual === null || actual === undefined) return 0;
  if (target <= 0) return 0;

  // Ниже или на уровне цели — пропорционально (цель = 100 баллов).
  if (actual <= target) {
    return (actual / target) * 100;
  }

  // Цель уже на уровне максимума факта (или выше) — расти некуда.
  if (target >= maxValue) {
    return maxScorePercent;
  }

  // Выше цели — линейная интерполяция от 100 (при цели) до maxScorePercent (при maxValue).
  const score = 100 + ((actual - target) / (maxValue - target)) * (maxScorePercent - 100);
  return Math.min(maxScorePercent, score);
}

/**
 * Балл SLA по линейной градации: потолок достигается при факте 100%.
 */
export function calcSlaScore(
  factPercent: number | null,
  target: number,
  maxScorePercent: number,
): number {
  return calcBoostedScore(factPercent, target, maxScorePercent, 100);
}
