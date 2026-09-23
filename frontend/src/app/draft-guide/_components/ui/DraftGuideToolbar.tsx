'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface DraftGuideToolbarProps {
  /** Год драфта — выводится рядом с названием раздела */
  year: number | null;
  /** Куда возвращает кнопка «Назад» */
  backUrl: string;
  isLoading: boolean;
}

/** Панель над инструкцией: возврат в драфт и подпись раздела. */
export default function DraftGuideToolbar({ year, backUrl, isLoading }: DraftGuideToolbarProps) {
  return (
    <div className="px-3 py-2 border-b border-gray-200 bg-amber-50 flex items-center gap-2 flex-wrap">
      <Link
        href={backUrl}
        className="px-2 py-1 text-xs bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" />
        Назад к драфту
      </Link>
      <span className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded">
        Инструкция по драфту{year !== null ? ` на ${year} год` : ''}
      </span>
      {isLoading && <span className="text-xs text-gray-500">Загрузка примеров из драфта…</span>}
    </div>
  );
}
