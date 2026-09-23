'use client';

import React from 'react';
import type { GuideData, GuideStep } from '../types/draft-guide.types';
import DraftGuideBlock from './DraftGuideBlock';

interface DraftGuideStepProps {
  step: GuideStep;
  /** Порядковый номер шага, начиная с 1 */
  number: number;
  data: GuideData;
}

/** Карточка одного шага инструкции: номер, заголовок и блоки описания. */
export default function DraftGuideStep({ step, number, data }: DraftGuideStepProps) {
  return (
    <section className="border border-gray-300 rounded-lg bg-white p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-gray-400">{String(number).padStart(2, '0')}</span>
        <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {step.blocks.map((block, index) => (
          <DraftGuideBlock key={index} block={block} data={data} />
        ))}
      </div>
    </section>
  );
}
