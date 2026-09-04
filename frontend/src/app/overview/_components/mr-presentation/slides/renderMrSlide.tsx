'use client';

import type { ReactElement } from 'react';
import { MrCoverSlide } from './MrCoverSlide';
import { MrSectionSlide } from './MrSectionSlide';
import { MrKpiSlide } from './MrKpiSlide';
import { MrFeedbackSlide } from './MrFeedbackSlide';
import { MrContractsKpiSlide } from './MrContractsKpiSlide';
import { MrContractsFeedbackSlide } from './MrContractsFeedbackSlide';
import { MrThanksSlide } from './MrThanksSlide';
import { slideFooterWithNumber } from '../utils/mrPresentationFormat';
import type { MrPresentationData, MrSlide } from '../types/mr-presentation.types';

/**
 * Один слайд презентации в виде React-элемента (слайды рендерятся по одному).
 * `slideNumber` — сквозной номер слайда в презентации (с 1, титульные тоже считаются).
 */
export function renderMrSlide(
  slide: MrSlide,
  data: MrPresentationData,
  slideNumber: number
): ReactElement | null {
  const footer = slideFooterWithNumber(data.footerLabel, slideNumber);

  switch (slide.kind) {
    case 'cover':
      return <MrCoverSlide year={data.periodYear} month={data.periodMonth} />;
    case 'section':
      return <MrSectionSlide index={slide.index} title={slide.title} subtitle={slide.subtitle} />;
    case 'kpi':
      return <MrKpiSlide data={data} footer={footer} />;
    case 'feedback':
      return (
        <MrFeedbackSlide
          group={slide.group}
          sub={slide.sub}
          cards={slide.cards}
          pageIndex={slide.pageIndex}
          pageCount={slide.pageCount}
          footer={footer}
        />
      );
    case 'contracts-kpi':
      return <MrContractsKpiSlide data={data} footer={footer} />;
    case 'contracts-feedback':
      return (
        <MrContractsFeedbackSlide
          months={slide.months}
          pageIndex={slide.pageIndex}
          pageCount={slide.pageCount}
          footer={footer}
        />
      );
    case 'thanks':
      return <MrThanksSlide />;
    default:
      return null;
  }
}
