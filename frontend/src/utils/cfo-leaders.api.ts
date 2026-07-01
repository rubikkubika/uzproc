import { getBackendUrl, fetchDeduped } from '@/utils/api';

export interface CfoLeaderDto {
  cfoName: string;
  userId: number | null;
  leaderFullName: string | null;
  leaderEmail: string | null;
}

export interface UserSuggestion {
  id: number;
  username: string;
  email: string | null;
  surname: string | null;
  name: string | null;
  displayName: string;
}

/**
 * Загружает справочник руководителей ЦФО: все ЦФО из заявок/закупок/договоров
 * с проставленными руководителями (пользователями).
 */
export async function fetchCfoLeaders(signal?: AbortSignal): Promise<CfoLeaderDto[]> {
  const url = `${getBackendUrl()}/api/cfo-leaders`;
  const response = await (signal ? fetch(url, { signal }) : fetchDeduped(url));
  if (!response.ok) {
    throw new Error('Не удалось загрузить справочник руководителей ЦФО');
  }
  return response.json();
}

/**
 * Назначает пользователя руководителем ЦФО.
 */
export async function saveCfoLeader(cfoName: string, userId: number): Promise<CfoLeaderDto> {
  const url = `${getBackendUrl()}/api/cfo-leaders`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cfoName, userId }),
  });
  if (!response.ok) {
    throw new Error('Не удалось сохранить руководителя ЦФО');
  }
  return response.json();
}

/**
 * Убирает руководителя у ЦФО (сам ЦФО остаётся в списке).
 */
export async function deleteCfoLeader(cfoName: string): Promise<void> {
  const url = `${getBackendUrl()}/api/cfo-leaders?cfoName=${encodeURIComponent(cfoName)}`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Не удалось удалить руководителя ЦФО');
  }
}

interface RawUser {
  id: number;
  username: string;
  email: string | null;
  surname: string | null;
  name: string | null;
}

function toDisplayName(u: RawUser): string {
  const full = `${u.surname ?? ''} ${u.name ?? ''}`.trim();
  if (full) return u.email ? `${full} (${u.email})` : full;
  if (u.email) return `${u.email} (${u.username})`;
  return u.username;
}

/**
 * Поиск пользователей по ФИО / username / email.
 * Выполняет параллельные запросы по разным полям и объединяет результаты.
 */
export async function searchUsers(query: string, size = 20): Promise<UserSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  const base = `${getBackendUrl()}/api/users?page=0&size=${size}`;
  const fields = ['surname', 'name', 'username', 'email'];

  const responses = await Promise.all(
    fields.map((field) =>
      fetch(`${base}&${field}=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : { content: [] }))
        .catch(() => ({ content: [] }))
    )
  );

  const byId = new Map<number, UserSuggestion>();
  for (const page of responses) {
    const content: RawUser[] = Array.isArray(page?.content) ? page.content : [];
    for (const u of content) {
      if (!byId.has(u.id)) {
        byId.set(u.id, {
          id: u.id,
          username: u.username,
          email: u.email,
          surname: u.surname,
          name: u.name,
          displayName: toDisplayName(u),
        });
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'ru')
  );
}
