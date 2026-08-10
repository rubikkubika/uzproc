'use client';

export interface ContractSlaAverageBlockProps {
  year: number;
  /** Средний % документов без нарушения SLA за год. null — нет подписанных. */
  averagePercentage: number | null;
  /** Подписано документов за год. */
  totalSigned: number;
  /** Из них без нарушения SLA. */
  metSla: number;
  loading?: boolean;
  error?: string | null;
}

/**
 * Блок: средний % выполнения СЛА по подписанным договорным документам за год.
 * Аналог SlaAverageBlock на вкладке SLA закупок.
 */
export function ContractSlaAverageBlock({
  year,
  averagePercentage,
  totalSigned,
  metSla,
  loading,
  error,
}: ContractSlaAverageBlockProps) {
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
      <p className="text-[10px] text-gray-500 leading-tight">{year} г., подписанные</p>
      {loading ? (
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">Загрузка…</p>
      ) : (
        <div className="mt-1 space-y-0.5">
          <div className="leading-tight">
            {averagePercentage != null ? (
              <span className="text-2xl font-semibold text-gray-900">{Math.round(averagePercentage)}%</span>
            ) : (
              <span className="text-xs text-gray-500">—</span>
            )}
          </div>
          <div className="leading-tight">
            <span className="text-[10px] text-gray-500">подписано: </span>
            <span className="text-xs font-medium text-gray-900 tabular-nums">{totalSigned}</span>
          </div>
          <div className="leading-tight">
            <span className="text-[10px] text-gray-500">без нарушения: </span>
            <span className="text-xs font-medium text-gray-900 tabular-nums">{metSla}</span>
          </div>
          <div className="leading-tight">
            <span className="text-[10px] text-gray-500">с нарушением: </span>
            <span className="text-xs font-medium text-red-700 tabular-nums">{totalSigned - metSla}</span>
          </div>
        </div>
      )}
    </div>
  );
}
