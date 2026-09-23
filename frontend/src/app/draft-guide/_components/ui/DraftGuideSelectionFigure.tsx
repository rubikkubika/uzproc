'use client';

import React from 'react';
import type { GuideData } from '../types/draft-guide.types';

interface DraftGuideSelectionFigureProps {
  values: GuideData;
}

/**
 * Схема окна отбора договоров по сроку окончания: с 1 октября предыдущего года
 * по 31 декабря года планирования. Цвета — как на диаграмме Ганта (полоса blue, ось gray).
 */
export default function DraftGuideSelectionFigure({ values }: DraftGuideSelectionFigureProps) {
  const year = values.year !== null ? values.year : null;
  const prevYear = values.prevYear !== null ? values.prevYear : null;

  return (
    <figure className="m-0 border border-gray-300 rounded bg-gray-50 px-4 py-3">
      <figcaption className="text-xs font-medium text-gray-500 mb-3">
        Окно отбора по сроку окончания договора{year !== null ? ` · план на ${year}` : ''}
      </figcaption>

      <div className="relative h-[118px]">
        {/* Ось времени */}
        <div className="absolute left-0 right-0 top-[34px] h-px bg-gray-300" />
        {/* Окно отбора */}
        <div className="absolute left-[20%] right-0 top-[26px] h-[18px] rounded-sm bg-blue-50 border border-blue-200" />
        {/* Границы окна и начало года планирования */}
        <div className="absolute left-[20%] top-[22px] w-0.5 h-[26px] bg-blue-600" />
        <div className="absolute left-[46%] top-[22px] w-0.5 h-[26px] bg-gray-400" />
        <div className="absolute right-0 top-[22px] w-0.5 h-[26px] bg-blue-600" />

        <div className="absolute left-[20%] top-0 -translate-x-1/2 text-[11px] text-blue-700 whitespace-nowrap">
          1 окт{prevYear !== null ? ` ${prevYear}` : ''}
        </div>
        <div className="absolute left-[46%] top-0 -translate-x-1/2 text-[11px] text-gray-500 whitespace-nowrap">
          1 янв{year !== null ? ` ${year}` : ''}
        </div>
        <div className="absolute right-0 top-0 text-[11px] text-blue-700 whitespace-nowrap">
          31 дек{year !== null ? ` ${year}` : ''}
        </div>

        {/* Договоры: два попадают в драфт, один закончился раньше окна */}
        <div className="absolute left-0 w-[29%] top-[62px] h-[13px] rounded-sm bg-blue-500" />
        <div className="absolute left-[8%] w-[50%] top-[82px] h-[13px] rounded-sm bg-blue-500" />
        <div className="absolute left-[4%] w-[12%] top-[102px] h-[13px] rounded-sm bg-gray-300" />

        <div className="absolute left-[31%] top-[60px] text-[11px] text-gray-700 whitespace-nowrap">
          заканчивается в ноябре → в драфт
        </div>
        <div className="absolute left-[60%] top-[80px] text-[11px] text-gray-700 whitespace-nowrap">
          заканчивается в июне → в драфт
        </div>
        <div className="absolute left-[18%] top-[100px] text-[11px] text-gray-500 whitespace-nowrap">
          закончился раньше → не берётся
        </div>
      </div>

      <p className="mt-2 mb-0 text-xs text-gray-500">
        Договоры, которые заканчиваются осенью предыдущего года, попадают в драфт: перезакупать их придётся уже в новом году.
      </p>
    </figure>
  );
}
