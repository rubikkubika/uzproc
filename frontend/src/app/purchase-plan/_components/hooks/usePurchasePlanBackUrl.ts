'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePurchasePlanMode } from '../contexts/PurchasePlanModeContext';

/**
 * URL возврата на текущий раздел плана закупок.
 *
 * Передаётся параметром `from` при переходе к договору, чтобы кнопка «Назад»
 * на странице договора вернула ровно на ту же вкладку (план или драфт), —
 * тот же приём, что в таблицах договоров и поставок. Фильтры, видимость и ширины
 * колонок таблица восстанавливает из localStorage, поэтому список открывается
 * в прежнем виде.
 */
export function usePurchasePlanBackUrl(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isDraft } = usePurchasePlanMode();

  return useMemo(() => {
    const query = searchParams?.toString();
    if (pathname) {
      return query ? `${pathname}?${query}` : pathname;
    }
    return isDraft ? '/?tab=purchase-plan-draft' : '/?tab=purchase-plan';
  }, [pathname, searchParams, isDraft]);
}
