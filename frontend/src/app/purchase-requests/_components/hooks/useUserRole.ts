import { useAuth } from '@/contexts/AuthContext';

/**
 * Хук для работы с ролью пользователя
 * Использует глобальный контекст аутентификации
 */
export function useUserRole() {
  const { userRole, loading } = useAuth();

  // Проверка, может ли пользователь изменять видимость заявки (только admin)
  const canEditExcludeFromInWork = userRole === 'admin';

  return {
    userRole,
    setUserRole: () => {}, // Заглушка для обратной совместимости, роль управляется через контекст
    loadingRole: loading,
    canEditExcludeFromInWork,
  };
}
