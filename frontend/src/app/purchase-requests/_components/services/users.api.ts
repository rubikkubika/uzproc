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
 * Ищет пользователя по точному совпадению имени инициатора
 * Используется для автоподстановки инициатора в модалке рейтинга
 */
export async function findInitiatorByName(initiatorName: string): Promise<User | null> {
  if (!initiatorName || initiatorName.trim() === '') {
    return null;
  }

  const encodedName = encodeURIComponent(initiatorName.trim());
  const size = 50;

  // Пробуем разные варианты поиска
  const [nameResponse, surnameResponse, usernameResponse, emailResponse] = await Promise.all([
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&name=${encodedName}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&surname=${encodedName}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&username=${encodedName}`),
    fetch(`${getBackendUrl()}/api/users?page=0&size=${size}&email=${encodedName}`)
  ]);

  const allUsers = new Map<number, User>();
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

  // Ищем точное совпадение по разным вариантам
  const initiator = Array.from(allUsers.values()).find((u: User) => {
    const fullName = u.surname && u.name ? `${u.surname} ${u.name}`.trim() : null;
    const reverseName = u.name && u.surname ? `${u.name} ${u.surname}`.trim() : null;

    return u.username === initiatorName ||
           u.email === initiatorName ||
           fullName === initiatorName ||
           reverseName === initiatorName ||
           (u.surname && u.surname.trim() === initiatorName) ||
           (u.name && u.name.trim() === initiatorName);
  });

  // Если точного совпадения нет, берем первое из найденных (если есть)
  if (!initiator && allUsers.size > 0) {
    return Array.from(allUsers.values())[0];
  }

  return initiator || null;
}
