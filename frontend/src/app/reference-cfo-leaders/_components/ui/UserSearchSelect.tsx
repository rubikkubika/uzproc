'use client';

import { useEffect, useRef, useState } from 'react';
import { searchUsers, type UserSuggestion } from '@/utils/cfo-leaders.api';

interface UserSearchSelectProps {
  onPick: (user: UserSuggestion) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function UserSearchSelect({ onPick, onCancel, disabled }: UserSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce поиска пользователей
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(q);
        if (!cancelled) {
          setSuggestions(users);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoFocus
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Поиск пользователя: ФИО, логин, email…"
        className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-500">Поиск…</div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">Ничего не найдено</div>
          )}
          {!loading &&
            suggestions.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onPick(u)}
                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
              >
                {u.displayName}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
