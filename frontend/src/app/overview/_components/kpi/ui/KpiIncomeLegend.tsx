'use client';

/** Легенда цветов структуры дохода для полосы KpiIncomeBar. */
export function KpiIncomeLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-gray-500">
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-sm bg-slate-700" /> Оклад 70%
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" /> Премия · до 30%
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-sm bg-green-500" /> Перевып. · до 30%
      </span>
    </div>
  );
}
