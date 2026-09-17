import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { Delivery } from '../types/delivery.types';

type DateEndpoint = 'planned-delivery-date' | 'actual-delivery-date' | 'esf-date';
type DateField = 'plannedDeliveryDate' | 'actualDeliveryDate' | 'esfDate';

/**
 * Редактирование дат прямо в таблице. Значение обновляется оптимистично, затем строка берётся
 * из ответа сервера: для факта сервер меняет и статус отгрузки, и статус оплаты.
 * При ошибке строка возвращается к прежнему виду.
 */
export function useDeliveryRowMutations(setAllItems: Dispatch<SetStateAction<Delivery[]>>) {
  const patchDate = useCallback(async (
    id: number,
    field: DateField,
    endpoint: DateEndpoint,
    newDate: string,
    optimistic: (item: Delivery) => Delivery,
  ) => {
    let previous: Delivery | undefined;
    setAllItems(items => items.map(it => {
      if (it.id !== id) return it;
      previous = it;
      return optimistic(it);
    }));
    try {
      const res = await fetch(`${getBackendUrl()}/api/deliveries/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newDate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json() as Delivery;
      setAllItems(items => items.map(it => (it.id === id ? { ...it, ...saved } : it)));
    } catch (err) {
      console.error(`Не удалось обновить дату поставки (${field}):`, err);
      if (previous) {
        const restored = previous;
        setAllItems(items => items.map(it => (it.id === id ? restored : it)));
      }
    }
  }, [setAllItems]);

  /**
   * Плановая дата: пустая строка возвращает её в автоматический режим (снова равна дедлайну),
   * непустая — фиксирует: автопересчёты такую дату не меняют.
   */
  const updatePlannedDeliveryDate = useCallback((id: number, newDate: string) => patchDate(
    id, 'plannedDeliveryDate', 'planned-delivery-date', newDate,
    it => ({ ...it, plannedDeliveryDate: newDate || it.deliveryDeadline, plannedDeliveryDateManual: Boolean(newDate) }),
  ), [patchDate]);

  /** Фактическая дата: с датой поставка переходит в «Поставлено», пустая — снова ожидается */
  const updateActualDeliveryDate = useCallback((id: number, newDate: string) => patchDate(
    id, 'actualDeliveryDate', 'actual-delivery-date', newDate,
    it => ({ ...it, actualDeliveryDate: newDate || null }),
  ), [patchDate]);

  const updateEsfDate = useCallback((id: number, newDate: string) => patchDate(
    id, 'esfDate', 'esf-date', newDate,
    it => ({ ...it, esfDate: newDate || null }),
  ), [patchDate]);

  /** Счётчик комментариев строки — после добавления комментария в попапе */
  const setCommentsCount = useCallback((id: number, count: number) => {
    setAllItems(items => items.map(it => (it.id === id ? { ...it, commentsCount: count } : it)));
  }, [setAllItems]);

  return { updatePlannedDeliveryDate, updateActualDeliveryDate, updateEsfDate, setCommentsCount };
}
