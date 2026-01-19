import { useState, useEffect } from 'react';

/**
 * Хук для работы с ролью пользователя
 */
export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Загружаем роль пользователя при монтировании
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.authenticated && data.role) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setLoadingRole(false);
      }
    };
    checkUserRole();
  }, []);

  // Проверка, может ли пользователь изменять видимость заявки (только admin)
  const canEditExcludeFromInWork = userRole === 'admin';

  return {
    userRole,
    setUserRole,
    loadingRole,
    canEditExcludeFromInWork,
  };
}
