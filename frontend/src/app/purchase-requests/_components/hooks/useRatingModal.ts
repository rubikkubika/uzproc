import { useEffect, useRef, useCallback } from 'react';
import type { PurchaseRequest } from '../types/purchase-request.types';
import { searchUsersByNameLike, findInitiatorByName, type UserSuggestion } from '../services/users.api';

/** Ref: для какого id заявки уже подставлен инициатор (чтобы не перезаписывать получателя при сбросе выбора) */
const initiatorLoadedForRequestIdRef = { current: null as number | null };

/**
 * Хук для работы с модальным окном рейтинга
 * Управляет поиском пользователей, автоподстановкой инициатора и генерацией текста письма
 */
export function useRatingModal(
  isRatingModalOpen: boolean,
  selectedRequestForRating: PurchaseRequest | null,
  selectedUser: {
    id: number;
    username: string;
    email: string | null;
    surname: string | null;
    name: string | null;
  } | null,
  selectedUserEmail: string,
  userSearchQuery: string,
  userSuggestions: UserSuggestion[],
  showUserSuggestions: boolean,
  setUserSuggestions: (suggestions: UserSuggestion[]) => void,
  setShowUserSuggestions: (show: boolean) => void,
  setSelectedUser: (user: {
    id: number;
    username: string;
    email: string | null;
    surname: string | null;
    name: string | null;
  } | null) => void,
  setUserSearchQuery: (query: string) => void,
  setSelectedUserEmail: (email: string) => void,
  setEmailText: (text: string) => void,
  userSearchRef: React.RefObject<HTMLDivElement | null>,
  /** При true не подставлять инициатора (например, при открытии из «Редактировать отправку») */
  skipInitiatorLoadRef?: React.MutableRefObject<boolean>
) {
  // Загрузка предложений пользователей для поиска с debounce
  useEffect(() => {
    if (!isRatingModalOpen) return;

    const loadUserSuggestions = async () => {
      if (!userSearchQuery || userSearchQuery.trim().length < 1) {
        setUserSuggestions([]);
        setShowUserSuggestions(false);
        return;
      }

      try {
        const suggestions = await searchUsersByNameLike(userSearchQuery, 20);
        setUserSuggestions(suggestions);
        setShowUserSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error('Error loading user suggestions:', error);
        setUserSuggestions([]);
        setShowUserSuggestions(false);
      }
    };

    const timer = setTimeout(() => {
      loadUserSuggestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery, isRatingModalOpen]);

  // Генерация текста письма
  const generateEmailText = async (userEmail: string, request: PurchaseRequest | null, selectedUser: {
    id: number;
    username: string;
    email: string | null;
    surname: string | null;
    name: string | null;
  } | null) => {
    if (!request || !request.csiLink) {
      setEmailText('');
      return;
    }

    // Используем полный URL, который приходит с бэкенда (уже учитывает окружение)
    const fullUrl = request.csiLink;

    // Получаем имя получателя из selectedUser
    const recipientName = selectedUser && selectedUser.name ? selectedUser.name : '';

    const text = `Здравствуйте!

Недавно мы завершили работу по вашей заявке № ${request.idPurchaseRequest || ''} на ${request.name || ''}.

Чтобы отдел закупок работал быстрее и удобнее для вас, нам очень важно узнать ваше мнение.

Пожалуйста, уделите минутку и оцените качество нашего сервиса по ссылке:
${fullUrl}

Ссылка персональная и доступна для заполнения один раз.

Спасибо, что помогаете нам становиться лучше.

С уважением,
Ваша команда закупок`;

    setEmailText(text);
  };

  // Генерируем текст письма при изменении выбранного получателя или открытии модального окна
  useEffect(() => {
    if (isRatingModalOpen && selectedRequestForRating) {
      generateEmailText(selectedUserEmail, selectedRequestForRating, selectedUser).catch(err => {
        console.error('Error generating email text:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRatingModalOpen, selectedRequestForRating, selectedUserEmail, selectedUser]);

  // Устанавливаем инициатора заявки по умолчанию только при первом открытии модалки для этой заявки (не перезаписываем при сбросе получателя)
  useEffect(() => {
    if (!isRatingModalOpen) {
      initiatorLoadedForRequestIdRef.current = null;
      return;
    }
    if (skipInitiatorLoadRef?.current) return;
    if (!selectedRequestForRating?.purchaseRequestInitiator || selectedUser) return;
    const requestId = selectedRequestForRating.id;
    if (requestId != null && initiatorLoadedForRequestIdRef.current === requestId) return;

    initiatorLoadedForRequestIdRef.current = requestId ?? null;
    const loadInitiator = async () => {
      try {
        const initiatorName = selectedRequestForRating?.purchaseRequestInitiator?.trim();
        if (!initiatorName) return;

        const initiator = await findInitiatorByName(initiatorName);

        if (initiator) {
          const user = {
            id: initiator.id,
            username: initiator.username,
            email: initiator.email,
            surname: initiator.surname,
            name: initiator.name
          };
          setSelectedUser(user);
          const displayName = user.surname && user.name
            ? `${user.surname} ${user.name}${user.email ? ` (${user.email})` : ''}`
            : user.email || user.username;
          setUserSearchQuery(displayName);
          setSelectedUserEmail(initiator.email || initiator.username);
          // Генерируем текст письма (приглашение создастся автоматически)
          generateEmailText(initiator.email || initiator.username, selectedRequestForRating, user).catch(err => {
            console.error('Error generating email text:', err);
          });
        } else {
          // Если инициатор не найден, все равно устанавливаем его имя в поле поиска
          setUserSearchQuery(initiatorName);
        }
      } catch (error) {
        console.error('Error loading initiator:', error);
        // В случае ошибки все равно устанавливаем имя инициатора в поле поиска
        if (selectedRequestForRating?.purchaseRequestInitiator) {
          setUserSearchQuery(selectedRequestForRating.purchaseRequestInitiator);
        }
      }
    };
    loadInitiator();
  }, [isRatingModalOpen, selectedRequestForRating, selectedUser]);

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setShowUserSuggestions(false);
      }
    };

    if (showUserSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserSuggestions]);

  return {
    generateEmailText: useCallback(async (userEmail: string, request: PurchaseRequest | null) => {
      await generateEmailText(userEmail, request, selectedUser);
    }, [selectedUser]),
  };
}
