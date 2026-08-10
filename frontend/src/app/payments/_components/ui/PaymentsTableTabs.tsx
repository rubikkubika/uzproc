'use client';

import React from 'react';
import { TabType } from '../types/payments.types';
import { TAB_OPTIONS } from '../constants/payments.constants';

interface PaymentsTableTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabCounts?: Record<TabType, number | null>;
}

/**
 * Вкладки таблицы оплат: Не оплачены, Оплачены, Все
 */
export default function PaymentsTableTabs({ activeTab, onTabChange, tabCounts }: PaymentsTableTabsProps) {
  return (
    <div
      className="flex items-center gap-0.5 px-3 pt-1 pb-1 bg-white border-b border-gray-200 flex-shrink-0"
      style={{ minHeight: '30px', width: '100%' }}
    >
      {TAB_OPTIONS.map((tab) => {
        const count = tabCounts?.[tab.key];
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            title={tab.title}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1 ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {count !== null && count !== undefined && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
