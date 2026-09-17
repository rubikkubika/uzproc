'use client';

import { MessageSquare, MessageSquarePlus } from 'lucide-react';

interface Props {
  count: number;
  isOpen: boolean;
  onOpen: (anchor: DOMRect) => void;
}

/** Ячейка «Комментарий»: облачко с количеством комментариев; без комментариев — кнопка добавления. */
export default function DeliveryCommentsCell({ count, isOpen, onOpen }: Props) {
  const hasComments = count > 0;

  return (
    <span data-delivery-comments className="inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(e.currentTarget.getBoundingClientRect());
        }}
        title={hasComments ? `Комментарии (${count})` : 'Добавить комментарий'}
        aria-label={hasComments ? 'Показать комментарии поставки' : 'Добавить комментарий к поставке'}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
          hasComments
            ? isOpen
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            : isOpen
              ? 'bg-slate-100 border-slate-300 text-slate-600'
              : 'border-transparent text-slate-300 hover:text-slate-500 hover:bg-slate-50 hover:border-slate-200'
        }`}
      >
        {hasComments ? (
          <>
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[11px] font-semibold leading-none tabular-nums">{count}</span>
          </>
        ) : (
          <MessageSquarePlus className="w-3.5 h-3.5 flex-shrink-0" />
        )}
      </button>
    </span>
  );
}
