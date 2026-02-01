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
    { id: 'csi', label: 'CSI' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="flex flex-wrap gap-0.5 border-b border-gray-200 px-1.5 sm:px-2 pt-1.5 sm:pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg transition-all ${
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
