'use client';

import React from 'react';
import type { DeliveryTab } from '../types/delivery-query.types';
import type { DeliveryTabCounts } from '../hooks/useDeliveryTabCounts';

interface DeliveryTableTabsProps {
  activeTab: DeliveryTab;
  tabCounts: DeliveryTabCounts;
  onTabChange: (tab: DeliveryTab) => void;
  /** Действия в правом верхнем углу раздела (напр. кнопка запуска тура). */
  actions?: React.ReactNode;
}

/**
 * Шапка раздела: вкладки со счётчиками. Вкладки не пересекаются: поставка попадает ровно в одну.
 *   «В работе»           — все, кроме закрытых по правилам и закрытых в отчёте;
 *   «Закрыто»            — «Поставлено» + «Оплачено» (правила системы);
 *   «Закрыто-разобрать»  — в отчёте «Закрыто», но по правилам поставка не закрыта;
 *   «Все»                — без фильтра по состоянию (нужна для срезов сводки).
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
    <div className="flex items-center gap-5 h-[52px] pl-5 pr-2 border-b border-slate-200 flex-shrink-0">
      <div data-tour="tabs" className="flex gap-0.5 h-full">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              title={tab.title}
              className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 -mb-px transition-colors ${
                active ? 'font-semibold text-slate-900 border-blue-600' : 'font-medium text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span
                className={`text-[11px] font-semibold px-1.5 rounded-full tabular-nums ${
                  active ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count !== null ? tab.count : '—'}
              </span>
            </button>
          );
        })}
      </div>
      {actions ? <div className="ml-auto flex-shrink-0">{actions}</div> : null}
    </div>
  );
}
