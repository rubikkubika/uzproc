'use client';

import { useCommentDraft } from '../../hooks/useCommentDraft';

interface Props {
  initialText?: string;
  saving: boolean;
  submitLabel: string;
  placeholder?: string;
  onSubmit: (text: string) => Promise<boolean>;
  /** Есть — показывается кнопка «Отмена» (режим редактирования) */
  onCancel?: () => void;
}

/** Поле ввода комментария с кнопками: добавление нового или редактирование существующего. */
export default function DeliveryCommentForm({ initialText = '', saving, submitLabel, placeholder, onSubmit, onCancel }: Props) {
  const draft = useCommentDraft(initialText, onSubmit, onCancel);

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        autoFocus={Boolean(onCancel)}
        rows={onCancel ? 3 : 2}
        value={draft.text}
        placeholder={placeholder}
        disabled={saving}
        onChange={(e) => draft.setText(e.target.value)}
        onKeyDown={draft.onKeyDown}
        onFocus={(e) => { const len = e.currentTarget.value.length; e.currentTarget.setSelectionRange(len, len); }}
        className="w-full resize-y px-2 py-1 text-xs leading-snug border border-gray-300 rounded bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
      />
      <div className="flex items-center justify-end gap-1.5">
        <span className="mr-auto text-[10px] text-gray-400">Ctrl+Enter — сохранить</span>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving}
            className="px-2 py-0.5 text-[11px] rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
        )}
        <button type="button" onClick={() => void draft.submit()} disabled={saving || !draft.canSubmit}
          className="px-2 py-0.5 text-[11px] rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Сохранение…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
