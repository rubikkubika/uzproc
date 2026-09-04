'use client';

import { MrSlideFrame } from '../ui/MrSlideFrame';
import { MrSlideHeading } from '../ui/MrSlideHeading';
import { MrSpecificationFeedbackCard } from '../ui/MrSpecificationFeedbackCard';
import { CARD_BG, LINE, MUTED, SLIDE_BG } from '../constants/mr-presentation.constants';
import { badgePadding, monthNameCapitalized } from '../utils/mrPresentationFormat';
import type { MrContractFeedbackMonth } from '../types/mr-presentation.types';

interface MrContractsFeedbackSlideProps {
  months: MrContractFeedbackMonth[];
  pageIndex: number;
  pageCount: number;
  footer: string;
}

/** Слайд «Обратная связь инициаторов — договора»: оценки по спецификациям по месяцам. */
export function MrContractsFeedbackSlide({ months, pageIndex, pageCount, footer }: MrContractsFeedbackSlideProps) {
  return (
    <MrSlideFrame background={SLIDE_BG} footer={footer} style={{ gap: 28 }}>
      <MrSlideHeading
        title="Обратная связь инициаторов"
        size={44}
        chip="Договора"
        aside={pageCount > 1 ? `${pageIndex} / ${pageCount}` : undefined}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {months.map((group, groupIndex) => (
          <div key={`${group.month}-${groupIndex}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>
                {monthNameCapitalized(group.month)} {group.year}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: MUTED,
                  background: CARD_BG,
                  borderRadius: 999,
                  ...badgePadding(18, 6, 14),
                }}
              >
                {group.totalInMonth}
              </div>
              <div style={{ flex: 1, height: 1, background: LINE }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20, alignItems: 'stretch' }}>
              {group.cards.map((card, index) => (
                <MrSpecificationFeedbackCard key={`${card.cfoName}-${index}`} card={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </MrSlideFrame>
  );
}
