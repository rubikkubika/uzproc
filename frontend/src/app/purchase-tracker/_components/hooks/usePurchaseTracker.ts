import { useCallback, useMemo, useState } from 'react';
import type { DetailView, ResultView } from '../types/purchase-tracker.types';
import { buildDetailView, buildResultView } from '../utils/purchase-tracker.utils';
import { usePurchaseTrackerData } from './usePurchaseTrackerData';
import { useProcurementFavorites } from './useProcurementFavorites';

interface UsePurchaseTrackerOptions {
  /** Показывать упрощённые названия ролей вместо официальных */
  simpleLanguage?: boolean;
  /** Показывать баннер прогноза даты договора */
  showForecast?: boolean;
  /** ID текущего пользователя (null — не залогинен) */
  userId: number | null;
}

interface UsePurchaseTrackerResult {
  query: string;
  onQueryChange: (value: string) => void;
  onChipClick: (value: string) => void;
  onSelect: (id: number) => void;
  /** Выбор карточки из избранного (очищает результаты поиска) */
  onSelectFavorite: (id: number) => void;
  /** Результаты поиска (основная область, ищет среди всех закупок) */
  results: ResultView[];
  /** Запрос введён, но ничего не найдено */
  empty: boolean;
  /** Запрос ещё не введён — показываем подсказку */
  idle: boolean;
  loading: boolean;
  error: string | null;
  detail: DetailView | null;
  /** Можно ли добавлять в избранное (пользователь залогинен) */
  canFavorite: boolean;
  /** Проверка: закупка в избранном */
  isFavorite: (id: number) => boolean;
  /** Переключить избранное */
  onToggleFavorite: (id: number) => void;
  /** Карточки избранного (для левого блока), отфильтрованные локальным поиском */
  favoritesResults: ResultView[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  /** У пользователя вообще нет избранного */
  favoritesEmpty: boolean;
  /** Строка отдельного поиска по избранному */
  favoritesQuery: string;
  onFavoritesQueryChange: (value: string) => void;
}

/**
 * Главный хук страницы «Трекер закупок».
 * Основная область — поиск среди всех закупок; избранное — независимый набор карточек
 * для левого блока. Деталь открывается по выбору карточки из любого набора.
 */
export function usePurchaseTracker(options: UsePurchaseTrackerOptions): UsePurchaseTrackerResult {
  const { simpleLanguage = true, showForecast = true, userId } = options;

  const [query, setQuery] = useState('');
  const [favoritesQuery, setFavoritesQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const search = usePurchaseTrackerData(query);
  const favorites = useProcurementFavorites(userId);

  const searchItems = search.items;
  const favoriteItems = favorites.favorites;

  // Отдельный локальный поиск по избранному (по номеру, предмету, инициатору)
  const filteredFavoriteItems = useMemo(() => {
    const q = favoritesQuery.trim().toLowerCase();
    if (!q) return favoriteItems;
    return favoriteItems.filter(
      (p) =>
        String(p.id).includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.initiator.toLowerCase().includes(q),
    );
  }, [favoriteItems, favoritesQuery]);

  // Выбранная закупка ищется в обоих наборах (поиск + избранное)
  const selected = useMemo(() => {
    const inSearch = searchItems.find((item) => item.id === selectedId);
    if (inSearch) return inSearch;
    return favoriteItems.find((item) => item.id === selectedId) ?? null;
  }, [searchItems, favoriteItems, selectedId]);

  const results = useMemo(
    () => searchItems.map((item) => buildResultView(item, selected?.id ?? -1)),
    [searchItems, selected],
  );

  const favoritesResults = useMemo(
    () => filteredFavoriteItems.map((item) => buildResultView(item, selected?.id ?? -1)),
    [filteredFavoriteItems, selected],
  );

  const detail = useMemo(
    () => (selected ? buildDetailView(selected, simpleLanguage, showForecast) : null),
    [selected, simpleLanguage, showForecast],
  );

  // Любое изменение поиска закрывает открытую деталь
  const onQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedId(null);
  }, []);
  const onChipClick = useCallback((value: string) => {
    setQuery(value);
    setSelectedId(null);
  }, []);
  const onSelect = useCallback((id: number) => setSelectedId(id), []);
  // Выбор из избранного очищает результаты поиска (сбрасываем запрос)
  const onSelectFavorite = useCallback((id: number) => {
    setSelectedId(id);
    setQuery('');
  }, []);

  const hasQuery = query.trim() !== '';

  return {
    query,
    onQueryChange,
    onChipClick,
    onSelect,
    onSelectFavorite,
    results,
    empty: hasQuery && !search.loading && searchItems.length === 0 && !search.error,
    idle: !hasQuery,
    loading: search.loading,
    error: search.error,
    detail,
    canFavorite: userId != null,
    isFavorite: favorites.isFavorite,
    onToggleFavorite: favorites.toggleFavorite,
    favoritesResults,
    favoritesLoading: favorites.loading,
    favoritesError: favorites.error,
    favoritesEmpty: !favorites.loading && !favorites.error && favoriteItems.length === 0,
    favoritesQuery,
    onFavoritesQueryChange: setFavoritesQuery,
  };
}
