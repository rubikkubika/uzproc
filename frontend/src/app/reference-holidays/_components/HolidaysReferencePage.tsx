'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchHolidays, type HolidayDto } from '@/utils/holidays.api';

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

export default function HolidaysReferencePage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [rows, setRows] = useState<HolidayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      const data = await fetchHolidays(from, to);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Справочник праздников</h1>
          <p className="text-sm text-gray-600 mt-1">
            Нерабочие дни из базы (учитываются при расчёте рабочих дней и SLA). Данные ведутся в таблице{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">holidays</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="holiday-year" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Год
          </label>
          <select
            id="holiday-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex-1 min-h-0 flex flex-col">
        {loading && (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}
        {!loading && error && (
          <div className="p-6 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="p-6 text-sm text-gray-600">За выбранный год записей нет.</div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider border-b border-gray-200">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider border-b border-gray-200">
                    Наименование
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.calendarDate} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap border-b border-gray-100">
                      {row.calendarDate}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-100">
                      {row.name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
