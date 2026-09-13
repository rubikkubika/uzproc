'use client';

import type { ReactNode } from 'react';
import { ChevronsUpDown, Plus } from 'lucide-react';

interface Props {
  onCreate: () => void;
  onReset: () => void;
  /** Фильтр по году */
  yearFilter: ReactNode;
  /** Чипы активных срезов */
  chips: ReactNode;
  shown: number;
  total: number;
  loading: boolean;
  bothPanelsCollapsed: boolean;
  onTogglePanels: () => void;
}

/** Панель действий и фильтров над сводкой: создание, сброс, год, чипы срезов, счётчик и сворачивание панелей. */
export default function DeliveryToolbar({
  onCreate,
  onReset,
  yearFilter,
  chips,
  shown,
  total,
  loading,
  bothPanelsCollapsed,
  onTogglePanels,
}: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap px-5 py-2 bg-slate-50 border-b border-slate-200 text-[12px] flex-shrink-0">
      <button
        type="button"
        data-tour="create-delivery"
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
        Создать поставку
      </button>
      <button
        type="button"
        data-tour="reset-filters"
        onClick={onReset}
        className="text-[13px] font-medium px-3 py-1.5 rounded-md border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
      >
        Сбросить фильтры
      </button>
      {yearFilter}
      {chips}
      <div className="ml-auto flex items-center gap-2.5 text-slate-500 whitespace-nowrap">
        <span data-tour="records-counter">
          Показано <b className="font-semibold text-slate-900">{loading ? '…' : shown}</b> из {loading ? '…' : total} записей
        </span>
        <span className="text-slate-300">|</span>
        <button
          type="button"
          onClick={onTogglePanels}
          className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
        >
          <ChevronsUpDown className="w-3 h-3" />
          {bothPanelsCollapsed ? 'Развернуть панели' : 'Свернуть панели'}
        </button>
      </div>
    </div>
  );
}
