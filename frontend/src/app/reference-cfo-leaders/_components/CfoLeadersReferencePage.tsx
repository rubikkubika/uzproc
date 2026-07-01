'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchCfoLeaders,
  saveCfoLeader,
  deleteCfoLeader,
  type CfoLeaderDto,
} from '@/utils/cfo-leaders.api';
import CfoLeaderRow from './ui/CfoLeaderRow';

export default function CfoLeadersReferencePage() {
  const [rows, setRows] = useState<CfoLeaderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Фильтры в заголовках (клиентская фильтрация — список без пагинации)
  const [cfoFilter, setCfoFilter] = useState('');
  const [leaderFilter, setLeaderFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCfoLeaders();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = useCallback(async (cfoName: string, userId: number) => {
    const saved = await saveCfoLeader(cfoName, userId);
    setRows((prev) => prev.map((r) => (r.cfoName === cfoName ? { ...r, ...saved } : r)));
  }, []);

  const handleDelete = useCallback(async (cfoName: string) => {
    await deleteCfoLeader(cfoName);
    setRows((prev) =>
      prev.map((r) =>
        r.cfoName === cfoName
          ? { ...r, userId: null, leaderFullName: null, leaderEmail: null }
          : r
      )
    );
  }, []);

  const filteredRows = useMemo(() => {
    const cfoQuery = cfoFilter.trim().toLowerCase();
    const leaderQuery = leaderFilter.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesCfo = !cfoQuery || r.cfoName.toLowerCase().includes(cfoQuery);
      const matchesLeader =
        !leaderQuery || (r.leaderFullName ?? '').toLowerCase().includes(leaderQuery);
      return matchesCfo && matchesLeader;
    });
  }, [rows, cfoFilter, leaderFilter]);

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Справочник руководителей ЦФО</h1>
        <p className="text-sm text-gray-600 mt-1">
          Список ЦФО формируется из заявок, закупок и договоров. Для каждого ЦФО можно задать ФИО
          руководителя. Данные ведутся в таблице{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">cfo_leaders</code>.
        </p>
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
          <div className="p-6 text-sm text-gray-600">
            Нет ЦФО в заявках, закупках и договорах.
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-b border-gray-200 w-1/2">
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={cfoFilter}
                        onChange={(e) => setCfoFilter(e.target.value)}
                        placeholder="Фильтр…"
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal"
                      />
                      <span>ЦФО</span>
                    </div>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider border-b border-gray-200">
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={leaderFilter}
                        onChange={(e) => setLeaderFilter(e.target.value)}
                        placeholder="Фильтр…"
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal"
                      />
                      <span>Руководитель (ФИО)</span>
                    </div>
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 tracking-wider border-b border-gray-200 w-40">
                    <div className="flex flex-col gap-1">
                      <div className="h-[26px]" />
                      <span>Действия</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((row) => (
                  <CfoLeaderRow
                    key={row.cfoName}
                    row={row}
                    onSave={handleSave}
                    onDelete={handleDelete}
                  />
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-sm text-gray-500 text-center">
                      Ничего не найдено по заданным фильтрам.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
