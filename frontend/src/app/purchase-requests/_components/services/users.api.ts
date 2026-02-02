import { getBackendUrl } from '@/utils/api';

/**
 * API сервис для работы с пользователями
 */

export interface User {
  id: number;
  username: string;
  email: string | null;
  surname: string | null;
  name: string | null;
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
 * Ищет пользователей по имени, фамилии, username или email
 * Выполняет 4 параллельных запроса и объединяет результаты
 */
export async function searchUsersByNameLike(query: string, size: number = 20): Promise<UserSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const searchQuery = query.trim().toLowerCase();
  const encodedQuery = encodeURIComponent(searchQuery);

  // Делаем несколько запросов параллельно для поиска по разным полям
  const [nameResponse, surnameResponse, usernameResponse, emailResponse] = await Promise.all([
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&name=${encodedQuery}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&surname=${encodedQuery}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&username=${encodedQuery}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&email=${encodedQuery}`)
  ]);

  const allUsers = new Map<number, User>();

  // Собираем всех пользователей из всех запросов
  const responses = [nameResponse, surnameResponse, usernameResponse, emailResponse];
  for (const response of responses) {
    if (response.ok) {
      const data = await response.json();
      const users = data.content || [];
      users.forEach((user: User) => {
        if (!allUsers.has(user.id)) {
          allUsers.set(user.id, user);
        }
      });
    }
  }

  // Формируем список предложений: "Фамилия Имя" или "username" или "email"
  const suggestions: UserSuggestion[] = Array.from(allUsers.values()).map((user: User) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    surname: user.surname,
    name: user.name,
    displayName: user.surname && user.name
      ? `${user.surname} ${user.name}${user.email ? ` (${user.email})` : ''}`
      : user.email
      ? `${user.email}${user.username ? ` (${user.username})` : ''}`
      : user.username
  }));

  return suggestions;
}

/**
 * Ищет пользователя по имени/фамилии (инициатор или закупщик из заявки).
 * В заявке часто формат "Фамилия И.О." или "Фамилия Имя" — ищем по первому слову как фамилия и по полной строке.
 */
export async function findInitiatorByName(displayName: string): Promise<User | null> {
  const raw = displayName?.trim();
  if (!raw) {
    return null;
  }

  const size = 50;
  const encodedFull = encodeURIComponent(raw);
  const firstWord = raw.split(/\s+/)[0] || raw;
  const encodedFirst = encodeURIComponent(firstWord);

  // Поиск: полная строка по name/surname/username/email + первое слово по surname (для "Фамилия И.О.")
  const [nameResponse, surnameResponse, surnameFirstResponse, usernameResponse, emailResponse] = await Promise.all([
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&name=${encodedFull}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&surname=${encodedFull}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&surname=${encodedFirst}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&username=${encodedFull}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&email=${encodedFull}`)
  ]);

  const allUsers = new Map<number, User>();
  const responses = [nameResponse, surnameResponse, surnameFirstResponse, usernameResponse, emailResponse];

  for (const response of responses) {
    if (response.ok) {
      const data = await response.json();
      const users = data.content || [];
      users.forEach((user: User) => {
        if (!allUsers.has(user.id)) {
          allUsers.set(user.id, user);
        }
      });
    }
  }

  const norm = (s: string) => (s || '').trim().toLowerCase();

  // Точное совпадение
  const exact = Array.from(allUsers.values()).find((u: User) => {
    const fullName = u.surname && u.name ? `${u.surname} ${u.name}`.trim() : null;
    const reverseName = u.name && u.surname ? `${u.name} ${u.surname}`.trim() : null;
    return (
      norm(u.username) === norm(raw) ||
      norm(u.email || '') === norm(raw) ||
      fullName !== null && norm(fullName) === norm(raw) ||
      reverseName !== null && norm(reverseName) === norm(raw) ||
      u.surname && norm(u.surname) === norm(raw) ||
      u.name && norm(u.name) === norm(raw)
    );
  });
  if (exact) return exact;

  // Совпадение по фамилии (первое слово из заявки = surname в БД)
  if (firstWord !== raw) {
    const bySurname = Array.from(allUsers.values()).find(
      (u) => u.surname && norm(u.surname) === norm(firstWord)
    );
    if (bySurname) return bySurname;
  }

  // Иначе первое из найденных (например, по совпадению начала фамилии)
  if (allUsers.size > 0) {
    return Array.from(allUsers.values())[0];
  }

  return null;
}
