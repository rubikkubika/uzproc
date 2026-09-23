'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useDraftGuideData } from './hooks/useDraftGuideData';
import DraftGuideToolbar from './ui/DraftGuideToolbar';
import DraftGuideDocument from './ui/DraftGuideDocument';

/** Возврат на вкладку драфта плана закупок */
const BACK_URL = '/?tab=purchase-plan-draft';

/**
 * Страница инструкции «Как работать с драфтом плана закупок».
 * Год берётся из параметра `year`, примеры и сроки — из данных драфта этого года.
 */
export default function DraftGuidePage() {
  const searchParams = useSearchParams();
  const yearParam = searchParams.get('year');
  const year = yearParam !== null && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;

  const { data, isLoading } = useDraftGuideData(year);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <DraftGuideToolbar year={year} backUrl={BACK_URL} isLoading={isLoading} />
      <div className="flex-1 overflow-auto py-6 px-4">
        <DraftGuideDocument data={data} />
      </div>
    </div>
  );
}
