'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  userRole: string | null;
  userEmail: string | null;
  userId: number | null;
  /** Полное имя пользователя «Имя Фамилия» (пусто, если не найдено) */
  userFullName: string | null;
  /** Инициатор в формате заявок «Фамилия Имя» — для поиска «моих» заявок в трекере */
  userInitiator: string | null;
  /** Пользователь — закупщик (флаг is_purchaser) */
  isPurchaser: boolean;
  /** Пользователь — договорник (флаг is_contractor) */
  isContractor: boolean;
  loading: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Провайдер контекста аутентификации
 * Загружает данные аутентификации один раз и предоставляет их всем дочерним компонентам
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [userInitiator, setUserInitiator] = useState<string | null>(null);
  const [isPurchaser, setIsPurchaser] = useState(false);
  const [isContractor, setIsContractor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.authenticated) {
          if (data.role) {
            setUserRole(data.role);
          }
          if (data.email) {
            setUserEmail(data.email);
          }
          // ID/ФИО/роли-флаги берём из подписанного JWT (через /api/auth/check),
          // а не из admin-эндпоинта /users — он закрыт для не-админов (403).
          if (typeof data.userId === 'number') {
            setUserId(data.userId);
          }
          const fullName = [data.name, data.surname].filter(Boolean).join(' ').trim();
          setUserFullName(fullName || null);
          // В заявках инициатор хранится как «Фамилия Имя [Отчество]» — этим и ищем «мои» заявки
          const initiator = [data.surname, data.name].filter(Boolean).join(' ').trim();
          setUserInitiator(initiator || null);
          setIsPurchaser(data.isPurchaser === true);
          setIsContractor(data.isContractor === true);
        }
      } catch (error) {
        // Ошибка проверки аутентификации игнорируется
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const canEdit = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ userRole, userEmail, userId, userFullName, userInitiator, isPurchaser, isContractor, loading, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Хук для использования контекста аутентификации
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
