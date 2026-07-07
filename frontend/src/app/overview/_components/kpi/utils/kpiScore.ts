/**
 * Расчёт балла KPI.
 *
 * Базовая градация (экономия, CSI): балл = факт / цель, с потолком maxScorePercent.
 * SLA градация: линейная шкала «цель → 100 баллов», «100% факта → maxScorePercent баллов».
 */

/** Порог обнуления балла экономии, % выполнения: ниже него балл = 0 (шкала 70–130%). */
export const SAVINGS_SCORE_FLOOR = 70;

/**
 * Базовый балл: факт/цель, ограниченный потолком.
 * floorPercent — нижний порог выполнения: если балл ниже него, обнуляется (по умолчанию 0).
 */
export function calcScore(
  actual: number | null,
  target: number,
  maxScorePercent: number,
  floorPercent: number = 0,
): number {
  if (actual === null || actual === undefined) return 0;
  if (target <= 0) return 0;
  const score = (actual / target) * 100;
  if (score < floorPercent) return 0;
  return Math.min(maxScorePercent, score);
}

/**
 * Балл с линейным бустом выше цели и обнулением ниже цели.
 * - actual < target  → 0 (не достиг цели — балл обнуляется).
 * - actual = target  → ровно 100.
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

  // Ниже цели — обнуление (порог не достигнут).
  if (actual < target) {
    return 0;
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
 * Итоговая выплата по модели «оклад + премия».
 *   Выплата = MIN( MAX(70 + 0.30·КПЭ, КПЭ), cap )
 * где КПЭ — взвешенный процент выполнения (0..cap).
 * Первая ветвь MAX гарантирует, что сотрудник не получит меньше оклада (70%);
 * вторая — что при высоком KPI выплата не опустится ниже самого КПЭ.
 * cap ограничивает выплату сверху (по умолчанию 130%).
 */
export function calcPayout(kpePercent: number, cap: number = 130): number {
  return Math.min(cap, Math.max(70 + 0.3 * kpePercent, kpePercent));
}

/** Гарантированный оклад в модели «оклад + премия», % от дохода. */
export const SALARY_BASE = 70;
/** Порог, выше которого доход считается перевыполнением. */
export const OVERPERF_THRESHOLD = 100;

export interface IncomeBreakdown {
  /** Гарантированный оклад (всегда SALARY_BASE, пока выплата его покрывает). */
  salary: number;
  /** Премиальная часть: от оклада до 100%. */
  bonus: number;
  /** Перевыполнение: всё, что выше 100%. */
  overperf: number;
  /** Итоговая выплата = salary + bonus + overperf. */
  payout: number;
}

/**
 * Раскладывает итоговую выплату на оклад / премию / перевыполнение
 * для визуализации структуры дохода.
 */
export function calcIncomeBreakdown(payout: number): IncomeBreakdown {
  const salary = Math.min(payout, SALARY_BASE);
  const bonus = Math.max(0, Math.min(payout, OVERPERF_THRESHOLD) - SALARY_BASE);
  const overperf = Math.max(0, payout - OVERPERF_THRESHOLD);
  return { salary, bonus, overperf, payout };
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
