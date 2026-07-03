'use client';

import React, { useMemo } from 'react';
import { useOverviewInWorkStatesData } from '../hooks/useOverviewInWorkStatesData';

const TD = 'px-2 py-2 text-xs text-gray-900 border-r border-gray-300';
const TH = 'px-2 py-2 text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300';

/** Формат целого числа с разделителем тысяч. */
function formatInt(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

interface ContractStatesInWorkTabContentProps {
  enabled: boolean;
}

/**
 * Дэшборд «Состояния договоров (в работе)».
 * Список состояний (поле «Состояние») договоров из вкладки «В работе» и их количество.
 */
export function ContractStatesInWorkTabContent({ enabled }: ContractStatesInWorkTabContentProps) {
  const { data, loading, error } = useOverviewInWorkStatesData(enabled);

  const total = useMemo(() => data.reduce((acc, item) => acc + item.count, 0), [data]);

  if (loading) {
    return (
      <div className="bg-white rounded shadow p-4 text-center text-gray-500 text-sm">
        Загрузка данных...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded shadow p-4 text-center text-red-600 text-sm">
        Ошибка: {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded shadow p-4 text-center text-gray-500 text-sm">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="w-full p-2 sm:p-3">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-900">Состояния договоров (в работе)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Список состояний договоров из вкладки «В работе» и их количество. Всего договоров: {formatInt(total)}.
        </p>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow border border-gray-300">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-300">
              <th className={`${TH} text-left w-12 text-center`}>№</th>
              <th className={`${TH} text-left`}>Состояние</th>
              <th className={`${TH} text-left`}>Статус</th>
              <th className={`${TH} text-right`}>Кол-во</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={`${item.state}|${item.status}`} className="border-b border-gray-200 hover:bg-gray-50">
                <td className={`${TD} text-center text-gray-500 tabular-nums`}>{idx + 1}</td>
                <td className={TD}>{item.state}</td>
                <td className={TD}>{item.status}</td>
                <td className={`${TD} text-right tabular-nums`}>{formatInt(item.count)}</td>
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold text-gray-900">
              <td className={`${TD} text-right`} colSpan={3}>
                ВСЕГО
              </td>
              <td className={`${TD} text-right tabular-nums border-r-0`}>{formatInt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
