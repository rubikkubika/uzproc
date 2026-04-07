'use client';

import React from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { TabType } from '../types/contracts.types';

interface ContractsTableTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showRemarks: boolean;
  onRemarksToggle: () => void;
}

/**
 * Компонент вкладок для таблицы договоров
 * Отображает вкладки: В работе, Подписаны, Все + кнопку Замечания справа
 */
export default function ContractsTableTabs({
  activeTab,
  onTabChange,
  showRemarks,
  onRemarksToggle,
}: ContractsTableTabsProps) {
  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'in-work', label: 'В работе' },
    { key: 'signed', label: 'Подписаны' },
    { key: 'all', label: 'Все' },
  ];

  return (
    <div className="sticky top-0 left-0 right-0 z-30 flex items-center gap-1 pt-2 pb-2 bg-white shadow-sm px-1" style={{ minHeight: '44px', width: '100%', backgroundColor: 'white' }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
            !showRemarks && activeTab === tab.key
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={onRemarksToggle}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1 ${
          showRemarks
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
        }`}
      >
        <MessageSquareWarning className="w-3 h-3" />
        Замечания
      </button>
    </div>
  );
}
