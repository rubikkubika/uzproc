'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { DeliveryViewState } from '../utils/delivery-view-state.utils';
import { PAGE_SIZE } from '../constants/delivery.constants';

interface Params {
  saved: DeliveryViewState | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  itemsCount: number;
}

/**
 * Возврат на прежнее место в списке: первым запросом подгружается столько строк, сколько было
 * до ухода со страницы (кратно размеру страницы — нумерация следующих страниц не сбивается),
 * затем восстанавливается прокрутка. Срабатывает один раз после монтирования.
 */
export function useDeliveryPositionRestore({ saved, scrollRef, loading, itemsCount }: Params) {
  const pendingRef = useRef(saved && saved.loadedCount > 0 ? { loadedCount: saved.loadedCount, scrollTop: saved.scrollTop } : null);

  /** Размер первого запроса списка: при ожидающем восстановлении — все ранее подгруженные страницы */
  const initialSize = useCallback(() => {
    const pending = pendingRef.current;
    return pending ? Math.ceil(pending.loadedCount / PAGE_SIZE) * PAGE_SIZE : PAGE_SIZE;
  }, []);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || loading) return;
    if (scrollRef.current && itemsCount > 0) scrollRef.current.scrollTop = pending.scrollTop;
    pendingRef.current = null;
  }, [loading, itemsCount, scrollRef]);

  return { initialSize };
}
