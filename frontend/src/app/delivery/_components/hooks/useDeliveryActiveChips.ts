'use client';

import { useMemo } from 'react';
import type { HorizonKey, ReportSliceFilter } from '../types/delivery-query.types';
import { REPORT_SLICE_LABELS } from '../constants/delivery.constants';
import { HORIZON_CHIP_LABELS } from '../constants/delivery-horizon.constants';
import { MONTH_FULL_LABELS } from '../constants/delivery-deadline-chart.constants';
import { parseIsoDate } from '../utils/date.utils';

/** ISO → дд.мм.гггг для подписи чипа */
const formatIso = (iso: string) => iso.split('-').reverse().join('.');

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
  reportSlice: ReportSliceFilter | null;
  clearReportSlice: () => void;
}

/** Чипы активных срезов в панели фильтров: выбранный день, группа горизонта, срез недельного отчёта. */
export function useDeliveryActiveChips({ plannedDate, clearDay, horizon, clearHorizon, reportSlice, clearReportSlice }: Params) {
  return useMemo(() => {
    const chips: ActiveChip[] = [];
    const day = parseIsoDate(plannedDate);
    if (day) chips.push({ key: 'day', label: `${day.getDate()} ${MONTH_FULL_LABELS[day.getMonth()]}`, onClear: clearDay });
    if (horizon) chips.push({ key: 'horizon', label: HORIZON_CHIP_LABELS[horizon], onClear: clearHorizon });
    if (reportSlice) {
      chips.push({
        key: 'report-slice',
        label: `${REPORT_SLICE_LABELS[reportSlice.kind]} · ${formatIso(reportSlice.from)}–${formatIso(reportSlice.to)}`,
        onClear: clearReportSlice,
      });
    }
    return chips;
  }, [plannedDate, clearDay, horizon, clearHorizon, reportSlice, clearReportSlice]);
}
