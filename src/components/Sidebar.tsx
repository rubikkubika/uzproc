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
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
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

export default function Sidebar({ activeTab, onTabChange, isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
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
        fixed lg:static top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Градиентная полоска */}
        <div className="absolute right-0 top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-purple-600/30 to-transparent"></div>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <img 
              src="/images/logo-small.svg" 
              alt="Logo" 
              className="w-8 h-8 mr-3"
            />
            <h1 className="text-xl font-bold text-black">uzProc</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Для закупщика */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Для закупщика</h3>
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
                      className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors relative ${
                        isActive
                          ? 'text-blue-600 border-l-4 border-blue-600 bg-blue-50'
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Для инициатора */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Для инициатора</h3>
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
                      className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors relative ${
                        isActive
                          ? 'text-blue-600 border-l-4 border-blue-600 bg-blue-50'
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>
    </>
  );
}
