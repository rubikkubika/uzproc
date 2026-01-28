'use client';

import { OverviewTab, OverviewTabItem } from '../types/overview.types';

interface OverviewTabsProps {
  activeTab: OverviewTab;
  onTabChange: (tab: OverviewTab) => void;
}

/**
 * UI компонент для отображения вкладок страницы обзор
 */
export function OverviewTabs({ activeTab, onTabChange }: OverviewTabsProps) {
  const tabs: OverviewTabItem[] = [
    { id: 'purchase-plan', label: 'План закупок' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 px-2 sm:px-3 pt-2 sm:pt-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white border-b-2 border-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
