'use client';

import { useMemo } from 'react';
import type { HorizonKey } from '../types/delivery-query.types';
import { HORIZON_CHIP_LABELS } from '../constants/delivery-horizon.constants';
import { MONTH_FULL_LABELS } from '../constants/delivery-deadline-chart.constants';
import { parseIsoDate } from '../utils/date.utils';

export interface ActiveChip {
  key: string;
  label: string;
  onClear: () => void;
}

interface Params {
  plannedDate: string | null;
  clearDay: () => void;
  horizon: HorizonKey | null;
  clearHorizon: () => void;
}

/** Чипы активных срезов в панели фильтров: выбранный день, группа горизонта. */
export function useDeliveryActiveChips({ plannedDate, clearDay, horizon, clearHorizon }: Params) {
  return useMemo(() => {
    const chips: ActiveChip[] = [];
    const day = parseIsoDate(plannedDate);
    if (day) chips.push({ key: 'day', label: `${day.getDate()} ${MONTH_FULL_LABELS[day.getMonth()]}`, onClear: clearDay });
    if (horizon) chips.push({ key: 'horizon', label: HORIZON_CHIP_LABELS[horizon], onClear: clearHorizon });
    return chips;
  }, [plannedDate, clearDay, horizon, clearHorizon]);
}
