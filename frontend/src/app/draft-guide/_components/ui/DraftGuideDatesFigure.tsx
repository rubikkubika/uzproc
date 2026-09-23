'use client';

import React from 'react';
import type { GuideData } from '../types/draft-guide.types';

interface DraftGuideDatesFigureProps {
  values: GuideData;
}

/**
 * Схема расчёта дат на строке Ганта: дата заявки (за 90 дней до окончания договора),
 * полоса процедуры по таблице SLA драфта и красная черта окончания текущего договора.
 */
export default function DraftGuideDatesFigure({ values }: DraftGuideDatesFigureProps) {
  const slaLabel = values.sla ? `процедура · ${values.sla} рд` : 'процедура · срок по SLA драфта';

  return (
    <figure className="m-0 border border-gray-300 rounded bg-gray-50 px-4 py-3">
      <figcaption className="text-xs font-medium text-gray-500 mb-4">Как считаются даты · строка на Ганте</figcaption>

      <div className="relative h-[94px]">
        {/* Ось времени */}
        <div className="absolute left-0 right-0 top-[48px] h-px bg-gray-300" />

        {/* Скобка «−90 дней» от даты заявки до окончания договора */}
        <div className="absolute left-[12%] w-[68%] top-0 h-[22px] border-t border-l border-r border-dashed border-gray-400 rounded-t" />
        <div className="absolute left-[46%] top-[-8px] -translate-x-1/2 bg-gray-50 px-1.5 text-[11px] text-gray-500 whitespace-nowrap">
          −90 дней
        </div>

        {/* Полоса процедуры: от даты заявки до даты завершения закупки */}
        <div className="absolute left-[12%] top-[38px] w-0.5 h-[22px] bg-blue-600" />
        <div className="absolute left-[12%] w-[38%] top-[40px] h-[18px] rounded-sm bg-blue-500" />
        <div className="absolute left-[14%] top-[41px] text-[11px] font-medium text-white whitespace-nowrap">
          {slaLabel}
        </div>

        {/* Окончание текущего договора */}
        <div className="absolute left-[80%] top-[30px] w-0.5 h-[38px] bg-red-600" />

        <div className="absolute left-[12%] top-[70px] -translate-x-1/2 text-[11px] text-blue-700 whitespace-nowrap">
          Дата заявки
        </div>
        <div className="absolute left-[50%] top-[70px] -translate-x-1/2 text-[11px] text-gray-700 whitespace-nowrap">
          Дата завершения
        </div>
        <div className="absolute right-0 top-[70px] text-[11px] font-medium text-red-600 whitespace-nowrap">
          Окончание договора
        </div>
      </div>

      <p className="mt-2 mb-0 text-xs text-gray-500">
        Синяя полоса должна заканчиваться до красной черты. Если не успевает — сдвиньте дату заявки или уточните сложность.
      </p>
    </figure>
  );
}
