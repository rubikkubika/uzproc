'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimelinesData, TimelinesYearRow } from '../hooks/useOverviewTimelinesData';
import { useTimelinesRequests } from '../hooks/useTimelinesRequests';
import { TimelinesRequestsTable } from './TimelinesRequestsTable';

const STAGE_HELP: Record<string, string> = {
  'Подготовка ЗнЗ': 'От даты создания заявки до даты первого назначения согласования. День создания не считается.',
  'Согласование ЗнЗ': 'От первого назначения согласования до последнего завершения согласования заявки. День назначения не считается.',
  'Заявка': 'Сумма этапов: Подготовка ЗнЗ + Согласование ЗнЗ.',
  'Закупка': 'Сумма этапов: Общий + Итоги.',
  'Закупка Общий': 'От даты назначения на утверждение закупщика до даты первого назначения согласования закупочной процедуры. День назначения не считается.',
  'Закупка Итоги': 'От даты первого назначения согласования закупочной процедуры до даты последнего завершения согласования. День назначения не считается.',
  'Подготовка договора': 'От последнего завершения согласования закупки до даты создания первого договора (исключая договоры, исключённые из расчёта статуса). День завершения закупки не считается.',
  'Согласование договора': 'От первого назначения согласования договора до завершения этапа регистрации. Если несколько договоров — берётся самый долгий. День назначения не считается.',
  'Договор': 'Сумма этапов: Подготовка договора + Согласование договора.',
  'Срок': 'Сумма средних рабочих дней по всем этапам: Заявка + Закупка + Договор.',
};

const TOTAL_STAGE = 'Срок';

/** Стили для главных и зависимых столбцов */
const MAIN_TH = 'bg-blue-50 text-gray-700 font-semibold border-l-2 border-l-blue-400';
const SUB_TH = 'text-gray-500';
const MAIN_TD = 'bg-blue-50/40 font-semibold text-gray-900 border-l-2 border-l-blue-400';
const SUB_TD = 'text-gray-700';
const TOTAL_TH = 'bg-gray-100 text-gray-700 font-semibold';
const TOTAL_TD = 'bg-gray-100 font-semibold text-gray-900';

/** Структура колонок для таблицы */
interface StageColumn {
  key: string;
  label: string;
  isMain: boolean;
  isTotal: boolean;
  /** Для вычисляемых (Заявка, Договор) — ключи для суммирования */
  sumOf?: string[];
}

const STAGE_COLUMNS: StageColumn[] = [
  { key: 'Срок', label: 'Срок', isMain: false, isTotal: true },
  { key: 'Заявка', label: 'Заявка', isMain: true, isTotal: false, sumOf: ['Подготовка ЗнЗ', 'Согласование ЗнЗ'] },
  { key: 'Подготовка ЗнЗ', label: 'Подг.', isMain: false, isTotal: false },
  { key: 'Согласование ЗнЗ', label: 'Согл.', isMain: false, isTotal: false },
  { key: 'Закупка', label: 'Закупка', isMain: true, isTotal: false, sumOf: ['Закупка Общий', 'Закупка Итоги'] },
  { key: 'Закупка Общий', label: 'Общий', isMain: false, isTotal: false },
  { key: 'Закупка Итоги', label: 'Итоги', isMain: false, isTotal: false },
  { key: 'Договор', label: 'Договор', isMain: true, isTotal: false, sumOf: ['Подготовка договора', 'Согласование договора'] },
  { key: 'Подготовка договора', label: 'Подг.', isMain: false, isTotal: false },
  { key: 'Согласование договора', label: 'Согл.', isMain: false, isTotal: false },
];

function getStageValue(avgByStage: Record<string, number>, col: StageColumn): number | undefined {
  if (col.sumOf) {
    const vals = col.sumOf.map((k) => avgByStage[k]);
    if (vals.every((v) => v == null)) return undefined;
    return vals.reduce((sum, v) => sum + (v ?? 0), 0);
  }
  return avgByStage[col.key];
}

