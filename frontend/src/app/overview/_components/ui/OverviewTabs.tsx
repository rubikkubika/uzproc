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
    { id: 'sla', label: 'SLA' },
    { id: 'purchase-plan', label: 'План закупок' },
    { id: 'csi', label: 'CSI' },
    { id: 'ek', label: 'ЕК' },
    { id: 'approvals', label: 'Согласования' },
  ];

  return (
    <div className="bg-white rounded shadow">
      <div className="flex flex-wrap gap-0.5 border-b border-gray-200 px-1 pt-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-2 py-1 text-xs font-medium rounded-t transition-all ${
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
