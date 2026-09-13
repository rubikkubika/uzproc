import { useEffect, useState } from 'react';
import type { PageResponse } from '../types/delivery.types';
import type { DeliveryQuery, DeliveryTab } from '../types/delivery-query.types';

export interface DeliveryTabCounts {
  all: number | null;
  inWork: number | null;
  closed: number | null;
  closedReview: number | null;
}

const EMPTY_COUNTS: DeliveryTabCounts = { all: null, inWork: null, closed: null, closedReview: null };

type FetchPage = (page: number, size: number, sortField: null, sortDirection: null, query: DeliveryQuery) => Promise<PageResponse | null>;

/** Счётчики вкладок с учётом текущих фильтров (size=1, читаем totalElements). */
export function useDeliveryTabCounts(query: DeliveryQuery, reloadKey: number, fetchPage: FetchPage) {
  const [tabCounts, setTabCounts] = useState<DeliveryTabCounts>(EMPTY_COUNTS);
  const queryStr = JSON.stringify({ ...query, tab: null });

  useEffect(() => {
    let cancelled = false;
    const base: DeliveryQuery = JSON.parse(queryStr);
    const count = async (tab: DeliveryTab) => (await fetchPage(0, 1, null, null, { ...base, tab }))?.totalElements ?? 0;

    Promise.all([count('all'), count('in-work'), count('closed'), count('closed-review')])
      .then(([all, inWork, closed, closedReview]) => {
        if (!cancelled) setTabCounts({ all, inWork, closed, closedReview });
      })
      .catch(() => {
        if (!cancelled) setTabCounts(EMPTY_COUNTS);
      });
    return () => { cancelled = true; };
  }, [queryStr, reloadKey, fetchPage]);

  return tabCounts;
}
