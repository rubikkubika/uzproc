'use client';

import { useCallback, useState } from 'react';

/**
 * Черновик текста комментария (форма добавления или редактирования).
 * Ctrl/Cmd+Enter сохраняет, Escape отменяет (для редактирования).
 */
export function useCommentDraft(initial: string, onSubmit: (text: string) => Promise<boolean>, onCancel?: () => void) {
  const [text, setText] = useState(initial);

  const submit = useCallback(async () => {
    if (!text.trim()) return;
    const ok = await onSubmit(text);
    if (ok) setText('');
  }, [text, onSubmit]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void submit();
    }
    if (e.key === 'Escape' && onCancel) {
      // Escape закрывает только редактирование, а не весь попап
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onCancel();
    }
  }, [submit, onCancel]);

  return { text, setText, submit, onKeyDown, canSubmit: text.trim().length > 0 };
}
