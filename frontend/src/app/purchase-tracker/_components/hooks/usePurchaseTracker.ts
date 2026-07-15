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
  /** Инициатор текущего пользователя «Фамилия Имя» — для загрузки «моих» заявок в панель */
  mineInitiator?: string | null;
}

interface UsePurchaseTrackerResult {
  query: string;
  onQueryChange: (value: string) => void;
  onChipClick: (value: string) => void;
  /** Полностью сбросить основной поиск (запрос + открытую деталь) — например, при смене вкладки */
  clearSearch: () => void;
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
  /** Выбор карточки из «моих» (очищает результаты поиска) */
  onSelectMine: (id: number) => void;
  /** Карточки «моих» заявок (для левого блока), отфильтрованные локальным поиском */
  mineResults: ResultView[];
  mineLoading: boolean;
  mineError: string | null;
  /** У пользователя вообще нет «своих» заявок */
  mineEmpty: boolean;
  /** Строка отдельного поиска по «моим» заявкам */
  mineQuery: string;
  onMineQueryChange: (value: string) => void;
}

/**
 * Главный хук страницы «Трекер закупок».
 * Основная область — поиск среди всех закупок; избранное — независимый набор карточек
 * для левого блока. Деталь открывается по выбору карточки из любого набора.
 */
export function usePurchaseTracker(options: UsePurchaseTrackerOptions): UsePurchaseTrackerResult {
  const { simpleLanguage = true, showForecast = true, userId, mineInitiator = null } = options;

  const [query, setQuery] = useState('');
  const [favoritesQuery, setFavoritesQuery] = useState('');
  const [mineQuery, setMineQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const search = usePurchaseTrackerData(query);
  // «Мои» заявки — независимый набор карточек для левого блока (ищем по инициатору пользователя)
  const mine = usePurchaseTrackerData(mineInitiator ?? '');
  const favorites = useProcurementFavorites(userId);

  const searchItems = search.items;
  const favoriteItems = favorites.favorites;
  const mineItems = mine.items;

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

  // Отдельный локальный поиск по «моим» заявкам
  const filteredMineItems = useMemo(() => {
    const q = mineQuery.trim().toLowerCase();
    if (!q) return mineItems;
    return mineItems.filter(
      (p) =>
        String(p.id).includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.initiator.toLowerCase().includes(q),
    );
  }, [mineItems, mineQuery]);

  // Выбранная закупка ищется во всех наборах (поиск + избранное + мои)
  const selected = useMemo(() => {
    return (
      searchItems.find((item) => item.id === selectedId) ??
      favoriteItems.find((item) => item.id === selectedId) ??
      mineItems.find((item) => item.id === selectedId) ??
      null
    );
  }, [searchItems, favoriteItems, mineItems, selectedId]);

  const results = useMemo(
    () => searchItems.map((item) => buildResultView(item, selected?.id ?? -1)),
    [searchItems, selected],
  );

  const favoritesResults = useMemo(
    () => filteredFavoriteItems.map((item) => buildResultView(item, selected?.id ?? -1)),
    [filteredFavoriteItems, selected],
  );

  const mineResults = useMemo(
    () => filteredMineItems.map((item) => buildResultView(item, selected?.id ?? -1)),
    [filteredMineItems, selected],
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
  // Полный сброс основного поиска (запрос + деталь) — вызывается при переключении вкладок
  const clearSearch = useCallback(() => {
    setQuery('');
    setSelectedId(null);
  }, []);
  const onSelect = useCallback((id: number) => setSelectedId(id), []);
  // Выбор из избранного очищает результаты поиска (сбрасываем запрос)
  const onSelectFavorite = useCallback((id: number) => {
    setSelectedId(id);
    setQuery('');
  }, []);
  // Выбор из «моих» очищает результаты поиска (сбрасываем запрос)
  const onSelectMine = useCallback((id: number) => {
    setSelectedId(id);
    setQuery('');
  }, []);

  const hasQuery = query.trim() !== '';

  return {
    query,
    onQueryChange,
    onChipClick,
    clearSearch,
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
    onSelectMine,
    mineResults,
    mineLoading: mine.loading,
    mineError: mine.error,
    mineEmpty: !mine.loading && !mine.error && mineItems.length === 0,
    mineQuery,
    onMineQueryChange: setMineQuery,
  };
}
