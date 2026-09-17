'use client';

import { Filter } from 'lucide-react';

/** Пустой результат: подсказка и сброс фильтров. */
export default function DeliveryTableEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-[72px] px-5 text-center">
      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
        <Filter className="w-5 h-5" />
      </div>
      <div className="text-[14px] font-semibold text-slate-900">Ничего не найдено</div>
      <div className="text-[12px] text-slate-500 max-w-[360px] leading-normal">
        Под текущие фильтры не подходит ни одна поставка. Снимите выбранный день либо переключите вкладку.
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
