import {
  CONTRACT_FEEDBACK_CARDS_PER_ROW,
  CONTRACT_FEEDBACK_ROWS_PER_SLIDE,
  FEEDBACK_CARDS_PER_SLIDE,
  FEEDBACK_GROUPS,
} from '../constants/mr-presentation.constants';
import type {
  MrContractFeedbackMonth,
  MrCsiFeedback,
  MrPresentationData,
  MrSlide,
  SpecificationFeedbackDashboardCard,
} from '../types/mr-presentation.types';

/** Группа ЦФО, к которой относится оценка (по ключевым словам). */
export function resolveGroup(cfo: string | undefined): string | null {
  if (!cfo) return null;
  for (const g of FEEDBACK_GROUPS) {
    if (g.keywords.some((k) => cfo.toLowerCase().includes(k.toLowerCase()))) return g.label;
  }
  return null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/** Слайды обратной связи инициаторов по группам ЦФО. */
function buildFeedbackSlides(feedbacks: MrCsiFeedback[]): MrSlide[] {
  const slides: MrSlide[] = [];
  for (const group of FEEDBACK_GROUPS) {
    const cards = feedbacks.filter((f) => resolveGroup(f.cfo) === group.label);
    if (cards.length === 0) continue;
    const pages = chunk(cards, FEEDBACK_CARDS_PER_SLIDE);
    pages.forEach((pageCards, index) => {
      slides.push({
        kind: 'feedback',
        group: group.label,
        sub: group.sub,
        cards: pageCards,
        pageIndex: index + 1,
        pageCount: pages.length,
      });
    });
  }
  return slides;
}

/** Карточки оценок по спецификациям, сгруппированные по месяцам (свежий месяц сверху). */
function groupSpecificationFeedback(
  cards: SpecificationFeedbackDashboardCard[],
  items: { periodYear: number | null; periodMonth: number | null }[],
  year: number
): MrContractFeedbackMonth[] {
  const map = new Map<number, SpecificationFeedbackDashboardCard[]>();
  cards.forEach((card, i) => {
    const meta = items[i];
    if (meta.periodYear !== year) return;
    const key = meta.periodMonth ?? 0;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(card);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([month, monthCards]) => ({
      month,
      year,
      totalInMonth: monthCards.length,
      cards: monthCards.sort((a, b) => (a.cfoName ?? '').localeCompare(b.cfoName ?? '', 'ru')),
    }));
}

/**
 * Разбивка месяцев на слайды по рядам карточек: каждый месяц начинает новый ряд
 * и добавляет заголовок, поэтому ёмкость слайда считается рядами, а не карточками.
 * Месяц, не помещающийся целиком, переносится на следующий слайд по границе ряда.
 */
function paginateContractFeedback(months: MrContractFeedbackMonth[]): MrContractFeedbackMonth[][] {
  const pages: MrContractFeedbackMonth[][] = [];
  let current: MrContractFeedbackMonth[] = [];
  let usedRows = 0;

  const flush = () => {
    if (current.length > 0) pages.push(current);
    current = [];
    usedRows = 0;
  };

  for (const month of months) {
    let offset = 0;
    while (offset < month.cards.length) {
      const freeRows = CONTRACT_FEEDBACK_ROWS_PER_SLIDE - usedRows;
      if (freeRows <= 0) {
        flush();
        continue;
      }
      const slice = month.cards.slice(offset, offset + freeRows * CONTRACT_FEEDBACK_CARDS_PER_ROW);
      current.push({ ...month, cards: slice });
      usedRows += Math.ceil(slice.length / CONTRACT_FEEDBACK_CARDS_PER_ROW);
      offset += slice.length;
    }
  }
  flush();
  return pages;
}

/** Полный список слайдов презентации по загруженным данным. */
export function buildSlides(data: MrPresentationData): MrSlide[] {
  const slides: MrSlide[] = [
    { kind: 'cover' },
    {
      kind: 'section',
      index: '01',
      title: 'Закупки',
      subtitle: 'Ключевые показатели · экономия · SLA · удовлетворённость инициаторов',
    },
    { kind: 'kpi' },
  ];

  slides.push(...buildFeedbackSlides(data.csiFeedbacks));

  slides.push(
    {
      kind: 'section',
      index: '02',
      title: 'Договора',
      subtitle: 'Документооборот по договорникам · сроки согласования · оценка инициаторов',
    },
    { kind: 'contracts-kpi' }
  );

  const rawItems = data.specificationFeedback?.items ?? [];
  const cards: SpecificationFeedbackDashboardCard[] = rawItems.map((i) => ({
    cfoName: i.cfoName,
    ratedBy: i.ratedBy,
    overall: i.overall,
    speedRating: i.speedRating,
    businessRating: i.businessRating,
    comment: i.comment,
    specificationCount: i.specificationCount,
    totalAmount: i.totalAmount,
    ratedAt: i.ratedAt,
  }));
  const months = groupSpecificationFeedback(cards, rawItems, data.dataYear);
  const contractPages = paginateContractFeedback(months);
  contractPages.forEach((page, index) => {
    slides.push({
      kind: 'contracts-feedback',
      months: page,
      pageIndex: index + 1,
      pageCount: contractPages.length,
    });
  });

  slides.push({ kind: 'thanks' });
  return slides;
}
