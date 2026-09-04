'use client';

import { MrSlideFrame } from '../ui/MrSlideFrame';
import { MrUzumLogo } from '../ui/MrUzumLogo';
import { BRAND } from '../constants/mr-presentation.constants';

interface MrSectionSlideProps {
  /** Номер раздела («01», «02»). */
  index: string;
  title: string;
  subtitle: string;
}

/** Разделительный слайд («Закупки», «Договора»). */
export function MrSectionSlide({ index, title, subtitle }: MrSectionSlideProps) {
  return (
    <MrSlideFrame background={BRAND} color="#ffffff" padding="96px 120px" style={{ justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', top: 96, right: 120 }}>
        <MrUzumLogo color="#ffffff" withMark={false} wordSize={40} />
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          opacity: 0.7,
          marginBottom: 24,
        }}
      >
        Раздел {index}
      </div>
      <div style={{ fontSize: 140, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.03em' }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.3, opacity: 0.8, marginTop: 40, maxWidth: 1400 }}>{subtitle}</div>
    </MrSlideFrame>
  );
}
