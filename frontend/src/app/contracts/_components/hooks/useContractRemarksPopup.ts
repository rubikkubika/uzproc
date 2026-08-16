'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBackendUrl } from '@/utils/api';
import { ContractRemarkItem, ContractRemarksPopupState } from '../types/contract-remarks.types';

/** Ширина попапа замечаний — используется для удержания его в границах окна. */
const POPUP_WIDTH = 460;
/** Минимум места снизу, при котором попап раскрывается вниз. */
const MIN_SPACE_BELOW = 260;

/**
 * Попап со всеми замечаниями по договору для колонки «Замечания» таблицы договоров.
 * Замечания загружаются по клику (список согласований договора, отфильтрованный по комментарию).
 * Повторный клик по той же иконке закрывает попап, клик вне попапа — тоже.
 */
export function useContractRemarksPopup() {
  const [popup, setPopup] = useState<ContractRemarksPopupState | null>(null);
  const [remarks, setRemarks] = useState<ContractRemarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => setPopup(null), []);

  const open = useCallback((contractId: number, contractInnerId: string | null, anchor: DOMRect) => {
    let shouldLoad = true;
    setPopup(prev => {
      if (prev?.contractId === contractId) {
        shouldLoad = false;
        return null;
      }
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : POPUP_WIDTH + 32;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      const left = Math.max(16, Math.min(anchor.left, windowWidth - POPUP_WIDTH - 16));
      const spaceBelow = windowHeight - anchor.bottom;
      const placement: 'below' | 'above' = spaceBelow >= MIN_SPACE_BELOW ? 'below' : 'above';
      return {
        contractId,
        contractInnerId,
        left,
        top: placement === 'below' ? anchor.bottom + 6 : anchor.top - 6,
        placement,
      };
    });
    if (!shouldLoad) return;

    setRemarks([]);
    setError(null);
    setLoading(true);
    fetch(`${getBackendUrl()}/api/contract-approvals/by-contract/${contractId}`)
      .then(res => {
        if (!res.ok) throw new Error('Ошибка загрузки');
        return res.json();
      })
      .then((data: ContractRemarkItem[]) => {
        setRemarks((data || []).filter(a => a.commentText != null && String(a.commentText).trim() !== ''));
      })
      .catch(() => setError('Не удалось загрузить замечания'))
      .finally(() => setLoading(false));
  }, []);

  // Закрытие попапа при клике вне его (слушатель ставим в следующем тике)
  useEffect(() => {
    if (popup == null) return;
    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target instanceof Node ? e.target : null;
      if (target && (target as Element).closest?.('[data-remarks-popup], [data-remarks-popup-portal]')) return;
      setPopup(null);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopup(null); };
    const t = setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
    document.addEventListener('keydown', onEscape);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [popup]);

  return { popup, remarks, loading, error, open, close };
}
