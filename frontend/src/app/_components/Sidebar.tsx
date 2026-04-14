'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Users,
  Calendar,
  Settings,
  Home,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Upload,
  Mail,
  FileText,
  Banknote,
  Building2,
  ScanText,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Star,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

const menuItems: Array<{ id: string; label: string; icon: any }> = [];

  const purchaserItems = [
    { id: 'overview', label: 'Обзор', icon: Home, disabled: false },
    { id: 'purchase-plan', label: 'План закупок', icon: Calendar },
    { id: 'purchase-requests', label: 'Заявки на закупку', icon: Package },
    { id: 'contracts', label: 'Договоры', icon: FileText },
    { id: 'payments', label: 'Оплаты', icon: Banknote },
    { id: 'arrivals', label: 'Поступления', icon: Package },
    { id: 'delivery-plan', label: 'План поставок', icon: Calendar },
    { id: 'suppliers', label: 'Поставщики', icon: Building2 },
  ];

  const initiatorItems = [
    { id: 'create-purchase', label: 'Создать закупку', icon: Package, disabled: true },
    { id: 'public-plan', label: 'План закупок(п)', icon: FileText, isExternal: true },
  ];

  const initiatorDevelopmentItems = [
    { id: 'test', label: 'Тест', icon: Mail },
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'invoice-recognition', label: 'Распознавание', icon: ScanText },
    { id: 'training', label: 'Обучение', icon: GraduationCap },
    { id: 'csi', label: 'Форма оценки (CSI)', icon: Star, isExternal: true },
  ];

  const backendItems: Array<{ id: string; label: string; icon: any }> = [];

const SIDEBAR_SECTIONS_KEY = 'sidebarSectionsCollapsed';

const DEFAULT_SECTIONS_COLLAPSED = {
  purchaser: false,
  initiator: false,
  development: false,
  /** Подгруппа «Справочники» внутри «В разработке» */
  directories: true,
};

