'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  userRole: string | null;
  userEmail: string | null;
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
    <AuthContext.Provider value={{ userRole, userEmail, loading, canEdit }}>
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
