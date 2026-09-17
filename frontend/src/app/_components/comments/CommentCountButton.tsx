'use client';

import type { MouseEvent } from 'react';
import { MessageSquare } from 'lucide-react';

interface Props {
  count: number;
  /** Подсветка, пока открыт попап/модалка комментариев этой строки */
  isOpen?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Облачко комментариев в ячейке таблицы (поставки, заявки, план закупок):
 * синее с числом — комментарии есть, серое — комментариев нет.
 */
export default function CommentCountButton({ count, isOpen = false, onClick }: Props) {
  const hasComments = count > 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      title={hasComments ? `Комментарии (${count})` : 'Добавить комментарий'}
      aria-label={hasComments ? `Показать комментарии (${count})` : 'Добавить комментарий'}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
        hasComments
          ? isOpen
            ? 'bg-blue-100 border-blue-300 text-blue-800'
            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
          : isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-600'
            : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:border-slate-200'
      }`}
    >
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
      {hasComments && <span className="text-[11px] font-semibold leading-none tabular-nums">{count}</span>}
    </button>
  );
}
