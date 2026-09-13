'use client';

import { useCallback, useState } from 'react';

/**
 * Редактирование даты прямо в ячейке: в покое показывается текст, по клику — поле ввода.
 * Сохраняется по уходу из поля или Enter (промежуточные значения date-инпута приходят пустыми,
 * поэтому запрос на каждое изменение стирал бы дату); Escape отменяет ввод.
 * Значение для сохранения берётся из самого поля, а не из замыкания: blur после Escape
 * иначе мог бы сохранить уже отменённый ввод.
 */
export function useInlineDateEditor(value: string | null, onCommit: (isoDate: string) => void) {
  const saved = value ? value.slice(0, 10) : '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);

  const start = useCallback(() => {
    setDraft(saved);
    setEditing(true);
  }, [saved]);

  const onBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const next = e.currentTarget.value;
    setEditing(false);
    if (next !== saved) onCommit(next);
  }, [saved, onCommit]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      // Возвращаем сохранённое значение в поле до blur — тогда сохранять нечего
      e.currentTarget.value = saved;
      setDraft(saved);
      e.currentTarget.blur();
    }
  }, [saved]);

  return { editing, draft, setDraft, start, onBlur, onKeyDown };
}
