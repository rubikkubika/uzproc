'use client';

import { useMemo, useState } from 'react';
import { useContractDocumentsByPersonMonth } from '../hooks/useContractDocumentsByPersonMonth';

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function cellBg(value: number, max: number): string {
  if (max === 0 || value === 0) return 'transparent';
  const alpha = 0.08 + (value / max) * 0.55;
  const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `#4169e1${hex}`;
}

interface Props {
  enabled: boolean;
}

export function ContractDocumentsCountDashboardContent({ enabled }: Props) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYearState] = useState<number>(() => {
    if (typeof window === 'undefined') return currentYear;
    const saved = sessionStorage.getItem('overview_contractDocsYear');
    return saved ? Number(saved) : currentYear;
  });
  const setYear = (y: number) => {
    setYearState(y);
    if (typeof window !== 'undefined') sessionStorage.setItem('overview_contractDocsYear', String(y));
  };

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 4; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const { data, loading, error } = useContractDocumentsByPersonMonth(year, enabled);

  const maxCellValue = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    for (const row of data.rows) {
      for (const v of row.monthlyCounts) if (v > max) max = v;
    }
    return max;
  }, [data]);

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="contract-docs-year" className="text-xs font-medium text-gray-700">
            Год создания договора:
          </label>
          <select
            id="contract-docs-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {data && (
            <span className="text-xs text-gray-500">
              Всего документов: <span className="font-semibold text-gray-700">{data.total}</span>
            </span>
          )}
          <span className="text-xs text-gray-400">
            Учтены договоры с признаком «договорник» у инициатора, кроме скрытых из «В работе»
          </span>
        </div>
      </div>

      <div className="bg-white rounded shadow px-3 py-2">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">
          Кол-во документов по договорникам и месяцам ({year})
        </h3>

        {loading && (
          <div className="flex items-center justify-center h-40 text-xs text-gray-400">Загрузка...</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-40 text-xs text-red-500">{error}</div>
        )}
        {!loading && !error && data && (
          data.rows.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-gray-400">
              Нет данных за выбранный год
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-500 border border-gray-200 min-w-[200px] sticky left-0 bg-gray-50 z-10">
                      Договорник
                    </th>
                    {MONTH_LABELS.map((m) => (
                      <th
                        key={m}
                        className="px-2 py-2 font-medium text-center text-gray-500 border border-gray-200 min-w-[52px]"
                      >
                        {m}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium text-center text-gray-700 border border-gray-200 min-w-[70px] bg-gray-100">
                      Итого
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.preparedByName} className="hover:brightness-95 transition-all">
                      <td className="px-3 py-1.5 font-medium text-gray-700 border border-gray-200 bg-gray-50 sticky left-0 z-10">
                        {row.preparedByName}
                      </td>
                      {row.monthlyCounts.map((val, i) => (
                        <td
                          key={i}
                          className="px-2 py-1.5 text-center font-medium border border-gray-200"
                          style={{
                            backgroundColor: cellBg(val, maxCellValue),
                            color: val === 0 ? '#9ca3af' : '#111827',
                          }}
                        >
                          {val === 0 ? '—' : val}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center font-semibold text-gray-800 border border-gray-200 bg-gray-100">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-3 py-1.5 text-gray-700 border border-gray-200 sticky left-0 bg-gray-100 z-10">
                      Итого
                    </td>
                    {data.monthlyTotals.map((val, i) => (
                      <td
                        key={i}
                        className="px-2 py-1.5 text-center text-gray-800 border border-gray-200"
                      >
                        {val === 0 ? '—' : val}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center text-gray-900 border border-gray-200 bg-gray-200">
                      {data.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
