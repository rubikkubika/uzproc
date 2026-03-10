'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';

interface ContractDurationRow {
  innerId: string;
  documentForm: string;
  durationDays: number;
}

interface ContractDurationResponse {
  rows: ContractDurationRow[];
  totalCount: number;
  avgDurationDays: number | null;
}

interface Props {
  documentFormOptions: string[];
}

export function ContractDurationTable({ documentFormOptions }: Props) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 3; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const [year, setYear] = useState<number | ''>(currentYear);
  const [documentForm, setDocumentForm] = useState('');
  const [data, setData] = useState<ContractDurationResponse>({ rows: [], totalCount: 0, avgDurationDays: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year !== '') params.set('year', String(year));
      if (documentForm) params.set('documentForm', documentForm);
      const qs = params.toString();
      const url = `${getBackendUrl()}/api/overview/approvals-summary/by-contract${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData({
        rows: (Array.isArray(json.rows) ? json.rows : []).map(
          (r: { innerId?: string; documentForm?: string; durationDays?: number }) => ({
            innerId: r.innerId ?? '—',
            documentForm: r.documentForm ?? '—',
            durationDays: Number(r.durationDays ?? 0),
          })
        ),
        totalCount: Number(json.totalCount ?? 0),
        avgDurationDays: json.avgDurationDays != null ? Number(json.avgDurationDays) : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData({ rows: [], totalCount: 0, avgDurationDays: null });
    } finally {
      setLoading(false);
    }
  }, [year, documentForm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDays = (days: number | null | undefined): string => {
    if (days == null) return '—';
    return days % 1 === 0 ? String(days) : days.toFixed(1);
  };

  const isFiltered = year !== currentYear || documentForm;

  // Агрегация по виду документа
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; totalDays: number }>();
    for (const row of data.rows) {
      const g = map.get(row.documentForm) ?? { count: 0, totalDays: 0 };
      g.count++;
      g.totalDays += row.durationDays;
      map.set(row.documentForm, g);
    }
    return Array.from(map.entries())
      .map(([docForm, { count, totalDays }]) => ({
        docForm,
        count,
        avgDays: count > 0 ? totalDays / count : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data.rows]);

  if (error) return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Год назначения:</label>
            <select
              value={year === '' ? '' : year}
              onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Все</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Форма документа:</label>
            <select
              value={documentForm}
              onChange={(e) => setDocumentForm(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
            >
              <option value="">Все</option>
              {documentFormOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {isFiltered && (
            <button
              type="button"
              onClick={() => { setYear(currentYear); setDocumentForm(''); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-500">Загрузка…</div>
      ) : grouped.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">Нет данных</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">
                  Вид документа
                </th>
                <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">
                  Кол-во документов
                </th>
                <th className="px-2 py-1 text-center font-medium text-gray-500 border-b border-gray-300 whitespace-nowrap">
                  Ср. срок (раб. дней)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {grouped.map((row, idx) => (
                <tr key={row.docForm} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/70'}>
                  <td className="px-2 py-0.5 text-gray-900 border-r border-gray-200 max-w-[320px] truncate" title={row.docForm}>
                    {row.docForm}
                  </td>
                  <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums border-r border-gray-200">
                    {row.count}
                  </td>
                  <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums">
                    {formatDays(row.avgDays)}
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-medium border-t-2 border-gray-300">
                <td className="px-2 py-0.5 text-gray-900 border-r border-gray-300">Итого</td>
                <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums border-r border-gray-300">
                  {data.totalCount}
                </td>
                <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums">
                  {formatDays(data.avgDurationDays)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
