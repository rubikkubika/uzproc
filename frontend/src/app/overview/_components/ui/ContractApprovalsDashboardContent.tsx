'use client';

import { Fragment, useMemo, useState } from 'react';
import { useContractApprovalsDashboard, ContractApprovalsDashboardRow } from '../hooks/useContractApprovalsDashboard';

const SEGMENT_ORDER = ['Market', 'Tezkor-OOO', '1P', '—'];

function formatDuration(days: number | null): string {
  if (days == null) return '—';
  return days.toFixed(1);
}

function formatTypical(t: boolean | null): string {
  if (t === true) return 'Типовая';
  if (t === false) return 'Не типовая';
  return '—';
}

interface SegmentGroup {
  segment: string;
  rows: ContractApprovalsDashboardRow[];
  totalCount: number;
  weightedDaysSum: number;
}

function groupBySegment(rows: ContractApprovalsDashboardRow[]): SegmentGroup[] {
  const map = new Map<string, SegmentGroup>();
  for (const r of rows) {
    const key = r.segment || '—';
    let g = map.get(key);
    if (!g) {
      g = { segment: key, rows: [], totalCount: 0, weightedDaysSum: 0 };
      map.set(key, g);
    }
    g.rows.push(r);
    g.totalCount += r.count;
    if (r.avgDurationDays != null) g.weightedDaysSum += r.avgDurationDays * r.count;
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    const ia = SEGMENT_ORDER.indexOf(a.segment);
    const ib = SEGMENT_ORDER.indexOf(b.segment);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.segment.localeCompare(b.segment);
  });
  return groups;
}

interface Props {
  enabled: boolean;
}

export function ContractApprovalsDashboardContent({ enabled }: Props) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYearState] = useState<number>(() => {
    if (typeof window === 'undefined') return currentYear;
    const saved = sessionStorage.getItem('overview_contractApprovalsYear');
    return saved ? Number(saved) : currentYear;
  });
  const setYear = (y: number) => {
    setYearState(y);
    if (typeof window !== 'undefined') sessionStorage.setItem('overview_contractApprovalsYear', String(y));
  };

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 4; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const [preparedBy, setPreparedByState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('overview_contractApprovalsPreparedBy') || null;
  });
  const setPreparedBy = (v: string | null) => {
    setPreparedByState(v);
    if (typeof window !== 'undefined') {
      if (v && v.trim() !== '') sessionStorage.setItem('overview_contractApprovalsPreparedBy', v);
      else sessionStorage.removeItem('overview_contractApprovalsPreparedBy');
    }
  };

  const { data, loading, error } = useContractApprovalsDashboard(year, preparedBy, enabled);

  const segmentGroups = useMemo(() => (data ? groupBySegment(data.rows) : []), [data]);

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="contract-approvals-year" className="text-xs font-medium text-gray-700">
            Год создания договора:
          </label>
          <select
            id="contract-approvals-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <label htmlFor="contract-approvals-prepared-by" className="text-xs font-medium text-gray-700">
            Договорник:
          </label>
          <select
            id="contract-approvals-prepared-by"
            value={preparedBy ?? ''}
            onChange={(e) => setPreparedBy(e.target.value || null)}
            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="">Все</option>
            {(data?.availablePreparedBy ?? []).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {data && (
            <>
              <span className="text-xs text-gray-500">
                Всего документов: <span className="font-semibold text-gray-700">{data.totalCount}</span>
              </span>
              <span className="text-xs text-gray-500">
                Средний срок: <span className="font-semibold text-gray-700">{formatDuration(data.totalAvgDurationDays)} дн.</span>
              </span>
            </>
          )}
          <span className="text-xs text-gray-400">
            Подписанные договоры, подготовленные договорником. Срок согласования: первый ↔ последний этап (без Регистрация / Принятие на хранение / Синхронизация).
          </span>
        </div>
      </div>

      <div className="bg-white rounded shadow px-3 py-2">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">
          Согласования по сегментам и типам документов ({year})
          {preparedBy && (
            <span className="ml-2 text-gray-500 font-normal">· {preparedBy}</span>
          )}
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
                    <th className="text-left px-3 py-2 font-medium text-gray-500 border border-gray-200 min-w-[140px]">Компания</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 border border-gray-200 min-w-[220px]">Тип документа</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 border border-gray-200 min-w-[110px]">Форма</th>
                    <th className="px-3 py-2 font-medium text-center text-gray-500 border border-gray-200 min-w-[110px]">Кол-во документов</th>
                    <th className="px-3 py-2 font-medium text-center text-gray-500 border border-gray-200 min-w-[140px]">Средний срок, дн.</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentGroups.map((group) => {
                    const groupAvg = group.totalCount > 0 ? group.weightedDaysSum / group.totalCount : null;
                    return (
                      <Fragment key={group.segment}>
                        {group.rows.map((row, idx) => (
                          <tr key={`${group.segment}-${row.documentForm}-${row.typicalForm}-${idx}`} className="hover:bg-gray-50">
                            {idx === 0 && (
                              <td
                                rowSpan={group.rows.length}
                                className="px-3 py-1.5 font-semibold text-gray-700 border border-gray-200 bg-gray-50 align-top"
                              >
                                {group.segment}
                              </td>
                            )}
                            <td className="px-3 py-1.5 text-gray-800 border border-gray-200">
                              {row.documentForm}
                            </td>
                            <td className="px-3 py-1.5 text-gray-700 border border-gray-200">
                              {formatTypical(row.typicalForm)}
                            </td>
                            <td className="px-3 py-1.5 text-center font-medium text-gray-900 border border-gray-200 tabular-nums">
                              {row.count}
                            </td>
                            <td className="px-3 py-1.5 text-center text-gray-900 border border-gray-200 tabular-nums">
                              {formatDuration(row.avgDurationDays)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={3} className="px-3 py-1.5 text-right text-gray-700 border border-gray-200">
                            Итого {group.segment}
                          </td>
                          <td className="px-3 py-1.5 text-center text-gray-900 border border-gray-200 tabular-nums">
                            {group.totalCount}
                          </td>
                          <td className="px-3 py-1.5 text-center text-gray-900 border border-gray-200 tabular-nums">
                            {formatDuration(groupAvg)}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  <tr className="bg-gray-200 font-semibold">
                    <td colSpan={3} className="px-3 py-1.5 text-right text-gray-800 border border-gray-300">
                      Итого
                    </td>
                    <td className="px-3 py-1.5 text-center text-gray-900 border border-gray-300 tabular-nums">
                      {data.totalCount}
                    </td>
                    <td className="px-3 py-1.5 text-center text-gray-900 border border-gray-300 tabular-nums">
                      {formatDuration(data.totalAvgDurationDays)}
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
