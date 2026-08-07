'use client';

import React from 'react';
import { MessageSquareWarning, AlertTriangle } from 'lucide-react';
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
  const tabs: Array<{ key: TabType; label: string; title?: string }> = [
    {
      key: 'attention',
      label: 'Требует внимания',
      title: 'Договоры «В работе» с просрочкой дедлайна подготовки или запасом ≤30% от планового срока',
    },
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
        const isActive = !showRemarks && activeTab === tab.key;
        // Вкладку «Требует внимания» подсвечиваем красным, пока в ней есть договоры
        const isAlerting = tab.key === 'attention' && !!count;
        const inactiveClasses = isAlerting
          ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            title={tab.title}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1 ${
              isActive
                ? (isAlerting ? 'bg-red-600 text-white border-red-600' : 'bg-blue-600 text-white border-blue-600')
                : inactiveClasses
            }`}
          >
            {tab.key === 'attention' && <AlertTriangle className="w-3 h-3" />}
            {tab.label}
            {count !== null && count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : isAlerting
                    ? 'bg-red-100 text-red-700'
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
