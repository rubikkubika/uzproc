'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Search } from 'lucide-react';
import { useRecipientSearch } from '../hooks/useRecipientSearch';
import { SendingRecipient } from '../types/delivery-sending.types';

interface RecipientPickerProps {
  recipient: SendingRecipient;
  onPick: (recipient: SendingRecipient) => void;
  disabled?: boolean;
}

/**
 * Поле «Кому отправить»: ФИО получателя с поиском по справочнику пользователей.
 * По умолчанию подставлено значение с бэкенда, изменить можно кнопкой-карандашом.
 */
export default function RecipientPicker({ recipient, onPick, disabled }: RecipientPickerProps) {
  const [editing, setEditing] = useState(false);
  const { query, changeQuery, suggestions, searching, reset } = useRecipientSearch(editing);
  const boxRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне поля
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setEditing(false);
        reset();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing, reset]);

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs font-medium text-gray-700 mb-1">ФИО получателя</label>

      {editing ? (
        <div>
          <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
              placeholder="Введите ФИО"
              className="flex-1 text-sm text-gray-900 bg-white focus:outline-none"
            />
          </div>

          {(suggestions.length > 0 || searching) && (
            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded shadow-lg">
              {searching && suggestions.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-gray-500">Поиск…</div>
              )}
              {suggestions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={!user.email}
                  onClick={() => {
                    if (!user.email) return;
                    onPick({ fullName: user.displayName, email: user.email });
                    setEditing(false);
                    reset();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-gray-800 hover:bg-blue-50 disabled:text-gray-400 disabled:hover:bg-white disabled:cursor-not-allowed"
                >
                  <span>{user.displayName}</span>
                  <span className="text-gray-500">{user.email ? ` · ${user.email}` : ' · нет адреса'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm text-gray-900">{recipient.fullName || '—'}</div>
            <div className="text-xs text-gray-500">{recipient.email || 'адрес не указан'}</div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            title="Выбрать другого получателя"
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
