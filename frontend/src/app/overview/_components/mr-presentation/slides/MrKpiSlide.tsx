'use client';

import { MrSlideFrame } from '../ui/MrSlideFrame';
import { MrSlideHeading } from '../ui/MrSlideHeading';
import { MrSavingsBlock } from '../ui/MrSavingsBlock';
import { MrCsiBlock } from '../ui/MrCsiBlock';
import { MrSlaBlock } from '../ui/MrSlaBlock';
import { SLIDE_BG } from '../constants/mr-presentation.constants';
import type { MrPresentationData } from '../types/mr-presentation.types';

interface MrKpiSlideProps {
  data: MrPresentationData;
  footer: string;
}

/** Слайд «Основные KPI»: экономия, CSI и SLA. */
export function MrKpiSlide({ data, footer }: MrKpiSlideProps) {
  return (
    <MrSlideFrame background={SLIDE_BG} padding="72px 80px 56px" footer={footer} style={{ gap: 28 }}>
      <MrSlideHeading title="Основные KPI" aside={data.periodLabel} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 28 }}>
        <MrSavingsBlock data={data.savings} />
        <MrCsiBlock stats={data.csiStats} />
      </div>

      <MrSlaBlock sla={data.sla} />
    </MrSlideFrame>
  );
}
