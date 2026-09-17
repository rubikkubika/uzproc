'use client';

import { useTour } from '@/app/_components/tour/hooks/useTour';
import type { TourController } from '@/app/_components/tour/types/tour.types';
import { usePurchasePlanMode } from '../contexts/PurchasePlanModeContext';
import {
  PURCHASE_PLAN_DRAFT_TOUR_STEPS,
  PURCHASE_PLAN_DRAFT_TOUR_TITLE,
  PURCHASE_PLAN_TOUR_STEPS,
  PURCHASE_PLAN_TOUR_TITLE,
} from '../constants/purchase-plan-tour.constants';

/**
 * Ознакомительный тур по разделу: для действующего плана и для драфта — свои шаги.
 * Режим берётся из PurchasePlanModeContext, запуск — кнопкой «?» (tour.start).
 */
export function usePurchasePlanTour(): { tour: TourController; tourTitle: string } {
  const { isDraft } = usePurchasePlanMode();
  const tour = useTour(isDraft ? PURCHASE_PLAN_DRAFT_TOUR_STEPS : PURCHASE_PLAN_TOUR_STEPS);
  return {
    tour,
    tourTitle: isDraft ? PURCHASE_PLAN_DRAFT_TOUR_TITLE : PURCHASE_PLAN_TOUR_TITLE,
  };
}
