'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';

export interface OverviewApprovalsByExecutorRow {
  executorName: string;
  contractCount: number;
  averageDays: number | null;
}

/**
 * Таблица «Исполнители по согласованиям договоров»: исполнитель, кол-во договоров, среднее кол-во дней.
 * Учитываются только договоры, связанные с заявкой на закупку. Расчёт дней на бэкенде (как на странице заявки).
 * Сортировка: по среднему кол-ву дней от большего к меньшему. Фильтр по году назначения заявки на закупщика.
 */
export function ApprovalsByExecutorTable() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const [data, setData] = useState<OverviewApprovalsByExecutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentYear, setAssignmentYear] = useState<number | ''>(currentYear);
  const [documentForm, setDocumentForm] = useState<string>('');
  const [documentFormOptions, setDocumentFormOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadDocumentFormOptions = async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/overview/approvals-by-executor/document-forms`);
        if (res.ok) {
          const json = await res.json();
          setDocumentFormOptions(Array.isArray(json) ? json : []);
        }
      } catch {
        setDocumentFormOptions([]);
      }
    };
    loadDocumentFormOptions();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (assignmentYear !== '') params.set('assignmentYear', String(assignmentYear));
      if (documentForm.trim()) params.set('documentForm', documentForm.trim());
      const qs = params.toString();
      const url = `${getBackendUrl()}/api/overview/approvals-by-executor${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      const rows: OverviewApprovalsByExecutorRow[] = (Array.isArray(json) ? json : []).map(
        (r: { executorName?: string; contractCount?: number; averageDays?: number | null }) => ({
          executorName: r.executorName ?? '—',
          contractCount: Number(r.contractCount ?? 0),
          averageDays: r.averageDays != null ? Number(r.averageDays) : null,
        })
      );
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentYear, documentForm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">
          Исполнители по согласованиям договоров
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Учитываются только договоры, связанные с заявкой на закупку. Рабочие дни — как на странице заявки (день назначения не считаем, день выполнения считаем). Сортировка: по среднему кол-ву дней от большего к меньшему.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="approvals-year-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Год назначения заявки на закупщика:
            </label>
            <select
              id="approvals-year-filter"
              value={assignmentYear === '' ? '' : assignmentYear}
              onChange={(e) => setAssignmentYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="approvals-document-form-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Форма документа:
            </label>
            <select
              id="approvals-document-form-filter"
              value={documentForm}
              onChange={(e) => setDocumentForm(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]"
            >
              <option value="">Все</option>
              {documentFormOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {(assignmentYear !== '' || documentForm) && (
            <button
              type="button"
              onClick={() => {
                setAssignmentYear(currentYear);
                setDocumentForm('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Загрузка…</div>
      ) : data.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">Нет данных</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Исполнитель
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Кол-во договоров
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 tracking-wider">
                  Среднее кол-во дней
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={row.executorName + idx} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                    {row.executorName}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 text-right tabular-nums border-r border-gray-200">
                    {row.contractCount}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 text-right tabular-nums">
                    {row.averageDays != null
                      ? row.averageDays % 1 === 0
                        ? String(row.averageDays)
                        : row.averageDays.toFixed(1)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
