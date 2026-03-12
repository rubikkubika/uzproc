'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';

interface ApprovalSummaryRow {
  role: string;
  year: number;
  count: number;
  avgDurationDays: number | null;
}

interface ApprovalsSummaryResponse {
  rows: ApprovalSummaryRow[];
  totalCount: number;
  totalAvgDurationDays: number | null;
}

/**
 * Сводная таблица согласований по ролям с фильтрами по году назначения и форме документа.
 * Итоги рассчитываются на бэкенде.
 */
export function ApprovalsSummaryTable() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 3; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const [year, setYear] = useState<number | ''>(currentYear);
  const [documentForm, setDocumentForm] = useState('');
  const [documentFormOptions, setDocumentFormOptions] = useState<string[]>([]);
  const [data, setData] = useState<ApprovalsSummaryResponse>({ rows: [], totalCount: 0, totalAvgDurationDays: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${getBackendUrl()}/api/overview/approvals-summary/document-forms`)
      .then((r) => r.ok ? r.json() : [])
      .then((json) => setDocumentFormOptions(Array.isArray(json) ? json : []))
      .catch(() => setDocumentFormOptions([]));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year !== '') params.set('year', String(year));
      if (documentForm) params.set('documentForm', documentForm);
      const qs = params.toString();
      const res = await fetch(`${getBackendUrl()}/api/overview/approvals-summary${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      const rows = (Array.isArray(json.rows) ? json.rows : []).map(
        (r: { role?: string; year?: number; count?: number; avgDurationDays?: number | null }) => ({
          role: r.role ?? '—',
          year: Number(r.year ?? 0),
          count: Number(r.count ?? 0),
          avgDurationDays: r.avgDurationDays != null ? Number(r.avgDurationDays) : null,
        })
      );
      rows.sort((a, b) => (b.avgDurationDays ?? 0) - (a.avgDurationDays ?? 0));
      setData({
        rows,
        totalCount: Number(json.totalCount ?? 0),
        totalAvgDurationDays: json.totalAvgDurationDays != null ? Number(json.totalAvgDurationDays) : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData({ rows: [], totalCount: 0, totalAvgDurationDays: null });
    } finally {
      setLoading(false);
    }
  }, [year, documentForm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDays = (days: number | null | undefined): string => {
    if (days == null) return '—';
    return days % 1 === 0 ? String(days) : days.toFixed(1);
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
              Год назначения:
            </label>
            <select
              value={year === '' ? '' : year}
              onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Все</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
              Форма документа:
            </label>
            <select
              value={documentForm}
              onChange={(e) => setDocumentForm(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
            >
              <option value="">Все</option>
              {documentFormOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          {(year !== currentYear || documentForm) && (
            <button
              type="button"
              onClick={() => { setYear(currentYear); setDocumentForm(''); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Сбросить
            </button>
          )}
          <span className="text-xs font-medium text-gray-600 ml-auto">Согласования по ролям</span>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-500">Загрузка…</div>
      ) : data.rows.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">Нет данных</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">
                  Роль
                </th>
                <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">
                  Кол-во
                </th>
                <th className="px-2 py-1 text-center font-medium text-gray-500 border-b border-gray-300 whitespace-nowrap">
                  Ср. срок (р.д.)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.rows.map((row, idx) => (
                <tr
                  key={row.role}
                  className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/70'}
                >
                  <td className="px-2 py-0.5 text-gray-900 border-r border-gray-200 whitespace-nowrap" title={row.role}>
                    {row.role}
                  </td>
                  <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums border-r border-gray-200">
                    {row.count}
                  </td>
                  <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums">
                    {formatDays(row.avgDurationDays)}
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-medium border-t-2 border-gray-300">
                <td className="px-2 py-0.5 text-gray-900 border-r border-gray-300">Итого</td>
                <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums border-r border-gray-300">
                  {data.totalCount}
                </td>
                <td className="px-2 py-0.5 text-center text-gray-900 tabular-nums">
                  {formatDays(data.totalAvgDurationDays)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
