'use client';

import { useState, useLayoutEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

interface AppShellProps {
  /** Идентификатор активного пункта сайдбара (для подсветки), напр. 'purchase-tracker' | 'public-plan' */
  activeTab: string;
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

/**
 * Синхронизирует глобальную CSS-переменную --sidebar-width и класс sidebar-collapsed
 * на <html> с состоянием сворачивания. Это ОБЯЗАТЕЛЬНО, потому что глобальное правило
 * `aside[data-sidebar-collapsed] { width: var(--sidebar-width) !important }` форсит
 * ширину сайдбара по этой переменной. Если её не обновлять, при переходе с главной
 * (где сайдбар был свёрнут) сайдбар на публичных страницах остаётся шириной 5rem,
 * но с развёрнутым содержимым — подписи налезают на контент.
 */
function applySidebarWidthVar(collapsed: boolean) {
  if (collapsed) {
    document.documentElement.classList.add('sidebar-collapsed');
    document.documentElement.style.setProperty('--sidebar-width', '5rem');
  } else {
    document.documentElement.classList.remove('sidebar-collapsed');
    document.documentElement.style.setProperty('--sidebar-width', '16rem');
  }
}

/**
 * Обёртка страницы с основным сайдбаром приложения — для публичных страниц
 * (трекер, публичный план), чтобы у ЗАЛОГИНЕННЫХ пользователей была та же
 * навигация, что и в остальном приложении. Гостям (без логина) сайдбар не
 * показывается — страница рендерится как раньше.
 */
export default function AppShell({ activeTab, children }: AppShellProps) {
  const { userRole, userEmail, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Начальное состояние всегда false для совместимости с SSR; реальное значение
  // восстанавливаем из localStorage после монтирования (см. useLayoutEffect ниже).
  const [isCollapsed, setIsCollapsed] = useState(false);

  const authenticated = !!(userRole || userEmail);

  // Восстанавливаем сохранённое состояние сайдбара из localStorage и синхронизируем
  // CSS-переменную --sidebar-width, чтобы ширина совпадала с содержимым.
  useLayoutEffect(() => {
    try {
      const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
      setIsCollapsed(collapsed);
      applySidebarWidthVar(collapsed);
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }
  }, []);

  // Сохраняем состояние и обновляем CSS-переменную при переключении.
  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }
    applySidebarWidthVar(collapsed);
  };

  // Пока идёт проверка авторизации или пользователь не залогинен — без сайдбара,
  // но в полноэкранном контейнере, чтобы h-full/min-h-full внутри страниц раскрывались
  // на всю высоту (иначе снизу виден фон body).
  if (loading || !authenticated) {
    return <div className="h-screen overflow-y-auto">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <div className="w-full max-w-[1920px] mx-auto flex flex-1 min-h-0 full-width-on-large-screens" style={{ gap: 0 }}>
        <div suppressHydrationWarning style={{ flexShrink: 0, margin: 0, padding: 0 }}>
          <Sidebar
            activeTab={activeTab}
            // На публичных страницах Sidebar сам навигирует через router.push('/?tab=...'),
            // поэтому onTabChange здесь не требуется
            onTabChange={() => {}}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isCollapsed={isCollapsed}
            setIsCollapsed={handleSidebarCollapse}
          />
        </div>

        {/* Верхняя панель для мобильных: кнопка меню + логотип */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Меню"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center">
            <img src="/images/logo-small.svg" alt="Logo" className="w-8 h-8 mr-2" />
            <span className="text-lg font-bold text-black">uzProc</span>
          </div>
          <span className="w-9" />
        </div>

        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pt-16 lg:pt-0" style={{ flexShrink: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
