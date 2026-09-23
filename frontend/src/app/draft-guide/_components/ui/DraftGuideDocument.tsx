'use client';

import React from 'react';
import type { GuideData } from '../types/draft-guide.types';
import {
  DRAFT_GUIDE_FOOTER_NOTE,
  DRAFT_GUIDE_KICKER,
  DRAFT_GUIDE_LEAD,
  DRAFT_GUIDE_STEPS,
  DRAFT_GUIDE_TITLE,
} from '../constants/draft-guide.constants';
import DraftGuideStep from './DraftGuideStep';

interface DraftGuideDocumentProps {
  data: GuideData;
}

/**
 * Документ инструкции: шапка, семь шагов и примечание об истории изменений.
 * Ширина — как у листа A4, чтобы строки не растягивались на широком экране.
 */
export default function DraftGuideDocument({ data }: DraftGuideDocumentProps) {
  return (
    <div className="guide-document mx-auto w-full max-w-[794px] bg-white rounded-lg shadow-sm border border-gray-200 px-8 py-6 flex flex-col gap-4">
      <header className="pb-4 border-b border-gray-200">
        <div className="text-xs font-medium uppercase tracking-wide text-amber-800">{DRAFT_GUIDE_KICKER}</div>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">
          {DRAFT_GUIDE_TITLE}
          {data.year !== null ? ` · ${data.year} год` : ''}
        </h1>
        <p className="mt-2 text-xs text-gray-700 leading-relaxed">{DRAFT_GUIDE_LEAD}</p>
      </header>

      {DRAFT_GUIDE_STEPS.map((step, index) => (
        <DraftGuideStep key={step.id} step={step} number={index + 1} data={data} />
      ))}

      <div className="rounded-lg bg-gray-800 text-gray-100 px-4 py-3 flex items-start gap-3">
        <span className="text-[11px] uppercase tracking-wide text-gray-400 flex-shrink-0 pt-0.5">История</span>
        <span className="text-xs leading-relaxed">{DRAFT_GUIDE_FOOTER_NOTE}</span>
      </div>
    </div>
  );
}
