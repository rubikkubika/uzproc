'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { Delivery } from '../types/delivery.types';
import type { DeliveryComment, DeliveryCommentsPopupState } from '../types/delivery-comments.types';
import { COMMENTS_POPUP_SELECTOR } from '../constants/delivery-comments.constants';
import { computeCommentsPopupPosition } from '../utils/delivery-comments.utils';

/**
 * Попап комментариев поставки для колонки «Комментарий»: загрузка списка по клику,
 * добавление и редактирование. После добавления обновляет счётчик в строке таблицы.
 * Повторный клик по той же иконке, клик вне попапа или Escape закрывают его.
 */
export function useDeliveryComments(setCommentsCount: (deliveryId: number, count: number) => void) {
  const [popup, setPopup] = useState<DeliveryCommentsPopupState | null>(null);
  const [comments, setComments] = useState<DeliveryComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<DeliveryCommentsPopupState | null>(null);
  popupRef.current = popup;

  const close = useCallback(() => setPopup(null), []);

  const open = useCallback((delivery: Delivery, anchor: DOMRect) => {
    if (popupRef.current?.deliveryId === delivery.id) {
      setPopup(null);
      return;
    }
    setPopup({ deliveryId: delivery.id, deliveryInnerId: delivery.innerId, ...computeCommentsPopupPosition(anchor) });
    setComments([]);
    setError(null);
    setLoading(true);
    fetch(`${getBackendUrl()}/api/deliveries/${delivery.id}/comments`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DeliveryComment[]>;
      })
      .then(data => {
        // Ответ мог прийти, когда уже открыт попап другой поставки
        if (popupRef.current?.deliveryId === delivery.id) setComments(data ?? []);
      })
      .catch(() => setError('Не удалось загрузить комментарии'))
      .finally(() => setLoading(false));
  }, []);

  const send = useCallback(async (url: string, method: 'POST' | 'PATCH', text: string): Promise<DeliveryComment | null> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.status === 403) throw new Error('Редактировать можно только свой комментарий');
      if (!res.ok) throw new Error('Не удалось сохранить комментарий');
      return await res.json() as DeliveryComment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить комментарий');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  /** Добавляет комментарий; true — сохранён (форму можно очистить) */
  const add = useCallback(async (text: string): Promise<boolean> => {
    const deliveryId = popupRef.current?.deliveryId;
    if (deliveryId == null || !text.trim()) return false;
    const created = await send(`${getBackendUrl()}/api/deliveries/${deliveryId}/comments`, 'POST', text);
    if (!created) return false;
    setComments(prev => {
      const next = [...prev, created];
      setCommentsCount(deliveryId, next.length);
      return next;
    });
    return true;
  }, [send, setCommentsCount]);

  /** Сохраняет новый текст комментария; true — сохранён */
  const update = useCallback(async (commentId: number, text: string): Promise<boolean> => {
    if (!text.trim()) return false;
    const saved = await send(`${getBackendUrl()}/api/deliveries/comments/${commentId}`, 'PATCH', text);
    if (!saved) return false;
    setComments(prev => prev.map(c => (c.id === commentId ? saved : c)));
    return true;
  }, [send]);

  useEffect(() => {
    if (popup == null) return;
    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(COMMENTS_POPUP_SELECTOR)) return;
      setPopup(null);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopup(null); };
    // Слушатель клика ставим в следующем тике, чтобы не закрыть попап тем же кликом
    const t = setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
    document.addEventListener('keydown', onEscape);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [popup]);

  return { popup, comments, loading, saving, error, open, close, add, update };
}

export type DeliveryCommentsHook = ReturnType<typeof useDeliveryComments>;
