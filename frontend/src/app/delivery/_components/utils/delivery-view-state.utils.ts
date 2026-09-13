import type { SortDirection, SortField } from '../types/delivery.types';
import type { DeliveryQuery } from '../types/delivery-query.types';
import { DELIVERY_VIEW_STATE_KEY } from '../constants/delivery.constants';

/**
 * Состояние таблицы поставок, которое восстанавливается при возврате со страницы договора или заявки:
 * все фильтры, вкладка, сортировка и позиция в списке (сколько строк было подгружено и прокрутка).
 */
export interface DeliveryViewState {
  query: DeliveryQuery;
  sortField: SortField;
  sortDirection: SortDirection;
  /** Сколько строк было подгружено бесконечной прокруткой */
  loadedCount: number;
  scrollTop: number;
}

/** Хранится в sessionStorage: возврат в пределах вкладки браузера, новая сессия открывает раздел с нуля. */
export function readDeliveryViewState(): DeliveryViewState | null {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(DELIVERY_VIEW_STATE_KEY) : null;
    return raw ? (JSON.parse(raw) as DeliveryViewState) : null;
  } catch {
    return null;
  }
}

export function writeDeliveryViewState(patch: Partial<DeliveryViewState>): void {
  try {
    const current = readDeliveryViewState();
    sessionStorage.setItem(DELIVERY_VIEW_STATE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // sessionStorage недоступен — возврат откроет раздел в состоянии по умолчанию
  }
}
