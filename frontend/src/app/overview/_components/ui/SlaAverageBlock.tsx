'use client';

/**
 * Блок: средний процент выполнения СЛА в году.
 * Отображается слева от диаграммы на вкладке СЛА.
 */
export interface SlaAverageBlockProps {
  year: number;
  /** Средний % по году (взвешенный: сумма metSla / сумма totalCompleted). null — нет данных. */
  averagePercentage: number | null;
  loading?: boolean;
  error?: string | null;
}

export function SlaAverageBlock({
  year,
  averagePercentage,
  loading,
  error,
}: SlaAverageBlockProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col justify-center h-[200px] w-32 shrink-0">
        <p className="text-xs font-medium text-gray-700 leading-tight">Средний % СЛА</p>
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow px-2 py-1 flex flex-col justify-center h-[200px] w-32 shrink-0">
      <p className="text-xs font-medium text-gray-700 leading-tight">Средний % СЛА</p>
      <p className="text-[10px] text-gray-500 leading-tight">{year} г.</p>
      {loading ? (
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">Загрузка…</p>
      ) : averagePercentage != null ? (
        <p className="text-xl font-semibold text-gray-900 mt-0.5 leading-tight">{Math.round(averagePercentage)}%</p>
      ) : (
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">—</p>
      )}
    </div>
  );
}
