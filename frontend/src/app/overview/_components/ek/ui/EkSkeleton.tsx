'use client';

import { EK_SKELETON_ROWS } from '../constants/ek.constants';

const RAIL_CARD = 'bg-white rounded-xl shadow-sm py-3.5 px-4';

/** Скелетон дашборда ЕК: повторяет сетку «левая рейка + таблица», без спиннера */
export function EkSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
        <div className={`${RAIL_CARD} sm:col-span-2 lg:col-span-1`}>
          <div className="h-2.5 w-24 rounded bg-gray-100" />
          <div className="h-8 w-28 rounded bg-gray-200 mt-2" />
          <div className="h-2 rounded bg-gray-100 mt-2" />
          <div className="grid grid-cols-2 gap-3 mt-3.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded bg-gray-100" />
            ))}
          </div>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className={RAIL_CARD}>
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="flex flex-col gap-2 mt-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-2.5 rounded bg-gray-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={RAIL_CARD}>
        <div className="h-3 w-32 rounded bg-gray-200 mb-4" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: EK_SKELETON_ROWS }, (_, i) => (
            <div key={i} className="grid grid-cols-[21%_1fr_1fr_96px_150px] gap-3 items-center">
              <div className="h-2.5 rounded bg-gray-100" />
              <div className="h-3.5 rounded bg-gray-100" />
              <div className="h-3.5 rounded bg-gray-100" />
              <div className="h-2.5 rounded bg-gray-100" />
              <div className="h-2.5 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
