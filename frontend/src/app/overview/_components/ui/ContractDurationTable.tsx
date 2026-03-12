'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getBackendUrl } from '@/utils/api';

interface ContractDurationRow {
  innerId: string;
  documentForm: string;
  durationDays: number;
  procurement: boolean;
}

interface ContractDurationResponse {
  rows: ContractDurationRow[];
  totalCount: number;
  avgDurationDays: number | null;
}

interface Props {
  documentFormOptions: string[];
}

const mapRows = (json: { rows?: unknown[] }): ContractDurationRow[] =>
  (Array.isArray(json.rows) ? json.rows : []).map(
    (r: { innerId?: string; documentForm?: string; durationDays?: number; procurement?: boolean }) => ({
      innerId: r.innerId ?? '—',
      documentForm: r.documentForm ?? '—',
      durationDays: Number(r.durationDays ?? 0),
      procurement: Boolean(r.procurement),
    })
  );

function aggregateByKey(rows: ContractDurationRow[]) {
  const map = new Map<string, { count: number; totalDays: number; procurement: boolean }>();
  for (const row of rows) {
    const key = `${row.procurement}||${row.documentForm}`;
    const g = map.get(key) ?? { count: 0, totalDays: 0, procurement: row.procurement };
    g.count++;
    g.totalDays += row.durationDays;
    map.set(key, g);
  }
  return map;
}

