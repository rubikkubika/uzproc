'use client';

import { useState } from 'react';
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
  ChevronRight
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
  { id: 'overview', label: 'Обзор', icon: Home },
  { id: 'purchases', label: 'Закупки', icon: Package },
  { id: 'suppliers', label: 'Поставщики', icon: Users },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'trends', label: 'Тренды', icon: TrendingUp },
  { id: 'calendar', label: 'Календарь', icon: Calendar },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

  const purchaserItems = [
    { id: 'overview', label: 'Обзор', icon: Home, disabled: false },
    { id: 'purchases', label: 'Реестр закупок', icon: Package, disabled: false },
    { id: 'workload', label: 'Нагрузка', icon: BarChart3, disabled: false },
  ];

  const initiatorItems = [
    { id: 'create-purchase', label: 'Создать закупку', icon: Package, disabled: true },
    { id: 'initiator-status', label: 'Статус заявок', icon: TrendingUp },
  ];

export default function Sidebar({ activeTab, onTabChange, isMobileMenuOpen, setIsMobileMenuOpen, isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const router = useRouter();

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
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
      <aside className={`
        fixed lg:static top-0 left-0 z-40 h-screen bg-white border-r border-gray-200
        transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'w-64'}
      `}>
        {/* Градиентная полоска */}
        <div className="absolute right-0 top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-purple-600/30 to-transparent"></div>
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className={`flex items-center justify-between ${isCollapsed ? 'px-3 py-3' : 'px-4 py-3'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="flex items-center justify-center w-8 h-8">
                <img 
                  src="/images/logo-small.svg" 
                  alt="Logo" 
                  className="w-8 h-8"
                />
              </div>
              {!isCollapsed && <h1 className="text-xl font-bold text-black ml-3">uzProc</h1>}
            </div>
            {/* Кнопка сворачивания/разворачивания (только для больших экранов) */}
            {setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                title={isCollapsed ? 'Развернуть' : 'Свернуть'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Для закупщика */}
          <div className="mb-6">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Для закупщика</h3>
            )}
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
                      className={`w-full flex items-center rounded-lg transition-colors relative ${
                        isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={`w-8 h-8 ${isCollapsed ? '' : 'mr-3'}`} />
                      {!isCollapsed && item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Для инициатора */}
          <div className="mb-6">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Для инициатора</h3>
            )}
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
                      className={`w-full flex items-center rounded-lg transition-colors relative ${
                        isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'
                      } ${
                        isActive
                          ? `text-blue-600 bg-blue-50 ${isCollapsed ? '' : 'border-l-4 border-blue-600'}`
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={`w-8 h-8 ${isCollapsed ? '' : 'mr-3'}`} />
                      {!isCollapsed && item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Кнопка выхода */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors ${
              isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'
            }`}
            title={isCollapsed ? 'Выйти' : undefined}
          >
            <LogOut className={`w-8 h-8 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && 'Выйти'}
          </button>
        </div>
      </aside>
    </>
  );
}
