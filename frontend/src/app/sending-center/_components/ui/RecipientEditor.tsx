'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Pencil } from 'lucide-react';
import { searchUsers, UserSuggestion } from '@/utils/cfo-leaders.api';
import { setSendingRecipient, resetSendingRecipient, CfoSpecificationSending } from '@/utils/sending-center.api';

interface RecipientEditorProps {
  row: CfoSpecificationSending;
  onChanged: () => void;
}

/**
 * Отображение и редактирование получателя письма для ЦФО.
 * По умолчанию — руководитель ЦФО; можно выбрать другого (с пометкой) или сбросить.
 */
export default function RecipientEditor({ row, onChanged }: RecipientEditorProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Поиск пользователей с debounce.
  useEffect(() => {
    if (!editing) return;
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, editing]);

  // Закрытие по клику вне.
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  const pick = async (user: UserSuggestion) => {
    setSaving(true);
    try {
      await setSendingRecipient(row.cfoName, user.id);
      setEditing(false);
      setQuery('');
      setSuggestions([]);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await resetSendingRecipient(row.cfoName);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      {row.recipientFullName ? (
        <div>
          <div className="flex items-center gap-1">
            <span className="text-gray-800">{row.recipientFullName}</span>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-gray-400 hover:text-blue-600"
              title="Изменить получателя"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
          {row.recipientEmail && (
            <div className="text-xs text-gray-400">{row.recipientEmail}</div>
          )}
          {row.recipientOverridden && (
            <div className="mt-0.5 flex items-center gap-1">
              <span className="text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded px-1 py-0.5">
                не руководитель ЦФО
              </span>
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="text-[10px] text-gray-400 hover:text-gray-600 underline"
              >
                сбросить
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-xs text-amber-600">Получатель не назначен</span>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-gray-400 hover:text-blue-600"
            title="Назначить получателя"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      )}

      {editing && (
        <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя, фамилия, email…"
              className="w-full pl-7 pr-6 py-1 text-xs text-gray-900 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-1 max-h-52 overflow-auto">
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={saving}
                  onClick={() => pick(u)}
                  className="w-full text-left px-2 py-1 text-xs text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  {u.displayName}
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 2 && suggestions.length === 0 && (
            <div className="mt-1 px-2 py-1 text-xs text-gray-400">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}
