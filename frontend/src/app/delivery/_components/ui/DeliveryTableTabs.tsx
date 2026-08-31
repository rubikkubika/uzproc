'use client';

import React from 'react';

export type DeliveryTab = 'all' | 'in-work' | 'closed' | 'closed-review';

interface DeliveryTableTabsProps {
  activeTab: DeliveryTab;
  tabCounts: { all: number | null; inWork: number | null; closed: number | null; closedReview: number | null };
  onTabChange: (tab: DeliveryTab) => void;
  /** Действия в правом верхнем углу раздела (напр. кнопка запуска тура). */
  actions?: React.ReactNode;
}

/**
 * Вкладки таблицы поставок — по аналогии с таблицей заявок (PurchaseRequestsTableTabs).
 * Вкладки не пересекаются: поставка попадает ровно в одну.
 *   «Все»                — без фильтра по состоянию (нужна для срезов сводки, идущих через вкладки);
 *   «В работе»           — все, кроме закрытых по правилам и закрытых в отчёте;
 *   «Закрыто»            — «Поставлено» + «Оплачено» (правила системы);
 *   «Закрыто-разобрать»  — в отчёте «Закрыто», но по правилам поставка не закрыта.
 */
export default function DeliveryTableTabs({ activeTab, tabCounts, onTabChange, actions }: DeliveryTableTabsProps) {
  const tabs: Array<{ key: DeliveryTab; label: string; count: number | null; title?: string }> = [
    { key: 'in-work', label: 'В работе', count: tabCounts.inWork },
    { key: 'closed', label: 'Закрыто', count: tabCounts.closed },
    {
      key: 'closed-review',
      label: 'Закрыто-разобрать',
      count: tabCounts.closedReview,
      title: 'В отчёте «Закрыто», но по правилам («Поставлено» + «Оплачено») поставка не закрыта',
    },
    { key: 'all', label: 'Все', count: tabCounts.all, title: 'Без фильтра по состоянию поставки' },
  ];

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border-b border-gray-200 flex-shrink-0">
      <div data-tour="tabs" className="flex gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            title={tab.title}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1 ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count !== null ? tab.count : '—'}
            </span>
          </button>
        ))}
      </div>
      {actions ? <div className="flex-shrink-0">{actions}</div> : null}
    </div>
  );
}
