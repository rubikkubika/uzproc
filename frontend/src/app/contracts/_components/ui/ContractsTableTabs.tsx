'use client';

import React from 'react';
import { TabType } from '../types/contracts.types';

interface ContractsTableTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

/**
 * Компонент вкладок для таблицы договоров
 * Отображает вкладки: В работе, Подписаны, Все
 */
export default function ContractsTableTabs({
  activeTab,
  onTabChange,
}: ContractsTableTabsProps) {
  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'in-work', label: 'В работе' },
    { key: 'signed', label: 'Подписаны' },
    { key: 'all', label: 'Все' },
  ];

  return (
    <div className="sticky top-0 left-0 right-0 z-30 flex gap-1 pt-2 pb-2 bg-white shadow-sm" style={{ minHeight: '44px', width: '100%', backgroundColor: 'white' }}>
      {tabs.map((tab) => {
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
