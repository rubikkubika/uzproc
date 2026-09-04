'use client';

import { MrSlideFrame } from '../ui/MrSlideFrame';
import { MrSlideHeading } from '../ui/MrSlideHeading';
import { MrFeedbackCard } from '../ui/MrFeedbackCard';
import { SLIDE_BG } from '../constants/mr-presentation.constants';
import type { MrCsiFeedback } from '../types/mr-presentation.types';

interface MrFeedbackSlideProps {
  group: string;
  sub: string;
  cards: MrCsiFeedback[];
  pageIndex: number;
  pageCount: number;
  footer: string;
}

/** Слайд обратной связи инициаторов по одной группе ЦФО (сетка 4×2). */
export function MrFeedbackSlide({ group, sub, cards, pageIndex, pageCount, footer }: MrFeedbackSlideProps) {
  return (
    <MrSlideFrame background={SLIDE_BG} footer={footer} style={{ gap: 24 }}>
      <MrSlideHeading
        title="Обратная связь инициаторов"
        size={44}
        chip={group}
        sub={sub || undefined}
        aside={pageCount > 1 ? `${pageIndex} / ${pageCount}` : undefined}
      />

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 20,
          gridAutoRows: 0,
          overflow: 'hidden',
        }}
      >
        {cards.map((card) => (
          <MrFeedbackCard key={card.id} feedback={card} />
        ))}
      </div>
    </MrSlideFrame>
  );
}
