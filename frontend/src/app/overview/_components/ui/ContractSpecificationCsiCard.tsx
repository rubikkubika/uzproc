'use client';

import { useEffect, useState } from 'react';
import {
  fetchSpecificationFeedbackDashboard,
  SpecificationFeedbackDashboard,
} from '@/utils/specification-feedback.api';

/** Ряд из 5 звёзд с половинками. */
function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block w-4 h-4 leading-none">
            <span className="absolute inset-0 text-gray-300">★</span>
            <span
              className="absolute inset-0 overflow-hidden text-amber-400"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <Stars value={value ?? 0} />
        <span className="text-xs font-semibold text-gray-700 w-7 text-right">
          {value != null ? value.toFixed(1) : '—'}
        </span>
      </div>
    </div>
  );
}

/**
 * Реальные оценки работы закупок по спецификациям (ЦФО за месяц).
 * Показывает средние показатели и список оценённых ЦФО с указанием, кто оценил.
 */
export function ContractSpecificationCsiCard() {
  const [data, setData] = useState<SpecificationFeedbackDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchSpecificationFeedbackDashboard(controller.signal)
      .then(setData)
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError('Не удалось загрузить оценки');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-700">Оценка закупок по спецификациям</h3>
        {data && data.count > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Оценок: {data.count}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs py-6">
          Загрузка...
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-red-500 text-xs py-6">{error}</div>
      ) : !data || data.count === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs py-6 text-center">
          Пока нет оценок по спецификациям.
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col justify-center gap-2">
          {/* Средние показатели (детализация по ЦФО — в карточках под графиками) */}
          <Metric label="Скорость" value={data.avgSpeed} />
          <Metric label="Работа исполнителя" value={data.avgBusiness} />
          <Metric label="Общая оценка" value={data.avgOverall} />
        </div>
      )}
    </div>
  );
}
