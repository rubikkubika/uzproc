'use client';

import { MrSlideFrame } from '../ui/MrSlideFrame';
import { MrUzumLogo } from '../ui/MrUzumLogo';
import { BRAND, COMPANY_TITLE, DEPARTMENT_TITLE } from '../constants/mr-presentation.constants';
import { monthName, monthNameCapitalized, reportedPeriod } from '../utils/mrPresentationFormat';

interface MrCoverSlideProps {
  /** Год выпуска отчёта. */
  year: number;
  /** Месяц выпуска отчёта. */
  month: number;
}

/** Титульный слайд: заголовок — отчётный месяц (месяц перед месяцем выпуска). */
export function MrCoverSlide({ year, month }: MrCoverSlideProps) {
  const reported = reportedPeriod(year, month);

  return (
    <MrSlideFrame background={BRAND} color="#ffffff" padding="96px 120px" style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '.18em', textTransform: 'uppercase', opacity: 0.8 }}>
          Управленческая отчетность
        </div>
        <MrUzumLogo color="#ffffff" size={52} wordSize={56} />
      </div>

      <div style={{ maxWidth: 1380 }}>
        <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.14, letterSpacing: '-.025em' }}>
          Закупки и договора {COMPANY_TITLE}
        </div>
        <div style={{ fontSize: 40, fontWeight: 500, marginTop: 28, opacity: 0.85 }}>
          Отчет за {monthName(reported.month)} {reported.year}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: 24,
          fontWeight: 500,
          opacity: 0.75,
        }}
      >
        <div>{DEPARTMENT_TITLE}</div>
        <div>
          {monthNameCapitalized(month)} {year}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: -180,
          bottom: -320,
          width: 760,
          height: 760,
          borderRadius: '50%',
          border: '120px solid rgba(255,255,255,.08)',
          boxSizing: 'border-box',
        }}
      />
    </MrSlideFrame>
  );
}
