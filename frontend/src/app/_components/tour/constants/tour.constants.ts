import type { TourBlock } from '../types/tour.types';

/** Отступ подсветки вокруг элемента, px. */
export const TOUR_SPOTLIGHT_PADDING = 6;

/** Ширина карточки шага, px. */
export const TOUR_POPOVER_WIDTH = 380;

/** Ориентировочная высота карточки до первого измерения, px. */
export const TOUR_POPOVER_FALLBACK_HEIGHT = 220;

/** Зазор между подсвеченным элементом и карточкой шага, px. */
export const TOUR_POPOVER_GAP = 14;

/** Отступ карточки от краёв экрана, px. */
export const TOUR_VIEWPORT_MARGIN = 12;

/** Ширина панели оглавления шагов справа, px. */
export const TOUR_NAV_WIDTH = 220;

/** Полоса справа, занятая оглавлением: карточка шага в неё не заезжает, px. */
export const TOUR_NAV_INSET = TOUR_NAV_WIDTH + 28;

/** Задержка перед повторным замером после плавного скролла к элементу, мс. */
export const TOUR_MEASURE_DELAY = 350;

/**
 * Подсказка по управлению туром для первого шага любого раздела:
 * вставляется в body вводного шага, чтобы во всех турах она была одинаковой.
 */
export const TOUR_CONTROLS_HINT: TourBlock = {
  kind: 'list',
  items: [
    { term: '← →', text: 'переход между шагами' },
    { term: 'Esc', text: 'выйти из тура' },
    { term: 'Список справа', text: 'переход сразу к нужному шагу' },
  ],
};
