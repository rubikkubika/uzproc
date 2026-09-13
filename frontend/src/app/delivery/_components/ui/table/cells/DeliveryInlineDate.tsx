'use client';

import type { ReactNode } from 'react';
import { useInlineDateEditor } from '../../../hooks/useInlineDateEditor';
import { formatShortDate } from '../../../utils/date.utils';

interface Props {
  value: string | null;
  title: string;
  onCommit: (isoDate: string) => void;
  /** Классы текста даты (цвет, насыщенность) */
  textClass: string;
  trailing?: ReactNode;
}

/** Дата, редактируемая по клику: пунктирное подчёркивание в покое, поле ввода при редактировании. */
export default function DeliveryInlineDate({ value, title, onCommit, textClass, trailing }: Props) {
  const editor = useInlineDateEditor(value, onCommit);

  if (editor.editing) {
    return (
      <input
        type="date"
        autoFocus
        value={editor.draft}
        onChange={(e) => editor.setDraft(e.target.value)}
        onBlur={editor.onBlur}
        onKeyDown={editor.onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-[118px] h-[18px] px-1 text-[11px] border border-blue-400 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  return (
    <span className="flex items-center gap-1 min-w-0">
      <button
        type="button"
        title={title}
        onClick={(e) => { e.stopPropagation(); editor.start(); }}
        className={`border-b border-dashed border-slate-300 hover:border-blue-500 cursor-text tabular-nums ${value ? textClass : 'text-slate-400 font-normal'}`}
      >
        {formatShortDate(value)}
      </button>
      {trailing}
    </span>
  );
}
