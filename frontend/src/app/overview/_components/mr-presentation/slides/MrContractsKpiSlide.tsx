'use client';

import { MrSlideFrame } from '../ui/MrSlideFrame';
import { MrSlideHeading } from '../ui/MrSlideHeading';
import { MrDocumentsTable } from '../ui/MrDocumentsTable';
import { MrSpecificationCsiCard } from '../ui/MrSpecificationCsiCard';
import { MrDurationChart } from '../ui/MrDurationChart';
import { BRAND, GREEN_LINE, SLIDE_BG } from '../constants/mr-presentation.constants';
import type { MrPresentationData } from '../types/mr-presentation.types';

interface MrContractsKpiSlideProps {
  data: MrPresentationData;
  footer: string;
}

/** Слайд «Основные показатели» по договорам. */
export function MrContractsKpiSlide({ data, footer }: MrContractsKpiSlideProps) {
  const contractPoints = data.contractDurations.map((m) => ({ month: m.month, avgDays: m.contractDsAvgDays }));
  const specPoints = data.contractDurations.map((m) => ({ month: m.month, avgDays: m.specAvgDays }));

  return (
    <MrSlideFrame background={SLIDE_BG} footer={footer} style={{ gap: 24 }}>
      <MrSlideHeading title="Основные показатели" aside={data.periodLabel} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: 24 }}>
        <MrDocumentsTable data={data.contractDocuments} />
        <MrSpecificationCsiCard data={data.specificationFeedback} />
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: 0 }}>
        <MrDurationChart
          title="Срок согласования: договор + ДС"
          unit={`дней, ${data.dataYear}`}
          points={contractPoints}
          color={BRAND}
        />
        <MrDurationChart
          title="Срок согласования: спецификации"
          unit={`дней, ${data.dataYear}`}
          points={specPoints}
          color={GREEN_LINE}
        />
      </div>
    </MrSlideFrame>
  );
}
