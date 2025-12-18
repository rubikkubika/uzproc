'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
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
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

const menuItems = [
  { id: 'test', label: 'Тест', icon: Mail },
];

  const purchaserItems = [
    { id: 'overview', label: 'Обзор', icon: Home, disabled: false },
    { id: 'workload', label: 'Нагрузка', icon: BarChart3, disabled: false },
    { id: 'purchase-requests', label: 'Заявки на закупку', icon: Package },
    { id: 'purchases', label: 'Закупки', icon: Package },
    { id: 'purchase-plan', label: 'План закупок', icon: Calendar },
    { id: 'contracts', label: 'Договоры', icon: Package },
    { id: 'specifications', label: 'Спецификации', icon: Package },
    { id: 'presentation', label: 'Презентация', icon: FileText },
  ];

  const initiatorItems = [
    { id: 'create-purchase', label: 'Создать закупку', icon: Package, disabled: true },
  ];

  const backendItems: Array<{ id: string; label: string; icon: any }> = [];

const SIDEBAR_SECTIONS_KEY = 'sidebarSectionsCollapsed';

export default function Sidebar({ activeTab, onTabChange, isMobileMenuOpen, setIsMobileMenuOpen, isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const router = useRouter();

  // Состояние сворачивания разделов
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    purchaser: false,
    initiator: false,
  });

  // Загружаем состояние из localStorage при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSectionsCollapsed(parsed);
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

  const toggleSection = (section: keyof typeof sectionsCollapsed) => {
    setSectionsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
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
        transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-16' : 'w-fit lg:max-w-fit'}
        flex-shrink-0
      `}
      style={{
        // Явно задаем стили для Safari
        boxSizing: 'border-box',
        WebkitBoxSizing: 'border-box',
      }}
      data-sidebar-collapsed={isCollapsed ? 'true' : 'false'}
      >
        {/* Градиентная полоска */}
        <div className="absolute right-0 top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-purple-600/30 to-transparent"></div>
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-1.5 relative' : 'justify-between pl-2 pr-1.5 py-1.5'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
              <span className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? 'w-8 h-8' : 'w-8 h-8'}`}>
                <img 
                  src="/images/logo-small.svg" 
                  alt="Logo" 
                  className={isCollapsed ? 'w-8 h-8' : 'w-8 h-8'}
                />
              </span>
              {!isCollapsed && <h1 className="text-xl font-bold text-black ml-2.5">uzProc</h1>}
            </div>
            {/* Кнопка сворачивания/разворачивания (только для больших экранов) */}
            {setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex items-center justify-center w-6 h-6 transition-colors ${
                  isCollapsed 
                    ? 'absolute right-1' 
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
        <nav className="flex-1 pl-2 pr-1.5 py-2 overflow-y-auto">
          {/* Основное меню */}
          <div className="mb-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
                        isCollapsed ? 'justify-center px-2 py-1.5' : 'px-2 py-1.5'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center justify-center ${isCollapsed ? 'w-6' : 'w-6'} flex-shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </span>
                      {!isCollapsed && <span className="ml-2">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Для закупщика */}
          <div className="mb-4">
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
              <ul className="space-y-2">
              {purchaserItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDisabled = item.disabled || false;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => !isDisabled && handleTabChange(item.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
                        isCollapsed ? 'justify-center px-2 py-1.5' : 'px-2 py-1.5'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center justify-center ${isCollapsed ? 'w-6' : 'w-6'} flex-shrink-0`}>
                        <Icon className="w-6 h-6" />
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
          <div className="mb-4">
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
              <ul className="space-y-2">
              {initiatorItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDisabled = item.disabled;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => !isDisabled && handleTabChange(item.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
                        isCollapsed ? 'justify-center px-2 py-1.5' : 'px-2 py-1.5'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center justify-center ${isCollapsed ? 'w-6' : 'w-6'} flex-shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </span>
                      {!isCollapsed && <span className="ml-2">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
              </ul>
            ) : null}
          </div>
        </nav>

        {/* Кнопка загрузки и выхода */}
        <div className="pl-2 pr-1.5 py-2 border-t border-gray-200 space-y-2">
          <button
            onClick={() => handleTabChange('upload')}
            className={`w-full flex items-center rounded-lg transition-colors relative text-sm ${
              isCollapsed ? 'justify-center px-2 py-1.5' : 'px-2 py-1.5'
            } ${
              activeTab === 'upload'
                ? `text-purple-600 bg-purple-50 ${isCollapsed ? '' : 'border-l-4 border-purple-600'}`
                : 'text-purple-600 bg-purple-50/50 hover:bg-purple-100 hover:text-purple-700'
            }`}
            title={isCollapsed ? 'Загрузка' : undefined}
          >
            <span className={`flex items-center justify-center ${isCollapsed ? 'w-6' : 'w-6'} flex-shrink-0`}>
              <Upload className="w-6 h-6" />
            </span>
            {!isCollapsed && <span className="ml-2">Загрузка</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors text-sm ${
              isCollapsed ? 'justify-center px-2 py-1.5' : 'px-2 py-1.5'
            }`}
            title={isCollapsed ? 'Выйти' : undefined}
          >
            <span className={`flex items-center justify-center ${isCollapsed ? 'w-6' : 'w-6'} flex-shrink-0`}>
              <LogOut className="w-6 h-6" />
            </span>
            {!isCollapsed && <span className="ml-2">Выйти</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
