'use client';

import { DELIVERY_GRID_CLASS, SKELETON_ROWS } from '../../constants/delivery.constants';

const Bar = ({ className }: { className: string }) => <div className={`rounded ${className}`} />;

/** Скелетон загрузки: строки той же сетки, что и таблица. */
export default function DeliveryTableSkeleton() {
  return (
    <div className="px-5">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div
          key={i}
          className={`${DELIVERY_GRID_CLASS} py-3.5 border-b border-slate-100 animate-pulse`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex flex-col gap-1.5 pr-3"><Bar className="h-2.5 w-9 bg-slate-200" /><Bar className="h-4 w-[90px] bg-slate-100" /></div>
          <div className="flex flex-col gap-1.5 pr-3"><Bar className="h-2.5 w-[120px] bg-slate-200" /><Bar className="h-2.5 w-[100px] bg-slate-100" /></div>
          <div className="flex flex-col gap-1.5 pr-3"><Bar className="h-[18px] w-[110px] rounded-full bg-slate-200" /><Bar className="h-2.5 w-[70px] bg-slate-100" /></div>
          <div className="flex flex-col gap-1.5 pr-3"><Bar className="h-2.5 w-[150px] bg-slate-200" /><Bar className="h-2.5 w-[100px] bg-slate-100" /></div>
          <div className="flex flex-col gap-1.5 pr-3"><Bar className="h-2.5 w-[100px] bg-slate-200" /><Bar className="h-2.5 w-[60px] bg-slate-100" /></div>
          <div className="pr-3"><Bar className="h-2.5 w-[110px] bg-slate-200" /></div>
          <div className="pr-3"><Bar className="h-2.5 w-[70px] bg-slate-200" /></div>
          <div className="pr-3"><Bar className="h-2.5 w-[90px] bg-slate-100" /></div>
          <div><Bar className="h-2.5 w-20 bg-slate-200" /></div>
        </div>
      ))}
      <div className="py-3.5 text-center text-[12px] text-slate-500">Загружаем поставки…</div>
    </div>
  );
}
