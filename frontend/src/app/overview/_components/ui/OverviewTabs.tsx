'use client';

import type { ReactNode } from 'react';
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
  'contract-sla': 'SLA договоров',
  'contract-remarks': 'Замечания по договорам',
  'contract-documents-count': 'Кол-во документов',
  'contract-approvals': 'Согласования договорных документов',
  'purchases-by-cfo': 'Закупки по ЦФО',
  'purchaser-distribution': 'Распределение по закупщикам',
  'contract-states-in-work': 'Состояния договоров (в работе)',
  kpi: 'KPI премии',
  kpi2: 'KPI премии 2',
};

interface OverviewTabsProps {
  activeTopTab: OverviewTopTab;
  onTopTabChange: (tab: OverviewTopTab) => void;
  activeDashboardCategory: OverviewDashboardCategory;
  onDashboardCategoryChange: (category: OverviewDashboardCategory) => void;
  activeTab: OverviewTab;
  onTabChange: (tab: OverviewTab) => void;
  /** Вкладки, скрытые для текущего пользователя (например, kpi2 — только для логина admin) */
  hiddenTabs?: OverviewTab[];
  /** Действия в правом верхнем углу раздела (напр. кнопка запуска тура). */
  actions?: ReactNode;
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
  hiddenTabs = [],
  actions,
}: OverviewTabsProps) {
  const categoryTabs: OverviewTabItem[] = DASHBOARD_CATEGORY_TABS[activeDashboardCategory]
    .filter((id) => !hiddenTabs.includes(id))
    .map((id) => ({
      id,
      label: DASHBOARD_SUB_TAB_LABELS[id],
    }));

  return (
    <div className="bg-white rounded shadow">
      {/* Верхний уровень вкладок */}
      <div data-tour="overview-top-tabs" className="flex items-center gap-0.5 border-b border-gray-300 px-1 pt-0.5 pb-0">
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
        {actions ? (
          <div data-tour="tour-button" className="ml-auto flex-shrink-0 pb-0.5">
            {actions}
          </div>
        ) : null}
      </div>
      {/* Категории дэшбордов */}
      {activeTopTab === 'dashboards' && (
        <div data-tour="overview-categories" className="flex flex-wrap gap-0.5 border-b border-gray-200 px-1 pt-0.5 pb-0">
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
        <div data-tour="overview-sub-tabs" className="flex flex-wrap gap-0.5 border-b border-gray-100 px-1 pt-0.5 pb-0">
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
