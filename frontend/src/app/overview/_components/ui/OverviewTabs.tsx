'use client';

import { Printer } from 'lucide-react';
import {
  OverviewTab,
  OverviewTabItem,
  OverviewTopTab,
  OverviewTopTabItem,
  OverviewDashboardCategory,
  OverviewDashboardCategoryItem,
  DASHBOARD_CATEGORY_TABS,
} from '../types/overview.types';

const DASHBOARD_SUB_TAB_LABELS: Record<OverviewTab, string> = {
  sla: 'SLA',
  'purchase-plan': 'План закупок',
  csi: 'CSI',
  ek: 'ЕК',
  approvals: 'Согласования',
  timelines: 'Сроки закупок',
  savings: 'Экономия',
  'contract-remarks': 'Замечания по договорам',
};

interface OverviewTabsProps {
  activeTopTab: OverviewTopTab;
  onTopTabChange: (tab: OverviewTopTab) => void;
  activeDashboardCategory: OverviewDashboardCategory;
  onDashboardCategoryChange: (category: OverviewDashboardCategory) => void;
  activeTab: OverviewTab;
  onTabChange: (tab: OverviewTab) => void;
  onExportPdf?: () => void;
}

const topTabs: OverviewTopTabItem[] = [
  { id: 'dashboards', label: 'Дэшборды' },
  { id: 'management-reporting', label: 'Управленческая отчетность' },
];

const dashboardCategories: OverviewDashboardCategoryItem[] = [
  { id: 'purchases', label: 'Дэшборды по закупкам' },
  { id: 'contracts', label: 'Дэшборды по договорам' },
  { id: 'other', label: 'Прочие' },
];

export function OverviewTabs({
  activeTopTab,
  onTopTabChange,
  activeDashboardCategory,
  onDashboardCategoryChange,
  activeTab,
  onTabChange,
  onExportPdf,
}: OverviewTabsProps) {
  const categoryTabs: OverviewTabItem[] = DASHBOARD_CATEGORY_TABS[activeDashboardCategory].map((id) => ({
    id,
    label: DASHBOARD_SUB_TAB_LABELS[id],
  }));

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
      {/* Категории дэшбордов */}
      {activeTopTab === 'dashboards' && (
        <div className="flex flex-wrap gap-0.5 border-b border-gray-200 px-1 pt-0.5 pb-0">
          {dashboardCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onDashboardCategoryChange(cat.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-t transition-all ${
                activeDashboardCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
      {/* Вложенные вкладки внутри категории */}
      {activeTopTab === 'dashboards' && categoryTabs.length > 0 && (
        <div className="flex flex-wrap gap-0.5 border-b border-gray-100 px-1 pt-0.5 pb-0">
          {categoryTabs.map((tab) => (
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
