import {
  TOUR_POPOVER_GAP,
  TOUR_SPOTLIGHT_PADDING,
  TOUR_VIEWPORT_MARGIN,
} from '../constants/delivery-tour.constants';
import type { TourPopoverPosition, TourRect } from '../types/delivery-tour.types';

/** CSS-селектор элемента шага по ключу `data-tour`. */
export function tourTargetSelector(targetKey: string): string {
  return `[data-tour="${targetKey}"]`;
}

/**
 * Позиция карточки шага: под подсвеченным элементом, а если снизу не помещается — над ним.
 * Без привязки к элементу (rect === null) карточка центрируется в свободной части экрана.
 * `rightInset` — полоса справа, занятая оглавлением шагов: карточка в неё не заезжает.
 */
export function computePopoverPosition(
  rect: TourRect | null,
  popoverWidth: number,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  rightInset: number = 0,
): TourPopoverPosition {
  const rightBound = viewportWidth - rightInset - TOUR_VIEWPORT_MARGIN;

  if (!rect) {
    return {
      top: Math.max(TOUR_VIEWPORT_MARGIN, (viewportHeight - popoverHeight) / 2),
      left: clamp((rightBound + TOUR_VIEWPORT_MARGIN - popoverWidth) / 2, TOUR_VIEWPORT_MARGIN, rightBound - popoverWidth),
    };
  }

  const spotlightTop = rect.top - TOUR_SPOTLIGHT_PADDING;
  const spotlightBottom = rect.top + rect.height + TOUR_SPOTLIGHT_PADDING;

  let top = spotlightBottom + TOUR_POPOVER_GAP;
  if (top + popoverHeight > viewportHeight - TOUR_VIEWPORT_MARGIN) {
    const above = spotlightTop - TOUR_POPOVER_GAP - popoverHeight;
    top = above >= TOUR_VIEWPORT_MARGIN
      ? above
      : clamp(spotlightTop, TOUR_VIEWPORT_MARGIN, viewportHeight - popoverHeight - TOUR_VIEWPORT_MARGIN);
  }

  const left = clamp(
    rect.left + rect.width / 2 - popoverWidth / 2,
    TOUR_VIEWPORT_MARGIN,
    rightBound - popoverWidth,
  );

  return { top, left };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}
