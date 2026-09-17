import type { DeliveryCommentsPopupState } from '../types/delivery-comments.types';
import { COMMENTS_POPUP_MIN_SPACE_BELOW, COMMENTS_POPUP_WIDTH } from '../constants/delivery-comments.constants';

/** Дата комментария: дд.мм.гггг чч:мм, «—» если даты нет */
export function formatCommentDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Позиция попапа у иконки: не выходит за край окна, раскрывается вверх, если снизу мало места */
export function computeCommentsPopupPosition(anchor: DOMRect): Pick<DeliveryCommentsPopupState, 'left' | 'top' | 'placement'> {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const left = Math.max(16, Math.min(anchor.right - COMMENTS_POPUP_WIDTH, windowWidth - COMMENTS_POPUP_WIDTH - 16));
  const placement = windowHeight - anchor.bottom >= COMMENTS_POPUP_MIN_SPACE_BELOW ? 'below' : 'above';
  return { left, top: placement === 'below' ? anchor.bottom + 6 : anchor.top - 6, placement };
}
