'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

interface PurchasePlanDraftGuideButtonProps {
  /** Год драфта — инструкция открывается с примерами и сроками этого года */
  year: number | null;
}

/**
 * Кнопка инструкции по драфту плана закупок — слева от кнопки тура «?»
 * в правом верхнем углу раздела. Открывает страницу инструкции с сохранением в PDF.
 */
export default function PurchasePlanDraftGuideButton({ year }: PurchasePlanDraftGuideButtonProps) {
  const href = year !== null ? `/draft-guide?year=${year}` : '/draft-guide';

  return (
    <Link
      href={href}
      data-tour="draft-guide"
      title="Инструкция: как работать с драфтом плана закупок"
      aria-label="Инструкция"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
    >
      <BookOpen className="h-4 w-4" />
    </Link>
  );
}
