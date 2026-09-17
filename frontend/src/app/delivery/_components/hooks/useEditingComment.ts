'use client';

import { useCallback, useState } from 'react';

/** Какой комментарий в попапе сейчас редактируется; при смене поставки редактирование не переносится. */
export function useEditingComment(deliveryId: number | null) {
  const [editing, setEditing] = useState<{ deliveryId: number | null; commentId: number } | null>(null);

  const start = useCallback((commentId: number) => setEditing({ deliveryId, commentId }), [deliveryId]);
  const stop = useCallback(() => setEditing(null), []);

  return { editingId: editing?.deliveryId === deliveryId ? editing.commentId : null, start, stop };
}