export default function Sidebar({ activeTab, onTabChange, isMobileMenuOpen, setIsMobileMenuOpen, isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const router = useRouter();
  
  const { userEmail, userRole } = useAuth();

  const [sectionsCollapsed, setSectionsCollapsed] = useState(DEFAULT_SECTIONS_COLLAPSED);

  // Загружаем состояние из localStorage при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSectionsCollapsed({ ...DEFAULT_SECTIONS_COLLAPSED, ...parsed });
        } catch (e) {
          console.error('Ошибка загрузки состояния разделов:', e);
        }
      }
    }
  }, []);

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(sectionsCollapsed));
    }
  }, [sectionsCollapsed]);

  const toggleSection = (section: keyof typeof DEFAULT_SECTIONS_COLLAPSED) => {
    setSectionsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleTabChange = (tab: string) => {
    // Проверяем, находимся ли мы на главной странице
    const isOnHomePage = typeof window !== 'undefined' && window.location.pathname === '/';
    
    if (isOnHomePage) {
      // Если на главной странице, просто меняем вкладку
      onTabChange(tab);
    } else {
      // Если не на главной странице, перенаправляем на главную с нужной вкладкой
      router.push(`/?tab=${tab}`);
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  return (
    <>
      {/* Мобильный оверлей */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Сайдбар */}
      <aside
        suppressHydrationWarning
        className={`
        fixed lg:static top-0 left-0 z-40 h-screen bg-white border-r border-gray-200
        flex flex-col
        transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? '' : 'w-fit lg:max-w-fit'}
        flex-shrink-0
      `}
      style={{
        boxSizing: 'border-box',
        WebkitBoxSizing: 'border-box',
        ...(isCollapsed ? { width: '56px', minWidth: '56px', maxWidth: '56px', overflow: 'hidden' } : {}),
      }}
      data-sidebar-collapsed={isCollapsed ? 'true' : 'false'}
      >
        {/* Градиентная полоска */}
        <div className="absolute right-0 top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-purple-600/30 to-transparent"></div>
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className={`flex items-center relative ${isCollapsed ? 'justify-center px-0 py-1' : 'justify-between pl-2 pr-1.5 py-1.5'}`}>
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center cursor-pointer hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center' : ''}`}
            >
              <span className={`flex items-center justify-center flex-shrink-0 w-8 h-8`}>
                <img
                  src="/images/logo-small.svg"
                  alt="Logo"
                  className="w-8 h-8"
                />
              </span>
              {!isCollapsed && <h1 className="text-xl font-bold text-black ml-2.5">uzProc</h1>}
            </button>
            {/* Кнопка сворачивания/разворачивания (только для больших экранов) */}
            {setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex items-center justify-center w-6 h-6 transition-colors ${
                  isCollapsed
                    ? 'absolute left-[38px] top-1/2 -translate-y-1/2'
                    : 'rounded-lg hover:bg-gray-100'
                }`}
                title={isCollapsed ? 'Развернуть' : 'Свернуть'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? 'px-0 py-1' : 'pl-2 pr-1.5 py-1'} overflow-y-auto min-h-0`}>
          {/* Информация о пользователе и роли — перед разделом для закупщика */}
          {userRole != null && (
            <div className={`mb-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
              {isCollapsed ? (
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-sm" title={userEmail ?? undefined}>
                  {userRole === 'admin' ? 'A' : userRole === 'user' ? 'U' : userRole.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  {userEmail && (
                    <div className="text-xs font-medium text-gray-900 truncate" title={userEmail}>{userEmail}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    {userRole === 'admin' ? 'Администратор' : userRole === 'user' ? 'Пользователь' : userRole}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Основное меню */}
          <div className="mb-2">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
                        isCollapsed ? 'justify-center py-0.5 px-0' : 'px-2 py-1'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center justify-center ${isCollapsed ? 'w-5' : 'w-5'} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      {!isCollapsed && <span className="ml-2">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Для закупщика */}
          <div className="mb-2">
            {!isCollapsed && (
              <button
                onClick={() => toggleSection('purchaser')}
                className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 transition-colors"
              >
                <span>Для закупщика</span>
                {sectionsCollapsed.purchaser ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            )}
            {(!isCollapsed && !sectionsCollapsed.purchaser) || isCollapsed ? (
              <ul className="space-y-1">
              {purchaserItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDisabled = item.disabled || false;
                const isExternal = (item as any).isExternal || false;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (isDisabled) return;
                        if (isExternal) {
                          router.push('/public-plan');
                          setIsMobileMenuOpen(false);
                        } else {
                          handleTabChange(item.id);
                        }
                      }}
                      disabled={isDisabled}
                      className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
                        isCollapsed ? 'justify-center py-0.5 px-0' : 'px-2 py-1'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center justify-center ${isCollapsed ? 'w-5' : 'w-5'} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      {!isCollapsed && <span className="ml-2">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
              </ul>
            ) : null}
          </div>

          {/* Для инициатора */}
          <div className="mb-2">
            {!isCollapsed && (
              <button
                onClick={() => toggleSection('initiator')}
                className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 transition-colors"
              >
                <span>Для инициатора</span>
                {sectionsCollapsed.initiator ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            )}
            {(!isCollapsed && !sectionsCollapsed.initiator) || isCollapsed ? (
              <ul className="space-y-1">
              {initiatorItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDisabled = item.disabled || false;
                const isExternal = (item as any).isExternal || false;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (isDisabled) return;
                        if (isExternal) {
                          router.push('/public-plan');
                          setIsMobileMenuOpen(false);
                        } else {
                          handleTabChange(item.id);
                        }
                      }}
                      disabled={isDisabled}
                      className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
                        isCollapsed ? 'justify-center py-0.5 px-0' : 'px-2 py-1'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center justify-center ${isCollapsed ? 'w-5' : 'w-5'} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      {!isCollapsed && <span className="ml-2">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
              </ul>
            ) : null}
          </div>

          {/* В разработке - только для админов */}
          {userRole === 'admin' && (
            <div className="mb-2">
              {!isCollapsed && (
                <button
                  onClick={() => toggleSection('development')}
                  className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 transition-colors"
                >
                  <span>В разработке</span>
                  {sectionsCollapsed.development ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  )}
                </button>
              )}
              {(!isCollapsed && !sectionsCollapsed.development) || isCollapsed ? (
                <ul className="space-y-1">
                  {!isCollapsed && (
                    <li>
                      <button
                        type="button"
                        onClick={() => toggleSection('directories')}
                        className="w-full flex items-center justify-between rounded-lg transition-colors text-sm px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span className="flex items-center min-w-0">
                          <span className="flex items-center justify-center w-5 flex-shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </span>
                          <span className="ml-2 text-left truncate">Справочники</span>
                        </span>
                        {sectionsCollapsed.directories ? (
                          <ChevronDown className="w-3 h-3 flex-shrink-0 text-gray-500" />
                        ) : (
                          <ChevronUp className="w-3 h-3 flex-shrink-0 text-gray-500" />
                        )}
                      </button>
                      {!sectionsCollapsed.directories && (
                        <ul className="mt-1 ml-2 pl-2 border-l border-gray-200 space-y-1">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                handleTabChange('reference-holidays');
                              }}
                              className={`w-full flex items-center rounded-lg transition-colors relative text-sm px-2 py-1 ${
                                activeTab === 'reference-holidays'
                                  ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              <span className="flex items-center justify-center w-5 flex-shrink-0">
                                <CalendarDays className="w-5 h-5" />
                              </span>
                              <span className="ml-2 text-left">Справочник праздников</span>
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  )}
                  {isCollapsed && (
                    <li>
                      <button
                        type="button"
                        onClick={() => handleTabChange('reference-holidays')}
                        className={`w-full flex items-center rounded-lg transition-colors relative text-sm justify-center py-0.5 px-0 ${
                          activeTab === 'reference-holidays'
                            ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        title="Справочник праздников"
                      >
                        <span className="flex items-center justify-center w-5 flex-shrink-0">
                          <CalendarDays className="w-5 h-5" />
                        </span>
                      </button>
                    </li>
                  )}
                {initiatorDevelopmentItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isExternal = (item as any).isExternal || false;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (isExternal) {
                          router.push(`/${item.id}`);
                          setIsMobileMenuOpen(false);
                        } else {
                          handleTabChange(item.id);
                        }
                      }}
                      className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
                        isCollapsed ? 'justify-center py-0.5 px-0' : 'px-2 py-1'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center justify-center ${isCollapsed ? 'w-5' : 'w-5'} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      {!isCollapsed && <span className="ml-2">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
              </ul>
            ) : null}
            </div>
          )}
        </nav>

        {/* Кнопка загрузки и выхода */}
        <div className={`${isCollapsed ? 'px-0 py-1' : 'pl-2 pr-1.5 py-2'} border-t border-gray-200 space-y-1`}>
          <button
            onClick={() => handleTabChange('upload')}
            className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
              isCollapsed ? 'justify-center py-0.5 px-0' : 'px-2 py-1'
            } ${
              activeTab === 'upload'
                ? `text-purple-600 bg-purple-50 ${isCollapsed ? '' : 'border-l-4 border-purple-600'}`
                : 'text-purple-600 bg-purple-50/50 hover:bg-purple-100 hover:text-purple-700'
            }`}
            title={isCollapsed ? 'Загрузка' : undefined}
          >
            <span className={`flex items-center justify-center ${isCollapsed ? 'w-5' : 'w-5'} flex-shrink-0`}>
              <Upload className="w-5 h-5" />
            </span>
            {!isCollapsed && <span className="ml-2">Загрузка</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors text-sm ${
              isCollapsed ? 'justify-center py-0.5 px-0' : 'px-2 py-1'
            }`}
            title={isCollapsed ? 'Выйти' : undefined}
          >
            <span className={`flex items-center justify-center ${isCollapsed ? 'w-5' : 'w-5'} flex-shrink-0`}>
              <LogOut className="w-5 h-5" />
            </span>
            {!isCollapsed && <span className="ml-2">Выйти</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
