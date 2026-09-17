'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { DeliveryCommentsHook } from '../../hooks/useDeliveryComments';
import { useEditingComment } from '../../hooks/useEditingComment';
import { COMMENTS_POPUP_WIDTH } from '../../constants/delivery-comments.constants';
import DeliveryCommentItem from './DeliveryCommentItem';
import DeliveryCommentForm from './DeliveryCommentForm';

interface Props {
  comments: DeliveryCommentsHook;
}

/**
 * Попап комментариев поставки: список (автор, дата, текст), редактирование своих и форма добавления.
 * Рендерится в портале, чтобы не обрезался прокруткой таблицы.
 */
export default function DeliveryCommentsPopup({ comments }: Props) {
  const { popup, loading, saving, error } = comments;
  const editing = useEditingComment(popup?.deliveryId ?? null);

  if (!popup || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-delivery-comments-portal
      className="fixed z-[100] max-w-[calc(100vw-32px)] rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{
        width: COMMENTS_POPUP_WIDTH,
        left: popup.left,
        top: popup.top,
        transform: popup.placement === 'above' ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <span className="text-xs font-semibold text-gray-800 truncate">
          Комментарии{popup.deliveryInnerId ? ` — поставка ${popup.deliveryInnerId}` : ''}
          {!loading && comments.comments.length > 0 && (
            <span className="ml-1 text-gray-500 font-normal">({comments.comments.length})</span>
          )}
        </span>
        <button type="button" onClick={comments.close} className="p-0.5 rounded hover:bg-gray-200 flex-shrink-0" aria-label="Закрыть">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      <div className="max-h-[45vh] overflow-y-auto custom-scrollbar divide-y divide-gray-100">
        {loading && <div className="px-2 py-4 text-xs text-gray-500 text-center">Загрузка...</div>}
        {!loading && comments.comments.length === 0 && (
          <div className="px-2 py-4 text-xs text-gray-400 text-center">Комментариев пока нет</div>
        )}
        {!loading && comments.comments.map((comment) => (
          <DeliveryCommentItem
            key={comment.id}
            comment={comment}
            editing={editing.editingId === comment.id}
            saving={saving}
            onEdit={() => editing.start(comment.id)}
            onCancelEdit={editing.stop}
            onSave={async (text) => {
              const ok = await comments.update(comment.id, text);
              if (ok) editing.stop();
              return ok;
            }}
          />
        ))}
      </div>

      {error && <div className="px-2.5 py-1 text-[11px] text-red-600 border-t border-gray-100">{error}</div>}

      <div className="px-2.5 py-2 border-t border-gray-200 bg-gray-50/60 rounded-b-lg">
        <DeliveryCommentForm
          key={popup.deliveryId}
          saving={saving}
          submitLabel="Добавить"
          placeholder="Новый комментарий…"
          onSubmit={comments.add}
        />
      </div>
    </div>,
    document.body,
  );
}
