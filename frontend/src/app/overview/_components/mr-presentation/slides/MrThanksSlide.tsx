'use client';

import { MrSlideFrame } from '../ui/MrSlideFrame';
import { MrUzumLogo } from '../ui/MrUzumLogo';
import { BRAND, COMPANY_TITLE, MUTED, PURPLE_TINT } from '../constants/mr-presentation.constants';

/** Финальный слайд «Спасибо». */
export function MrThanksSlide() {
  return (
    <MrSlideFrame
      background="#ffffff"
      color={BRAND}
      padding="96px 120px"
      style={{ justifyContent: 'center', alignItems: 'center' }}
    >
      <div style={{ position: 'absolute', top: 96, right: 120 }}>
        <MrUzumLogo color={PURPLE_TINT} withMark={false} wordSize={40} />
      </div>
      <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.25 }}>Спасибо</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: MUTED, marginTop: 40 }}>
        Отдел закупок и договорной отдел {COMPANY_TITLE}
      </div>
    </MrSlideFrame>
  );
}
