'use client';

import React from 'react';
import { CircleCheck, Eye } from 'lucide-react';
import type { GuideCheckedRow, GuidePurchaserRow, GuideSubjectExamples } from '../types/draft-guide.types';
import { GUIDE_UNASSIGNED } from '../constants/draft-guide.constants';

/** Сводка по закупщикам текущего драфта: строка «Не назначен» подсвечена, как в интерфейсе. */
export function GuidePurchasersExample({ rows }: { rows: GuidePurchaserRow[] }) {
  if (rows.length === 0) {
    return <div className="text-xs text-gray-500">Позиций в драфте пока нет — сводка появится после формирования.</div>;
  }

  return (
    <div className="border border-gray-300 rounded overflow-hidden self-start">
      <div className="flex items-center justify-between px-2 py-2 bg-gray-50 border-b border-gray-300 text-xs font-medium text-gray-500">
        <span>Закупщик</span>
        <span>Позиций</span>
      </div>
      {rows.map(row => {
        const isUnassigned = row.purchaser === GUIDE_UNASSIGNED;
        return (
          <div
            key={row.purchaser}
            className={`flex items-center justify-between gap-6 px-2 py-2 border-b border-gray-200 last:border-b-0 text-xs ${
              isUnassigned ? 'bg-amber-50 font-medium text-amber-800' : 'text-gray-900'
            }`}
          >
            <span>{row.purchaser}</span>
            <span>{row.count}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Пара формулировок предмета закупки из реальных позиций драфта. */
export function GuideSubjectsExample({ subjects }: { subjects: GuideSubjectExamples }) {
  if (!subjects.bad && !subjects.good) {
    return <div className="text-xs text-gray-500">Примеры появятся, когда в драфте будут позиции.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div className="rounded border border-gray-300 bg-gray-50 px-3 py-2">
        <div className="text-xs font-medium text-red-700 mb-1">Так не надо</div>
        <div className="text-xs text-gray-500 line-through">{subjects.bad ?? '—'}</div>
        <div className="text-[11px] text-gray-500 mt-1">Из драфта: не видно, что именно закупаем</div>
      </div>
      <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2">
        <div className="text-xs font-medium text-blue-800 mb-1">Так надо</div>
        <div className="text-xs text-gray-900">{subjects.good ?? '—'}</div>
        <div className="text-[11px] text-gray-500 mt-1">Из драфта: понятно, что, для кого и зачем</div>
      </div>
    </div>
  );
}

/** Цепочка исключения позиции: комментарий с причиной → глазик → статус «Исключена». */
export function GuideExcludeExample() {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="px-2 py-1 rounded border border-gray-300 bg-white font-medium text-gray-700">
        Комментарий с причиной
      </span>
      <span className="text-gray-400">→</span>
      <span className="px-2 py-1 rounded border border-gray-300 bg-white font-medium text-gray-700 inline-flex items-center gap-1.5">
        <Eye className="w-4 h-4 text-gray-600" />
        «глазик»
      </span>
      <span className="text-gray-400">→</span>
      <span className="px-2 py-1 rounded border border-gray-300 bg-gray-100 font-medium text-gray-700">
        Статус «Исключена»
      </span>
      <span className="text-gray-400">→</span>
      <span className="px-2 py-1 rounded border border-dashed border-gray-300 text-gray-500">
        не попадёт в будущие драфты
      </span>
    </div>
  );
}

/** Две позиции драфта: без отметки и с отметкой «Проверено закупщиком». */
export function GuideCheckedExample({ rows }: { rows: GuideCheckedRow[] }) {
  if (rows.length === 0) {
    return <div className="text-xs text-gray-500">Примеры появятся, когда в драфте будут позиции.</div>;
  }

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      {rows.map((row, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 px-2 py-2 border-b border-gray-200 last:border-b-0 text-xs text-gray-900 ${
            row.checked ? 'bg-green-50' : ''
          }`}
        >
          <CircleCheck className={`w-4 h-4 flex-shrink-0 ${row.checked ? 'text-green-600' : 'text-gray-300'}`} />
          <span className="flex-1">{row.subject}</span>
          <span className="text-gray-500 whitespace-nowrap">{row.purchaser ?? GUIDE_UNASSIGNED}</span>
        </div>
      ))}
    </div>
  );
}
