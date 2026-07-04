import { getBackendUrl } from '@/utils/api';
import type { Procurement } from '../types/purchase-tracker.types';

/**
 * API избранных закупок трекера.
 * userId передаётся явно (fallback для локальной разработки, где auth отключена);
 * в production userId берётся из подписанного JWT в cookie, поэтому запросы идут с credentials.
 */

const base = () => `${getBackendUrl()}/api/procurement-favorites`;

/** Избранные закупки пользователя (полные модели трекера, свежие сверху). */
export async function fetchFavorites(userId: number): Promise<Procurement[]> {
  const res = await fetch(`${base()}?userId=${userId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Procurement[]>;
}

/** Номера заявок в избранном (для отметки «звёздочек»). */
export async function fetchFavoriteIds(userId: number): Promise<number[]> {
  const res = await fetch(`${base()}/ids?userId=${userId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<number[]>;
}

/** Добавить закупку в избранное. */
export async function addFavorite(userId: number, idPurchaseRequest: number): Promise<void> {
  const res = await fetch(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId, idPurchaseRequest }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Убрать закупку из избранного. */
export async function removeFavorite(userId: number, idPurchaseRequest: number): Promise<void> {
  const res = await fetch(`${base()}/${idPurchaseRequest}?userId=${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
