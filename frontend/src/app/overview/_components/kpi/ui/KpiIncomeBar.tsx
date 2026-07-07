'use client';

import { calcIncomeBreakdown } from '../utils/kpiScore';

/** Максимум шкалы дохода (потолок выплаты), % — задаёт полную ширину полосы. */
const INCOME_SCALE_MAX = 130;

interface KpiIncomeBarProps {
  /** Итоговая выплата, % (0..130). */
  payout: number;
  /** Показывать числовые подписи сегментов. */
  showLabels?: boolean;
}

/**
 * Горизонтальная составная полоса структуры дохода:
 * оклад (база) · премия (до 100%) · перевыполнение (сверх 100%).
 * Ширина сегментов пропорциональна доле в шкале до INCOME_SCALE_MAX.
 */
export function KpiIncomeBar({ payout, showLabels = false }: KpiIncomeBarProps) {
  const { salary, bonus, overperf } = calcIncomeBreakdown(payout);

  const pct = (v: number) => `${(v / INCOME_SCALE_MAX) * 100}%`;

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex h-3 flex-1 min-w-[90px] overflow-hidden rounded bg-gray-100"
        title={`Оклад ${salary.toFixed(0)}% + Премия ${bonus.toFixed(1)}% + Перевып. ${overperf.toFixed(1)}% = ${payout.toFixed(1)}%`}
      >
        <div className="h-full bg-slate-700" style={{ width: pct(salary) }} />
        {bonus > 0 && <div className="h-full bg-blue-500" style={{ width: pct(bonus) }} />}
        {overperf > 0 && <div className="h-full bg-green-500" style={{ width: pct(overperf) }} />}
      </div>
      {showLabels && (
        <span className="text-[10px] text-gray-500 whitespace-nowrap tabular-nums">
          {salary.toFixed(0)}
          <span className="text-blue-600">+{bonus.toFixed(1)}</span>
          {overperf > 0 && <span className="text-green-600">+{overperf.toFixed(1)}</span>}
        </span>
      )}
    </div>
  );
}
