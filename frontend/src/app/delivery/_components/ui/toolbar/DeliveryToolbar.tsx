'use client';

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

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
}

/** Панель действий и фильтров между блоком «По дням» и таблицей: создание, сброс, год, чипы срезов, счётчик. */
export default function DeliveryToolbar({
  onCreate,
  onReset,
  yearFilter,
  chips,
  shown,
  total,
  loading,
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
      <div className="ml-auto text-slate-500 whitespace-nowrap">
        <span data-tour="records-counter">
          Показано <b className="font-semibold text-slate-900">{loading ? '…' : shown}</b> из {loading ? '…' : total} записей
        </span>
      </div>
    </div>
  );
}
