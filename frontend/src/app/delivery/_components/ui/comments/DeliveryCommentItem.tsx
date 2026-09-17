'use client';

import { Pencil } from 'lucide-react';
import type { DeliveryComment } from '../../types/delivery-comments.types';
import { formatCommentDate } from '../../utils/delivery-comments.utils';
import DeliveryCommentForm from './DeliveryCommentForm';

interface Props {
  comment: DeliveryComment;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (text: string) => Promise<boolean>;
}

/** Комментарий в попапе: автор, дата, текст; свой комментарий можно отредактировать. */
export default function DeliveryCommentItem({ comment, editing, saving, onEdit, onCancelEdit, onSave }: Props) {
  const edited = comment.updatedAt && comment.createdAt && comment.updatedAt.slice(0, 19) !== comment.createdAt.slice(0, 19);

  return (
    <div className="px-2.5 py-2">
      <div className="flex items-center gap-2 mb-1 text-[10px] text-gray-500">
        <span className="font-medium text-gray-800 truncate">{comment.createdByUserName ?? 'Из отчёта'}</span>
        <span className="tabular-nums">{formatCommentDate(comment.createdAt)}</span>
        {edited && <span className="text-gray-400" title={`Изменён ${formatCommentDate(comment.updatedAt)}`}>(изм.)</span>}
        {comment.editable && !editing && (
          <button
            type="button"
            onClick={onEdit}
            title="Редактировать"
            aria-label="Редактировать комментарий"
            className="ml-auto p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {editing ? (
        <DeliveryCommentForm
          initialText={comment.text}
          saving={saving}
          submitLabel="Сохранить"
          onSubmit={onSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-gray-900 whitespace-pre-wrap break-words leading-snug">
          {comment.text}
        </div>
      )}
    </div>
  );
}
