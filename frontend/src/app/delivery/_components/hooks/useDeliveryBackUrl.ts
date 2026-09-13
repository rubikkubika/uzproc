'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { DELIVERY_SECTION_URL } from '../constants/delivery.constants';

/**
 * URL возврата в раздел «Поставки» — параметр `from` при переходе к договору или заявке,
 * чтобы кнопка «Назад» вернула ровно сюда. Раздел открывается вкладкой главной страницы
 * (`/?tab=delivery`), отдельного маршрута `/delivery` нет.
 */
export function useDeliveryBackUrl(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const query = searchParams?.toString();
    if (pathname === '/' && query) return `/?${query}`;
    return DELIVERY_SECTION_URL;
  }, [pathname, searchParams]);
}
