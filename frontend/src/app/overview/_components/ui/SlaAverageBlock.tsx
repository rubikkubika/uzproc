'use client';

/**
 * Блок: средний процент выполнения СЛА в году.
 * Отображается слева от диаграммы на вкладке СЛА.
 * Два значения: факт (только завершённые) и с учётом прогноза (заявки у закупщика; «требует внимания» считаем не выполненными).
 */
export interface SlaAverageBlockProps {
  year: number;
  /** Средний % по году — факт (взвешенный: сумма metSla / сумма totalCompleted). null — нет данных. */
  averagePercentage: number | null;
  /** Средний % с учётом прогноза: факт + заявки у закупщика с плановым завершением в году; «требует внимания» = не выполнено. */
  averageWithForecast?: number | null;
  loading?: boolean;
  error?: string | null;
}

export function SlaAverageBlock({
  year,
  averagePercentage,
  averageWithForecast,
  loading,
  error,
}: SlaAverageBlockProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col justify-center h-[200px] w-40 shrink-0">
        <p className="text-xs font-medium text-gray-700 leading-tight">Средний % СЛА</p>
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col justify-center h-[200px] w-40 shrink-0">
      <p className="text-xs font-medium text-gray-700 leading-tight">Средний % СЛА</p>
      <p className="text-[10px] text-gray-500 leading-tight">{year} г.</p>
      {loading ? (
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">Загрузка…</p>
      ) : (
        <div className="mt-0.5 space-y-0.5">
          <div className="leading-tight">
            <span className="text-[10px] text-gray-500">факт: </span>
            {averagePercentage != null ? (
              <span className="text-lg font-semibold text-gray-900">{Math.round(averagePercentage)}%</span>
            ) : (
              <span className="text-xs text-gray-500">—</span>
            )}
          </div>
          <div className="leading-tight">
            <span className="text-[10px] text-gray-500">с уч. прогноза: </span>
            {averageWithForecast != null ? (
              <span className="text-lg font-semibold text-gray-900">{Math.round(averageWithForecast)}%</span>
            ) : (
              <span className="text-xs text-gray-500">—</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
