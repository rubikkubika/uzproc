'use client';

import { useCallback, useEffect, useState } from 'react';

/** Данные открытого попапа комментария согласования. */
export interface ApprovalCommentPopoverData {
  id: number;
  commentText: string;
  left: number;
  top: number;
}

/** Ширина попапа — используется для удержания его в границах окна. */
const POPOVER_WIDTH = 360;

/**
 * Попап комментария (замечания) согласования — как на карточке заявки.
 * Повторный клик по той же кнопке закрывает попап, клик вне попапа — тоже.
 */
export function useApprovalCommentPopover() {
  const [commentPopoverData, setCommentPopoverData] = useState<ApprovalCommentPopoverData | null>(null);

  const showApprovalComment = useCallback((id: number, commentText: string, anchor: DOMRect) => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const left = Math.max(16, Math.min(anchor.left, windowWidth - POPOVER_WIDTH - 16));
    setCommentPopoverData(prev => (prev?.id === id ? null : { id, commentText, left, top: anchor.top }));
  }, []);

  const closeApprovalComment = useCallback(() => setCommentPopoverData(null), []);

  // Закрытие попапа при клике вне его (слушатель ставим в следующем тике)
  useEffect(() => {
    if (commentPopoverData == null) return;
    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target instanceof Node ? e.target : null;
      if (target && (target as Element).closest?.('[data-comment-popover], [data-comment-popover-portal]')) return;
      setCommentPopoverData(null);
    };
    const t = setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [commentPopoverData]);

  return { commentPopoverData, showApprovalComment, closeApprovalComment };
}