function HelpIcon({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleEnter = () => {
    setShow(true);
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 4, left: rect.left + rect.width / 2 });
    }
  };

  return (
    <span className="inline-block ml-0.5">
      <button
        ref={btnRef}
        type="button"
        className="w-3 h-3 rounded-full bg-gray-300 text-white text-[8px] font-bold leading-none inline-flex items-center justify-center hover:bg-blue-500 transition-colors"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
      >
        ?
      </button>
      {show && pos && (
        <div
          className="fixed z-[9999] w-64 px-2.5 py-1.5 bg-gray-800 text-white text-[10px] leading-tight rounded shadow-lg whitespace-normal pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

function StageCell({ value, total, col }: { value: number | undefined; total: number; col: StageColumn }) {
  const pct = value != null && total > 0 && !col.isTotal && col.isMain ? Math.round((value / total) * 100) : null;
  const tdClass = col.isTotal ? TOTAL_TD : col.isMain ? MAIN_TD : SUB_TD;
  return (
    <td className={`px-1.5 py-1 text-center border-r border-gray-300 ${tdClass}`}>
      {value != null ? (
        <>
          {Math.round(value * 10) / 10 === value ? value.toFixed(1) : (Math.round(value * 10) / 10).toFixed(1)}
          {pct != null && <span className="text-gray-400 ml-0.5">({pct}%)</span>}
        </>
      ) : '—'}
    </td>
  );
}

interface TimelinesTabContentProps {
  data: TimelinesData | null;
  loading: boolean;
  error: string | null;
  onlySignedContracts: boolean;
  onToggleOnlySigned: () => void;
}

export function TimelinesTabContent({ data, loading, error, onlySignedContracts, onToggleOnlySigned }: TimelinesTabContentProps) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = sessionStorage.getItem('overview_timelinesExpanded');
      return saved ? new Set(JSON.parse(saved) as number[]) : new Set();
    } catch { return new Set(); }
  });
  const reqData = useTimelinesRequests(onlySignedContracts);

  // Восстановление выбранной сложности из sessionStorage при монтировании
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !data || data.rows.length === 0) return;
    restoredRef.current = true;
    try {
      const saved = sessionStorage.getItem('overview_timelinesSelection');
      if (saved) {
        const sel = JSON.parse(saved) as { year: number; complexity: string };
        if (sel.year && sel.complexity) reqData.select(sel.year, sel.complexity);
      }
    } catch { /* ignore */ }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleYear = useCallback((year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      if (typeof window !== 'undefined') sessionStorage.setItem('overview_timelinesExpanded', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleComplexityClick = useCallback((year: number, complexity: string) => {
    reqData.select(year, complexity);
    if (typeof window !== 'undefined') {
      // Если повторный клик — убираем, иначе сохраняем
      const saved = sessionStorage.getItem('overview_timelinesSelection');
      if (saved) {
        try {
          const sel = JSON.parse(saved) as { year: number; complexity: string };
          if (sel.year === year && sel.complexity === complexity) {
            sessionStorage.removeItem('overview_timelinesSelection');
            return;
          }
        } catch { /* ignore */ }
      }
      sessionStorage.setItem('overview_timelinesSelection', JSON.stringify({ year, complexity }));
    }
  }, [reqData]);

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

  if (!data || data.rows.length === 0) {
    return (
      <div className="bg-white rounded shadow p-4 text-center text-gray-500 text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const { rows } = data;

  return (
    <>
      <div className="bg-white rounded shadow">
        <div className="px-1.5 py-1 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Сроки закупок — средние рабочие дни по этапам
          </h3>
          <button
            type="button"
            onClick={onToggleOnlySigned}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              onlySignedContracts
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Только подписанные договора
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-1.5 py-1 text-left font-medium text-gray-500 border-r border-b border-gray-300">
                  Год
                </th>
                <th className="px-1.5 py-1 text-center font-medium text-gray-500 border-r border-b border-gray-300">
                  Кол-во
                </th>
                {STAGE_COLUMNS.map((col) => {
                  const thClass = col.isTotal ? TOTAL_TH : col.isMain ? MAIN_TH : SUB_TH;
                  return (
                    <th
                      key={col.key}
                      className={`px-1.5 py-1 text-center font-medium border-r border-b border-gray-300 ${thClass}`}
                      title={STAGE_HELP[col.key] || undefined}
                    >
                      <span>{col.label}</span>
                      {STAGE_HELP[col.key] && <HelpIcon text={STAGE_HELP[col.key]} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <YearRowGroup
                  key={row.year}
                  row={row}
                  expanded={expandedYears.has(row.year)}
                  selectedComplexity={reqData.selection?.year === row.year ? reqData.selection.complexity : null}
                  onToggle={() => toggleYear(row.year)}
                  onComplexityClick={(complexity) => handleComplexityClick(row.year, complexity)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {reqData.selection && (
        <TimelinesRequestsTable
          year={reqData.selection.year}
          complexity={reqData.selection.complexity}
          items={reqData.items}
          loading={reqData.loading}
          error={reqData.error}
          onClose={reqData.close}
        />
      )}
    </>
  );
}

function YearRowGroup({
  row,
  expanded,
  selectedComplexity,
  onToggle,
  onComplexityClick,
}: {
  row: TimelinesYearRow;
  expanded: boolean;
  selectedComplexity: string | null;
  onToggle: () => void;
  onComplexityClick: (complexity: string) => void;
}) {
  const total = row.avgDaysByStage[TOTAL_STAGE] ?? 0;

  return (
    <>
      <tr
        className="hover:bg-gray-50 border-b border-gray-200 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-1.5 py-1 text-gray-900 font-medium border-r border-gray-300">
          <span className="inline-block w-3 mr-1 text-gray-400">{expanded ? '▼' : '▶'}</span>
          {row.year}
        </td>
        <td className="px-1.5 py-1 text-center text-gray-700 border-r border-gray-300">
          {row.requestCount}
        </td>
        {STAGE_COLUMNS.map((col) => (
          <StageCell key={col.key} value={getStageValue(row.avgDaysByStage, col)} total={total} col={col} />
        ))}
      </tr>
      {expanded && row.byComplexity && row.byComplexity.map((cRow) => {
        const cTotal = cRow.avgDaysByStage[TOTAL_STAGE] ?? 0;
        const isSelected = selectedComplexity === cRow.complexity;
        return (
          <tr
            key={`${row.year}-${cRow.complexity}`}
            className={`border-b border-gray-100 cursor-pointer transition-colors ${
              isSelected ? 'bg-blue-100' : 'bg-blue-50/40 hover:bg-blue-100/60'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onComplexityClick(cRow.complexity);
            }}
          >
            <td className="px-1.5 py-1 text-gray-600 border-r border-gray-200 pl-8">
              Сложность {cRow.complexity}
            </td>
            <td className="px-1.5 py-1 text-center text-gray-600 border-r border-gray-200">
              {cRow.requestCount}
            </td>
            {STAGE_COLUMNS.map((col) => (
              <StageCell key={col.key} value={getStageValue(cRow.avgDaysByStage, col)} total={cTotal} col={col} />
            ))}
          </tr>
        );
      })}
    </>
  );
}
