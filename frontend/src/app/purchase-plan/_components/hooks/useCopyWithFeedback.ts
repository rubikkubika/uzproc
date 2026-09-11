import { useCallback, useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/utils/clipboard';

/** Сколько миллисекунд показывать отметку «Скопировано» у нажатой кнопки */
const COPIED_FEEDBACK_MS = 1500;

/**
 * Копирование текста в буфер обмена с кратковременной отметкой «Скопировано»:
 * copiedKey — ключ кнопки, по которой только что скопировали.
 */
export function useCopyWithFeedback() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await copyToClipboard(text);
    } catch {
      alert('Не удалось скопировать ссылку');
      return;
    }
    setCopiedKey(key);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiedKey(null), COPIED_FEEDBACK_MS);
  }, []);

  return { copiedKey, copy };
}