export function ContractDurationTable({ documentFormOptions }: Props) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 3; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const [year, setYear] = useState<number | ''>(currentYear);
  const [documentForms, setDocumentForms] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ContractDurationResponse>({ rows: [], totalCount: 0, avgDurationDays: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Данные для сравнения 2025 vs 2026
  const [compData2025, setCompData2025] = useState<ContractDurationRow[]>([]);
  const [compData2026, setCompData2026] = useState<ContractDurationRow[]>([]);
  const [compLoading, setCompLoading] = useState(true);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year !== '') params.set('year', String(year));
      documentForms.forEach(df => params.append('documentForm', df));
      const qs = params.toString();
      const url = `${getBackendUrl()}/api/overview/approvals-summary/by-contract${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData({
        rows: mapRows(json),
        totalCount: Number(json.totalCount ?? 0),
        avgDurationDays: json.avgDurationDays != null ? Number(json.avgDurationDays) : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData({ rows: [], totalCount: 0, avgDurationDays: null });
    } finally {
      setLoading(false);
    }
  }, [year, documentForms]);

  const fetchComparisonData = useCallback(async () => {
    setCompLoading(true);
    try {
      const [res25, res26] = await Promise.all([
        fetch(`${getBackendUrl()}/api/overview/approvals-summary/by-contract?year=2025`),
        fetch(`${getBackendUrl()}/api/overview/approvals-summary/by-contract?year=2026`),
      ]);
      const [json25, json26] = await Promise.all([res25.json(), res26.json()]);
      setCompData2025(mapRows(json25));
      setCompData2026(mapRows(json26));
    } catch {
      // ignore
    } finally {
      setCompLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchComparisonData(); }, [fetchComparisonData]);

  const formatDays = (days: number | null | undefined): string => {
    if (days == null) return '—';
    return days % 1 === 0 ? String(days) : days.toFixed(1);
  };

  const isFiltered = year !== currentYear || documentForms.length > 0;

  const toggleDocumentForm = (opt: string) => {
    setDocumentForms(prev =>
      prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]
    );
  };

  // Агрегация для основной таблицы
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; totalDays: number; procurement: boolean }>();
    for (const row of data.rows) {
      const key = `${row.procurement}||${row.documentForm}`;
      const g = map.get(key) ?? { count: 0, totalDays: 0, procurement: row.procurement };
      g.count++;
      g.totalDays += row.durationDays;
      map.set(key, g);
    }
    return Array.from(map.entries())
      .map(([key, { count, totalDays, procurement }]) => ({
        docForm: key.split('||')[1],
        count,
        avgDays: count > 0 ? totalDays / count : null,
        procurement,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data.rows]);

  const procurementRows = useMemo(() => grouped.filter(r => r.procurement), [grouped]);
  const nonProcurementRows = useMemo(() => grouped.filter(r => !r.procurement), [grouped]);

  const subtotal = (rows: typeof grouped) => ({
    count: rows.reduce((s, r) => s + r.count, 0),
    avgDays: (() => {
      const total = rows.reduce((s, r) => s + r.count * (r.avgDays ?? 0), 0);
      const cnt = rows.reduce((s, r) => s + r.count, 0);
      return cnt > 0 ? total / cnt : null;
    })(),
  });

  // Агрегация для сравнения 2025 vs 2026
  const compGrouped = useMemo(() => {
    const map25 = aggregateByKey(compData2025);
    const map26 = aggregateByKey(compData2026);
    const allKeys = new Set([...map25.keys(), ...map26.keys()]);

    return Array.from(allKeys).map(key => {
      const [procStr, docForm] = key.split('||');
      const g25 = map25.get(key);
      const g26 = map26.get(key);
      const avg25 = g25 && g25.count > 0 ? g25.totalDays / g25.count : null;
      const avg26 = g26 && g26.count > 0 ? g26.totalDays / g26.count : null;
      return {
        docForm,
        procurement: procStr === 'true',
        count25: g25?.count ?? 0,
        avg25,
        count26: g26?.count ?? 0,
        avg26,
        deltaCount: (g26?.count ?? 0) - (g25?.count ?? 0),
        deltaAvg: avg25 != null && avg26 != null ? avg26 - avg25 : null,
      };
    }).sort((a, b) => {
      if (a.procurement !== b.procurement) return a.procurement ? -1 : 1;
      return (b.count25 + b.count26) - (a.count25 + a.count26);
    });
  }, [compData2025, compData2026]);

  const COMP_FORMS = ['Договор', 'Спецификация'];
  const compProcurement = useMemo(() => compGrouped.filter(r => r.procurement && COMP_FORMS.includes(r.docForm)), [compGrouped]);
  const compNonProcurement = useMemo(() => compGrouped.filter(r => !r.procurement && COMP_FORMS.includes(r.docForm)), [compGrouped]);

  const compSubtotal = (rows: typeof compGrouped) => {
    const cnt25 = rows.reduce((s, r) => s + r.count25, 0);
    const cnt26 = rows.reduce((s, r) => s + r.count26, 0);
    const avg25 = cnt25 > 0 ? rows.reduce((s, r) => s + r.count25 * (r.avg25 ?? 0), 0) / cnt25 : null;
    const avg26 = cnt26 > 0 ? rows.reduce((s, r) => s + r.count26 * (r.avg26 ?? 0), 0) / cnt26 : null;
    return {
      count25: cnt25,
      count26: cnt26,
      avg25,
      avg26,
      deltaCount: cnt26 - cnt25,
      deltaAvg: avg25 != null && avg26 != null ? avg26 - avg25 : null,
    };
  };

  if (error) return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );

  const DeltaBadge = ({ value }: { value: number | null }) => {
    if (value == null) return <span className="text-gray-400">—</span>;
    const sign = value > 0 ? '+' : '';
    if (value === 0) return <span className="text-gray-500 tabular-nums">0</span>;
    return (
      <span className={`tabular-nums font-medium ${value < 0 ? 'text-green-700' : 'text-red-600'}`}>
        {sign}{formatDays(value)}
      </span>
    );
  };

  return (
    <div className="flex gap-4 items-start">
      {/* Основная таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-shrink-0">
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
            <div className="flex items-center gap-2" ref={dropdownRef}>
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Форма документа:</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(p => !p)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px] flex items-center justify-between gap-1"
                >
                  <span className="truncate max-w-[140px]">
                    {documentForms.length === 0 ? 'Все' : documentForms.length === 1 ? documentForms[0] : `Выбрано: ${documentForms.length}`}
                  </span>
                  <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg min-w-[160px] max-h-48 overflow-y-auto">
                    <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer border-b border-gray-200">
                      <input
                        type="checkbox"
                        checked={documentForms.length === 0}
                        onChange={() => setDocumentForms([])}
                        className="accent-blue-500"
                      />
                      <span className="text-xs text-gray-900">Все</span>
                    </label>
                    {documentFormOptions.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={documentForms.includes(opt)}
                          onChange={() => toggleDocumentForm(opt)}
                          className="accent-blue-500"
                        />
                        <span className="text-xs text-gray-900">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => { setYear(currentYear); setDocumentForms([]); }}
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
            {(() => {
              const maxRows = Math.max(procurementRows.length, nonProcurementRows.length);
              const sP = subtotal(procurementRows);
              const sN = subtotal(nonProcurementRows);
              const cellBase = 'px-2 py-0.5 text-gray-900 text-xs';
              return (
                <table className="border-collapse text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th colSpan={3} className="px-2 py-1 text-center font-semibold text-green-800 border-r-2 border-b border-gray-300 bg-green-50 whitespace-nowrap">
                        Закупочный
                      </th>
                      <th colSpan={3} className="px-2 py-1 text-center font-semibold text-gray-700 border-b border-gray-300 bg-gray-100 whitespace-nowrap">
                        Не закупочный
                      </th>
                    </tr>
                    <tr>
                      <th className="px-2 py-1 text-left font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Вид документа</th>
                      <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Кол-во</th>
                      <th className="px-2 py-1 text-center font-medium text-gray-500 border-r-2 border-b border-gray-300 whitespace-nowrap">Ср. срок (р.д.)</th>
                      <th className="px-2 py-1 text-left font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Вид документа</th>
                      <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Кол-во</th>
                      <th className="px-2 py-1 text-center font-medium text-gray-500 border-b border-gray-300 whitespace-nowrap">Ср. срок (р.д.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxRows }).map((_, idx) => {
                      const p = procurementRows[idx];
                      const n = nonProcurementRows[idx];
                      const bg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
                      return (
                        <tr key={idx} className={bg}>
                          <td className={`${cellBase} border-r border-gray-200 whitespace-nowrap`}>{p?.docForm ?? ''}</td>
                          <td className={`${cellBase} text-center tabular-nums border-r border-gray-200`}>{p ? p.count : ''}</td>
                          <td className={`${cellBase} text-center tabular-nums border-r-2 border-gray-300`}>{p ? formatDays(p.avgDays) : ''}</td>
                          <td className={`${cellBase} border-r border-gray-200 whitespace-nowrap`}>{n?.docForm ?? ''}</td>
                          <td className={`${cellBase} text-center tabular-nums border-r border-gray-200`}>{n ? n.count : ''}</td>
                          <td className={`${cellBase} text-center tabular-nums`}>{n ? formatDays(n.avgDays) : ''}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50 font-medium border-t-2 border-gray-300">
                      <td className="px-2 py-0.5 text-gray-900 text-xs border-r border-gray-200">Итого</td>
                      <td className="px-2 py-0.5 text-center text-gray-900 text-xs tabular-nums border-r border-gray-200">{sP.count}</td>
                      <td className="px-2 py-0.5 text-center text-gray-900 text-xs tabular-nums border-r-2 border-gray-300">{formatDays(sP.avgDays)}</td>
                      <td className="px-2 py-0.5 text-gray-900 text-xs border-r border-gray-200">Итого</td>
                      <td className="px-2 py-0.5 text-center text-gray-900 text-xs tabular-nums border-r border-gray-200">{sN.count}</td>
                      <td className="px-2 py-0.5 text-center text-gray-900 text-xs tabular-nums">{formatDays(sN.avgDays)}</td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </div>

      {/* Панель сравнения 2025 vs 2026 */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-shrink-0">
        <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50">
          <span className="text-xs font-semibold text-gray-700">Сравнение 2025 → 2026</span>
        </div>
        {compLoading ? (
          <div className="p-4 text-sm text-gray-500">Загрузка…</div>
        ) : compGrouped.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Нет данных</div>
        ) : (() => {
          const stP = compSubtotal(compProcurement);
          const stN = compSubtotal(compNonProcurement);
          const cell = 'px-2 py-0.5 text-xs tabular-nums text-center';
          return (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th colSpan={5} className="px-2 py-1 text-center font-semibold text-green-800 border-r-2 border-b border-gray-300 bg-green-50 whitespace-nowrap">
                      Закупочный
                    </th>
                    <th colSpan={5} className="px-2 py-1 text-center font-semibold text-gray-700 border-b border-gray-300 bg-gray-100 whitespace-nowrap">
                      Не закупочный
                    </th>
                  </tr>
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Вид</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">2025<br/>р.д.</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">2026<br/>р.д.</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Δ р.д.</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-r-2 border-b border-gray-300 whitespace-nowrap">Кол-во</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Вид</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">2025<br/>р.д.</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">2026<br/>р.д.</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300 whitespace-nowrap">Δ р.д.</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-500 border-b border-gray-300 whitespace-nowrap">Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  {COMP_FORMS.map((form, idx) => {
                    const p = compProcurement.find(r => r.docForm === form);
                    const n = compNonProcurement.find(r => r.docForm === form);
                    const bg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
                    return (
                      <tr key={form} className={bg}>
                        <td className="px-2 py-0.5 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">{p?.docForm ?? form}</td>
                        <td className={`${cell} text-gray-500 border-r border-gray-200`}>{p ? formatDays(p.avg25) : ''}</td>
                        <td className={`${cell} text-gray-500 border-r border-gray-200`}>{p ? formatDays(p.avg26) : ''}</td>
                        <td className={`${cell} border-r border-gray-200`}>{p ? <DeltaBadge value={p.deltaAvg} /> : ''}</td>
                        <td className={`${cell} text-gray-900 border-r-2 border-gray-300`}>{p ? `${p.count25}→${p.count26}` : ''}</td>
                        <td className="px-2 py-0.5 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">{n?.docForm ?? ''}</td>
                        <td className={`${cell} text-gray-500 border-r border-gray-200`}>{n ? formatDays(n.avg25) : ''}</td>
                        <td className={`${cell} text-gray-500 border-r border-gray-200`}>{n ? formatDays(n.avg26) : ''}</td>
                        <td className={`${cell} border-r border-gray-200`}>{n ? <DeltaBadge value={n.deltaAvg} /> : ''}</td>
                        <td className={`${cell} text-gray-900`}>{n ? `${n.count25}→${n.count26}` : ''}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-blue-50 font-medium border-t-2 border-gray-300">
                    <td className="px-2 py-0.5 text-xs text-gray-900 border-r border-gray-200">Итого</td>
                    <td className={`${cell} text-gray-500 border-r border-gray-200`}>{formatDays(stP.avg25)}</td>
                    <td className={`${cell} text-gray-500 border-r border-gray-200`}>{formatDays(stP.avg26)}</td>
                    <td className={`${cell} border-r border-gray-200`}><DeltaBadge value={stP.deltaAvg} /></td>
                    <td className={`${cell} text-gray-900 border-r-2 border-gray-300`}>{stP.count25}→{stP.count26}</td>
                    <td className="px-2 py-0.5 text-xs text-gray-900 border-r border-gray-200">Итого</td>
                    <td className={`${cell} text-gray-500 border-r border-gray-200`}>{formatDays(stN.avg25)}</td>
                    <td className={`${cell} text-gray-500 border-r border-gray-200`}>{formatDays(stN.avg26)}</td>
                    <td className={`${cell} border-r border-gray-200`}><DeltaBadge value={stN.deltaAvg} /></td>
                    <td className={`${cell} text-gray-900`}>{stN.count25}→{stN.count26}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
