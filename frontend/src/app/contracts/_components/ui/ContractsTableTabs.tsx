'use client';

import React from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { TabType } from '../types/contracts.types';

interface ContractsTableTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showRemarks: boolean;
  onRemarksToggle: () => void;
  tabCounts?: Record<TabType, number | null>;
}

/**
 * Компонент вкладок для таблицы договоров
 * Отображает вкладки: В работе, Подписаны, Все, Скрытые + кнопку Замечания справа
 */
export default function ContractsTableTabs({
  activeTab,
  onTabChange,
  showRemarks,
  onRemarksToggle,
  tabCounts,
}: ContractsTableTabsProps) {
  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'in-work', label: 'В работе' },
    { key: 'not-coordinated', label: 'Не согласованы' },
    { key: 'signed', label: 'Подписаны' },
    { key: 'all', label: 'Все' },
    { key: 'hidden', label: 'Скрытые' },
  ];

  return (
    <div className="sticky top-0 left-0 right-0 z-30 flex items-center gap-0.5 pt-0.5 pb-0.5 bg-white shadow-sm" style={{ minHeight: '30px', width: '100%', backgroundColor: 'white' }}>
      {tabs.map((tab) => {
        const count = tabCounts?.[tab.key];
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1 ${
              !showRemarks && activeTab === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {count !== null && count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                !showRemarks && activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={onRemarksToggle}
        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1 ${
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
