'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { searchUsers, UserSuggestion } from '@/utils/cfo-leaders.api';
import {
  RECIPIENT_SEARCH_DEBOUNCE_MS,
  RECIPIENT_SEARCH_MIN_LENGTH,
} from '../constants/delivery-sending.constants';

/**
 * Поиск получателя письма по ФИО с debounce.
 * Возвращает строку поиска, найденных пользователей и признак выполняющегося запроса.
 */
export function useRecipientSearch(enabled: boolean) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<UserSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  const isSearchable = query.trim().length >= RECIPIENT_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!enabled || !isSearchable) return;

    const timer = setTimeout(() => {
      searchUsers(query.trim())
        .then(setFound)
        .catch(() => setFound([]))
        .finally(() => setSearching(false));
    }, RECIPIENT_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled, isSearchable]);

  /** Ввод в поле: сразу помечаем, что идёт поиск — результаты придут после debounce */
  const changeQuery = useCallback((value: string) => {
    setQuery(value);
    setSearching(value.trim().length >= RECIPIENT_SEARCH_MIN_LENGTH);
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setFound([]);
    setSearching(false);
  }, []);

  // Пока запрос короче минимального — подсказки не показываем
  const suggestions = useMemo(() => (isSearchable ? found : []), [isSearchable, found]);

  return { query, changeQuery, suggestions, searching: searching && isSearchable, reset };
}
