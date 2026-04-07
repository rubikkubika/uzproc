'use client';

import React from 'react';
import { TabType } from '../types/purchase-request.types';

interface PurchaseRequestsTableTabsProps {
  activeTab: TabType;
  tabCounts: Record<TabType, number | null>;
  onTabChange: (tab: TabType) => void;
  onInWorkTabClick?: () => void; // Специальный обработчик для вкладки "В работе" с логированием
}

/**
 * Компонент вкладок для таблицы заявок на закупку
 * Отображает вкладки: В работе, Завершенные, Все, Проект/Отмена/Не Согласовано/Архив, Скрытые
 */
export default function PurchaseRequestsTableTabs({
  activeTab,
  tabCounts,
  onTabChange,
  onInWorkTabClick,
}: PurchaseRequestsTableTabsProps) {
  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'in-work', label: 'В работе' },
    { key: 'completed', label: 'Завершенные' },
    { key: 'all', label: 'Все' },
    { key: 'project-rejected', label: 'Проект/Отмена/Не Согласовано/Архив' },
    { key: 'hidden', label: 'Скрытые' },
  ];

  return (
    <div className="sticky top-[30px] left-0 right-0 z-30 flex gap-0.5 pt-0.5 pb-0.5 bg-white shadow-sm" style={{ minHeight: '30px', width: '100%', backgroundColor: 'white' }}>
      {tabs.map((tab) => {
        // Показываем вкладку только если есть записи или количество еще не загружено
        const count = tabCounts[tab.key];
        if (count !== null && count === 0) return null;

        const handleClick = () => {
          if (tab.key === 'in-work' && onInWorkTabClick) {
            onInWorkTabClick();
          } else {
            onTabChange(tab.key);
          }
        };

        return (
          <button
            key={tab.key}
            onClick={handleClick}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1 ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {count !== null ? count : '0'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
