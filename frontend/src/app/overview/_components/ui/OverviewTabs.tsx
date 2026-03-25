'use client';

import { Printer } from 'lucide-react';
import { OverviewTab, OverviewTabItem, OverviewTopTab, OverviewTopTabItem } from '../types/overview.types';

interface OverviewTabsProps {
  activeTopTab: OverviewTopTab;
  onTopTabChange: (tab: OverviewTopTab) => void;
  activeTab: OverviewTab;
  onTabChange: (tab: OverviewTab) => void;
  onExportPdf?: () => void;
}

const topTabs: OverviewTopTabItem[] = [
  { id: 'dashboards', label: 'Дэшборды' },
  { id: 'management-reporting', label: 'Управленческая отчетность' },
];

const dashboardTabs: OverviewTabItem[] = [
  { id: 'sla', label: 'SLA' },
  { id: 'purchase-plan', label: 'План закупок' },
  { id: 'csi', label: 'CSI' },
  { id: 'ek', label: 'ЕК' },
  { id: 'approvals', label: 'Согласования' },
  { id: 'timelines', label: 'Сроки закупок' },
  { id: 'savings', label: 'Экономия' },
];

/**
 * UI компонент для отображения вкладок страницы обзор
 */
export function OverviewTabs({ activeTopTab, onTopTabChange, activeTab, onTabChange, onExportPdf }: OverviewTabsProps) {
  return (
    <div className="bg-white rounded shadow">
      {/* Верхний уровень вкладок */}
      <div className="flex items-center gap-0.5 border-b border-gray-300 px-1 pt-0.5 pb-0">
        {topTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTopTabChange(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-all ${
              activeTopTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {activeTopTab === 'management-reporting' && onExportPdf && (
          <button
            onClick={onExportPdf}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            Сохранить PDF
          </button>
        )}
      </div>
      {/* Вложенные вкладки дэшбордов */}
      {activeTopTab === 'dashboards' && (
        <div className="flex flex-wrap gap-0.5 border-b border-gray-200 px-1 pt-0.5 pb-0">
          {dashboardTabs.map((tab) => (
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
      )}
    </div>
  );
}
