import { useCallback, useEffect, useState } from 'react';
import type { Procurement } from '../types/purchase-tracker.types';
import { addFavorite, fetchFavoriteIds, fetchFavorites, removeFavorite } from '../services/favorites.api';

interface UseProcurementFavoritesResult {
  /** Полные модели избранных закупок (для вкладки «Избранное») */
  favorites: Procurement[];
  /** Номера заявок в избранном (для отметки «звёздочек» в поиске) */
  favoriteIds: Set<number>;
  loading: boolean;
  error: string | null;
  /** Есть ли закупка в избранном */
  isFavorite: (id: number) => boolean;
  /** Переключить избранное (add/remove) с оптимистичным обновлением */
  toggleFavorite: (id: number) => void;
}

/**
 * Управление избранными закупками пользователя.
 * Если userId нет (не залогинен) — избранное пустое и действия недоступны.
 */
export function useProcurementFavorites(userId: number | null): UseProcurementFavoritesResult {
  const [favorites, setFavorites] = useState<Procurement[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка избранного при появлении/смене пользователя
  useEffect(() => {
    if (userId == null) {
      setFavorites([]);
      setFavoriteIds(new Set());
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchFavorites(userId), fetchFavoriteIds(userId)])
      .then(([items, ids]) => {
        if (cancelled) return;
        setFavorites(items);
        setFavoriteIds(new Set(ids));
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setFavorites([]);
        setFavoriteIds(new Set());
        setError('Не удалось загрузить избранное.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isFavorite = useCallback((id: number) => favoriteIds.has(id), [favoriteIds]);

  const toggleFavorite = useCallback(
    (id: number) => {
      if (userId == null) return;
      const wasFavorite = favoriteIds.has(id);

      // Оптимистичное обновление: сразу меняем звёздочку и список избранного
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(id);
        else next.add(id);
        return next;
      });
      if (wasFavorite) {
        setFavorites((prev) => prev.filter((p) => p.id !== id));
      }

      const request = wasFavorite ? removeFavorite(userId, id) : addFavorite(userId, id);
      request
        .then(() => {
          // После добавления перезагружаем список, чтобы получить полную модель закупки
          if (!wasFavorite) return fetchFavorites(userId).then(setFavorites);
        })
        .catch(() => {
          // Откат оптимистичного изменения при ошибке
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (wasFavorite) next.add(id);
            else next.delete(id);
            return next;
          });
          setError('Не удалось обновить избранное.');
        });
    },
    [userId, favoriteIds],
  );

  return { favorites, favoriteIds, loading, error, isFavorite, toggleFavorite };
}
