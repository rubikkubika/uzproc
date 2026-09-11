'use client';

import { useTour } from '@/app/_components/tour/hooks/useTour';
import {
  PUBLIC_PLAN_DRAFT_TOUR_STEPS,
  PUBLIC_PLAN_DRAFT_TOUR_TITLE,
  PUBLIC_PLAN_TOUR_STEPS,
  PUBLIC_PLAN_TOUR_TITLE,
} from '../constants/public-plan-tour.constants';

/**
 * Тур по публичному плану закупок или по его публичному драфту:
 * шаги и заголовок выбираются по признаку isDraft.
 */
export function usePublicPlanTour(isDraft: boolean) {
  const tour = useTour(isDraft ? PUBLIC_PLAN_DRAFT_TOUR_STEPS : PUBLIC_PLAN_TOUR_STEPS);
  const tourTitle = isDraft ? PUBLIC_PLAN_DRAFT_TOUR_TITLE : PUBLIC_PLAN_TOUR_TITLE;
  return { tour, tourTitle };
}
