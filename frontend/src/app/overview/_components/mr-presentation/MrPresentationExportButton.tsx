'use client';

import { useMemo, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMrPresentationExport } from './hooks/useMrPresentationExport';
import { MONTH_FULL } from './constants/mr-presentation.constants';
import type { MrSlaInput } from './types/mr-presentation.types';

interface MrPresentationExportButtonProps {
  /** Показатели SLA текущей страницы управленческой отчётности. */
  sla: MrSlaInput;
}

/**
 * Кнопка выгрузки управленческой отчётности в презентацию PDF (16:9) с выбором периода.
 * Доступна только пользователю с логином admin.
 */
export function MrPresentationExportButton({ sla }: MrPresentationExportButtonProps) {
  const { userEmail } = useAuth();
  const isAdminLogin = userEmail === 'admin';
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const { busy, phase, error, progress, start } = useMrPresentationExport({ sla });

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) list.push(y);
    return list;
  }, [now]);

  const statusText =
    phase === 'loading'
      ? 'Загрузка данных…'
      : phase === 'building'
        ? progress
          ? `Слайд ${progress.done} из ${progress.total}`
          : 'Сборка слайдов…'
        : null;

  const selectClass =
    'px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60';

  if (!isAdminLogin) return null;

  return (
    <div className="flex items-center gap-1.5 print:hidden" data-print-hide>
      <select
        aria-label="Месяц отчётного периода"
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
        disabled={busy}
        className={selectClass}
      >
        {MONTH_FULL.map((name, index) => (
          <option key={name} value={index + 1}>
            {name[0].toUpperCase() + name.slice(1)}
          </option>
        ))}
      </select>

      <select
        aria-label="Год отчётного периода"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        disabled={busy}
        className={selectClass}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => start(year, month)}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-70"
        title="Сформировать презентацию управленческой отчётности в PDF (16:9)"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        Презентация PDF
      </button>

      {statusText && <span className="text-xs text-gray-500 whitespace-nowrap">{statusText}</span>}
      {error && <span className="text-xs text-red-600 whitespace-nowrap">{error}</span>}
    </div>
  );
}
