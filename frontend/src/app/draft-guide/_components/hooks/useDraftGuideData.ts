'use client';

import { useEffect, useState } from 'react';
import type { GuideData } from '../types/draft-guide.types';
import { EMPTY_GUIDE_DATA, formatSlaTotals } from '../utils/draft-guide.utils';
import { fetchDraftItems, fetchDraftPurchasers, fetchDraftSlaTable } from '../utils/draftGuideApi';
import { pickCheckedExamples, pickPurchasers, pickSubjectExamples } from '../utils/draftGuideExamples';

/**
 * Данные инструкции по драфту выбранного года: сроки SLA, сводка по закупщикам
 * и примеры формулировок из реальных позиций драфта.
 *
 * Пока данные года не загружены, инструкция читается с пустыми примерами —
 * тексты выводятся со словесными заглушками вместо цифр.
 */
export function useDraftGuideData(year: number | null) {
  const [loaded, setLoaded] = useState<GuideData | null>(null);

  useEffect(() => {
    if (year === null) return;

    let cancelled = false;
    Promise.all([fetchDraftSlaTable(year), fetchDraftPurchasers(year), fetchDraftItems(year)])
      .then(([slaTable, purchasers, items]) => {
        if (cancelled) return;
        setLoaded({
          year,
          prevYear: year - 1,
          sla: formatSlaTotals(slaTable),
          purchasers: pickPurchasers(purchasers),
          subjects: pickSubjectExamples(items),
          checked: pickCheckedExamples(items),
        });
      })
      .catch(() => {
        // Инструкция читается и без примеров — показываем её с одним лишь годом
        if (!cancelled) setLoaded({ ...EMPTY_GUIDE_DATA, year, prevYear: year - 1 });
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  // Данные соответствуют запрошенному году — иначе это ещё результат предыдущего года
  const isReady = year === null || loaded?.year === year;
  const data = isReady && loaded ? loaded : { ...EMPTY_GUIDE_DATA, year, prevYear: year !== null ? year - 1 : null };

  return { data, isLoading: !isReady };
}
